import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { getEmbeddingsModel } from '@llm/shared';

const COLLECTION_NAME = 'ai_diary';
const VECTOR_DIM = 1024;

const embeddingsModel = getEmbeddingsModel({
    provider: 'qwen',
    dimensions: VECTOR_DIM, // 要跟 milvus 的 vector 字段的 dim 保持一致
});

const milvusClient = new MilvusClient({
    address: 'localhost:19530',
});

async function getEmbedding(text: string) {
    const result = await embeddingsModel.embedQuery(text);
    return result;
}

async function main() {
    try {
        console.log('Connecting to Milvus...');
        await milvusClient.connectPromise;
        console.log('✓ Connected\n'); // 向量搜索

        console.log('Searching for similar diary entries...');
        const query = '我做饭或学习的日记';
        console.log(`Query: "${query}"\n`);

        const queryVector = await getEmbedding(query);

        // 加载集合
        console.log('\nLoading collection...');
        await milvusClient.loadCollection({ collection_name: COLLECTION_NAME });
        console.log('Collection loaded');

        const searchResult = await milvusClient.search({
            collection_name: COLLECTION_NAME,
            vector: queryVector,
            limit: 3,
            metric_type: MetricType.COSINE, // 指定用余弦相似度作为距离度量
            output_fields: ['id', 'content', 'date', 'mood', 'tags'],
        });

        console.log(`Found ${searchResult.results.length} results:\n`);
        searchResult.results.forEach((item, index) => {
            console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`);
            console.log(`   ID: ${item.id}`);
            console.log(`   Date: ${item.date}`);
            console.log(`   Mood: ${item.mood}`);
            console.log(`   Tags: ${item.tags?.join(', ')}`);
            console.log(`   Content: ${item.content}\n`);
        });
    } catch (error) {
        console.error('Error:', (error as Error).message);
    }
}

main();
