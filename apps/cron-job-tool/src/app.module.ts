import { join } from 'path';
import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    // CronExpression,
    ScheduleModule,
    SchedulerRegistry,
} from '@nestjs/schedule';
// import { CronJob } from 'cron';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { JobModule } from './job/job.module';
import { Job } from './job/entities/job.entity';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            username: 'root',
            password: 'admin',
            database: 'hello',
            synchronize: true, // 在服务启动的时候自动建表
            // connectorPackage: 'mysql2',
            logging: true, // 打印 SQL 语句
            entities: [User, Job],
        }),
        ScheduleModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
        }),
        AiModule,

        MailerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get<string>('MAIL_HOST'),
                    port: Number(configService.get<string>('MAIL_PORT')),
                    secure: configService.get<string>('MAIL_SECURE') === 'true',
                    auth: {
                        user: configService.get<string>('MAIL_USER'),
                        pass: configService.get<string>('MAIL_PASS'),
                    },
                },
                defaults: {
                    from: configService.get<string>('MAIL_FROM'),
                },
            }),
        }),

        UsersModule,

        JobModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
    @Inject(SchedulerRegistry)
    schedulerRegistry: SchedulerRegistry;

    onApplicationBootstrap() {
        // const job = new CronJob(CronExpression.EVERY_SECOND, () => {
        //     console.log('run job');
        // });
        // this.schedulerRegistry.addCronJob('job1', job);
        // job.start();
        // setTimeout(() => {
        //     this.schedulerRegistry.deleteCronJob('job1');
        // }, 5000);
        // const intervalRef = setInterval(() => {
        //     console.log('run interval job');
        // }, 1000);
        // this.schedulerRegistry.addInterval('interval1', intervalRef);
        // setTimeout(() => {
        //     this.schedulerRegistry.deleteInterval('interval1');
        // }, 5000);
        // const timeoutRef = setTimeout(() => {
        //     console.log('run timeout job');
        // }, 3000);
        // this.schedulerRegistry.addTimeout('timeout1', timeoutRef);
        // setTimeout(() => {
        //     this.schedulerRegistry.deleteTimeout('timeout1');
        // }, 5000);
    }
}
