import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { getLlmModel } from '@llm/shared';

const model = getLlmModel({
    provider: 'ollama',
});

// 定义输出结构 schema
const schema = z.object({
    translation: z.string().describe('翻译后的英文文本'),
    keywords: z.array(z.string()).length(3).describe('3个关键词'),
});

const outputParser = StructuredOutputParser.fromZodSchema(schema);

const promptTemplate = PromptTemplate.fromTemplate(
    '将以下文本翻译成英文，然后总结为3个关键词。\n\n文本：{text}\n\n{format_instructions}'
);

console.log(
    'outputParser.getFormatInstructions()\n',
    outputParser.getFormatInstructions()
);

const input = {
    text: 'LangChain 是一个强大的 AI 应用开发框架',
    format_instructions: outputParser.getFormatInstructions(),
};

// 步骤 1: 格式化 prompt
const formattedPrompt = await promptTemplate.format(input);
// 步骤 2: 调用模型
const response = await model.invoke(formattedPrompt);
// 步骤 3: 解析输出，
// 注意这里调用 invoke 方法，参数是 response
// 之前使用时是调用的 parse 方法，参数是 response.content
const result = await outputParser.invoke(response);
console.log('✅ 最终结果:');
console.log(result);
