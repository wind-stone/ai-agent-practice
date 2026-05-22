import { OpenAIEmbeddings } from '@langchain/openai';
import { AI_PROVIDERS, type AI_PROVIDER_NAME } from '../../constants/index.js';

const embeddingsCache = new Map<AI_PROVIDER_NAME, OpenAIEmbeddings>();

export function getEmbeddingsModel({
    provider,
    useCache = false,
}: {
    provider: AI_PROVIDER_NAME;
    useCache?: boolean;
}): OpenAIEmbeddings {
    if (useCache && embeddingsCache.has(provider)) {
        return embeddingsCache.get(provider)!;
    }
    const config = AI_PROVIDERS[provider];
    const embeddings = new OpenAIEmbeddings({
        modelName: process.env.EMBEDDINGS_MODEL_NAME,
        apiKey: config.apiKey,
        configuration: {
            baseURL: config.baseURL,
        },
    });
    useCache && embeddingsCache.set(provider, embeddings);
    return embeddings;
}
