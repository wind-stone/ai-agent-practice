import { AI_PROVIDERS, type AI_PROVIDER_NAME } from '../../constants/index.js';
import { ChatOpenAI } from '@langchain/openai';

const clientCache = new Map<AI_PROVIDER_NAME, ChatOpenAI>();

export function getLlmModel({
    provider,
    useCache = true,
    modelName,
}: {
    provider: AI_PROVIDER_NAME;
    useCache?: boolean;
    modelName?: string;
}): ChatOpenAI {
    if (useCache && clientCache.has(provider)) {
        return clientCache.get(provider)!;
    }
    const config = AI_PROVIDERS[provider];
    const client = new ChatOpenAI({
        modelName: modelName || config.defaultModel,
        apiKey: config.apiKey,
        temperature: 0,
        configuration: {
            baseURL: config.baseURL,
        },
    });
    useCache && clientCache.set(provider, client);
    return client;
}
