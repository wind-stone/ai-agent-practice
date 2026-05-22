import { OpenAIEmbeddings } from '@langchain/openai';
import { AI_PROVIDERS, type AI_PROVIDER_NAME } from '../../constants/index.js';

const embeddingsCache = new Map<AI_PROVIDER_NAME, OpenAIEmbeddings>();

export function getEmbeddingsModel({
    provider,
    useCache = false,
    dimensions = 1024,
}: {
    provider: AI_PROVIDER_NAME;
    useCache?: boolean;
    dimensions?: number;
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
        /**
         * The number of dimensions the resulting output embeddings should have.
         * Only supported in `text-embedding-3` and later models.
         */
        dimensions,
    });
    useCache && embeddingsCache.set(provider, embeddings);
    return embeddings;
}
