import { AI_PROVIDERS, type AI_PROVIDER_NAME } from '../../constants/index.js';
import { getModelClient } from './client.js';
import { tool } from '@langchain/core/tools';
import { type BaseMessageLike } from '@langchain/core/messages';

export async function callAI({
    provider = 'deepseek',
    messages,
    stream = false,
    tools,
}: {
    provider?: AI_PROVIDER_NAME;
    messages: BaseMessageLike[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    tools?: ReturnType<typeof tool>[];
}) {
    const client = getModelClient({ provider });

    if (tools?.length) {
        client.bindTools(tools);
    }

    const result = await client.invoke(messages);

    return result;
}

export async function callAIWithFallback({
    providers = ['deepseek', 'qwen', 'ollama'],
    messages,
    model,
    stream = false,
    tools,
}: {
    providers: AI_PROVIDER_NAME[];
    model?: string;
    messages: BaseMessageLike[];
    stream?: boolean;
    tools?: ReturnType<typeof tool>[];
}) {
    for (const provider of providers) {
        try {
            return await callAI({
                provider,
                messages,
                stream,
                tools,
            });
        } catch (err) {
            console.warn(
                `[${provider}] 调用失败: ${(err as Error).message}，尝试下一个...`
            );
        }
    }
    throw new Error('所有 AI 厂商均不可用');
}
