import { Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EntityManager } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobAgentService } from '../ai/job-agent.service';

@Injectable()
export class JobService implements OnApplicationBootstrap {
    private readonly logger = new Logger(JobService.name);

    @Inject(EntityManager)
    private readonly entityManager: EntityManager;

    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry;

    @Inject(JobAgentService)
    private readonly jobAgentService: JobAgentService;

    async onApplicationBootstrap() {
        const enabledJobs = await this.entityManager.find(Job, {
            where: { isEnabled: true },
        });
        const cronJobs = this.schedulerRegistry.getCronJobs();
        const intervals = this.schedulerRegistry.getIntervals();
        const timeouts = this.schedulerRegistry.getTimeouts();

        for (const job of enabledJobs) {
            const alreadyRegistered =
                (job.type === 'cron' && cronJobs.has(job.id)) ||
                (job.type === 'every' && intervals.includes(job.id)) ||
                (job.type === 'at' && timeouts.includes(job.id));
            if (alreadyRegistered) continue;

            this.startRuntime(job);
        }
    }

    async listJobs() {
        const jobs = await this.entityManager.find(Job, {
            order: { createdAt: 'DESC' },
        });

        const cronJobs = this.schedulerRegistry.getCronJobs();
        const intervalNames = this.schedulerRegistry.getIntervals();
        const timeoutNames = this.schedulerRegistry.getTimeouts();

        return jobs.map(job => {
            const running =
                job.isEnabled &&
                ((job.type === 'cron' && cronJobs.has(job.id)) ||
                    (job.type === 'every' && intervalNames.includes(job.id)) ||
                    (job.type === 'at' && timeoutNames.includes(job.id)));

            return {
                ...job,
                running,
            };
        });
    }

    async addJob(
        input:
            | {
                  type: 'cron';
                  instruction: string;
                  cron: string;
                  isEnabled?: boolean;
              }
            | {
                  type: 'every';
                  instruction: string;
                  everyMs: number;
                  isEnabled?: boolean;
              }
            | {
                  type: 'at';
                  instruction: string;
                  at: Date;
                  isEnabled?: boolean;
              }
    ) {
        const entity = this.entityManager.create(Job, {
            instruction: input.instruction,
            type: input.type,
            cron: input.type === 'cron' ? input.cron : null,
            everyMs: input.type === 'every' ? input.everyMs : null,
            at: input.type === 'at' ? input.at : null,
            isEnabled: input.isEnabled ?? true,
            lastRun: null,
        });

        const saved = await this.entityManager.save(Job, entity);

        this.logger.log(`添加定时任务成功。job ${saved.id}, ${saved.instruction}`);
        if (saved.isEnabled) {
            this.startRuntime(saved);
        }

        return saved;
    }

    async toggleJob(jobId: string, enabled?: boolean) {
        const job = await this.entityManager.findOne(Job, { where: { id: jobId } });
        if (!job) throw new NotFoundException(`Job not found: ${jobId}`);

        const nextEnabled = enabled ?? !job.isEnabled;
        if (job.isEnabled !== nextEnabled) {
            job.isEnabled = nextEnabled;
            await this.entityManager.save(Job, job);
        }

        if (job.isEnabled) {
            this.startRuntime(job);
        } else {
            await this.stopRuntime(job);
        }

        return job;
    }

    private startRuntime(job: Job) {
        if (job.type === 'cron') {
            const cronJobs = this.schedulerRegistry.getCronJobs();
            const existing = cronJobs.get(job.id);
            if (existing) {
                existing.start();
                return;
            }

            const runtimeJob = this.createCronJob(job);
            this.schedulerRegistry.addCronJob(job.id, runtimeJob);
            runtimeJob.start();
            this.logger.log(`启动 cron 类型的定时任务。job ${job.id}, ${job.instruction}`);
            return;
        }

        if (job.type === 'every') {
            const names = this.schedulerRegistry.getIntervals();
            if (names.includes(job.id)) return;

            if (typeof job.everyMs !== 'number' || job.everyMs <= 0) {
                throw new Error(`Invalid everyMs for job ${job.id}`);
            }

            const executeEveryJob = async () => {
                await this.entityManager.update(Job, job.id, { lastRun: new Date() });
                this.logger.log(`执行 every 类型的定时任务。job ${job.id}, ${job.instruction}`);

                try {
                    const result = await this.jobAgentService.runJob(job.instruction);
                    this.logger.log(`执行 every 类型的定时任务成功，job ${job.id}, ${result}`);
                } catch (e) {
                    this.logger.error(
                        `执行 every 类型的定时任务失败，job ${job.id} agent execution error: ${(e as Error).message}`
                    );
                }
            };
            const ref = setInterval(() => {
                executeEveryJob().catch(() => {});
            }, job.everyMs);

            this.schedulerRegistry.addInterval(job.id, ref);
            this.logger.log(`启动 every 类型的定时任务。job ${job.id}, ${job.instruction}`);
            return;
        }

        if (job.type === 'at') {
            const names = this.schedulerRegistry.getTimeouts();
            if (names.includes(job.id)) return;

            if (!job.at) {
                throw new Error(`Invalid at for job ${job.id}`);
            }

            const delay = Math.max(0, job.at.getTime() - Date.now());
            const executeAtJob = async () => {
                await this.entityManager.update(Job, job.id, {
                    lastRun: new Date(),
                    isEnabled: false, // at 类型只执行一次：执行完自动停用
                });

                this.logger.log(`执行 at 类型的定时任务。job ${job.id}, ${job.instruction}`);

                try {
                    const result = await this.jobAgentService.runJob(job.instruction);
                    this.logger.log(`执行 at 类型的定时任务成功。job ${job.id}, ${result}`);
                } catch (e) {
                    this.logger.error(
                        `执行 at 类型的定时任务失败。job ${job.id} agent execution error: ${(e as Error).message}`
                    );
                }

                try {
                    this.schedulerRegistry.deleteTimeout(job.id);
                } catch {
                    // ignore
                }
                return;
            };
            const ref = setTimeout(() => {
                executeAtJob().catch(() => {});
            }, delay);

            this.schedulerRegistry.addTimeout(job.id, ref);
            this.logger.log(`启动 at 类型的定时任务。job ${job.id}, ${job.instruction}`);
            return;
        }
    }

    private async stopRuntime(job: Job) {
        if (job.type === 'cron') {
            const cronJobs = this.schedulerRegistry.getCronJobs();
            const runtimeJob = cronJobs.get(job.id);
            if (runtimeJob) {
                await runtimeJob.stop();
            }
            return;
        }

        if (job.type === 'every') {
            try {
                this.schedulerRegistry.deleteInterval(job.id);
            } catch {
                // ignore
            }
            return;
        }

        if (job.type === 'at') {
            try {
                this.schedulerRegistry.deleteTimeout(job.id);
            } catch {
                // ignore
            }
            return;
        }
    }

    private createCronJob(job: Job) {
        const cronExpr = job.cron ?? '';
        return new CronJob(cronExpr, async () => {
            await this.entityManager.update(Job, job.id, { lastRun: new Date() });

            this.logger.log(`执行 cron 类型的定时任务。job ${job.id}, ${job.instruction}`);

            try {
                const result = await this.jobAgentService.runJob(job.instruction);
                this.logger.log(`执行 cron 类型的定时任务成功，job ${job.id}, ${job.instruction}，${result}`);
            } catch (e) {
                this.logger.error(
                    `执行 cron 类型的定时任务失败，job ${job.id} agent execution error: ${(e as Error).message}`
                );
            }
        });
    }
}
