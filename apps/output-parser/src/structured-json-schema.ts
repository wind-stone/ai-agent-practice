import chalk from 'chalk';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLlmModel } from '@llm/shared';

const scientistSchema = z
    .object({
        name: z.string().describe('科学家的全名'),
        birth_year: z.number().describe('出生年份'),
        field: z.string().describe('主要研究领域'),
        achievements: z.array(z.string()).describe('主要成就列表'),
    })
    .describe('科学家');

// 将 Zod 转换为原生的 JSON Schema 格式
const nativeJsonSchema = scientistSchema.toJSONSchema();

console.log('【nativeJsonSchema】', nativeJsonSchema);

const model = getLlmModel({
    provider: 'qwen',
    modelKwargs: {
        // 通过 modelKwargs 传入原生参数
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'scientist_info',
                strict: true,
                schema: nativeJsonSchema, // 这里的 nativeJsonSchema 就是转换后的对象
            },
        },
    },
});

async function testNativeJsonSchema() {
    console.log(chalk.bgMagenta('🧪 测试原生 JSON Schema 模式...\n'));

    const res = await model.invoke([
        new SystemMessage('你是一个信息提取助手，请直接返回 JSON 数据。'),
        new HumanMessage('介绍一下杨振宁'),
    ]);

    console.log(chalk.green('\n✅ 收到响应 (纯净 JSON):'));
    console.log(res.content);
    const data = JSON.parse(res.content as string);
    console.log(chalk.cyan('\n📋 解析后的对象:'));
    console.log(data);
}

testNativeJsonSchema().catch(console.error);
