import {
    MilvusClient,
    DataType,
    MetricType,
    IndexType,
} from '@zilliz/milvus2-sdk-node';
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
        console.log('✓ Connected\n');

        // 创建集合
        console.log('Creating collection...');
        await milvusClient.createCollection({
            collection_name: COLLECTION_NAME,

            // 定义数据的 schema
            fields: [
                {
                    name: 'id',
                    data_type: DataType.VarChar,
                    max_length: 50,
                    is_primary_key: true,
                },
                {
                    name: 'vector',
                    data_type: DataType.FloatVector,
                    dim: VECTOR_DIM,
                },
                {
                    name: 'content',
                    data_type: DataType.VarChar,
                    max_length: 5000,
                },
                { name: 'date', data_type: DataType.VarChar, max_length: 50 },
                { name: 'mood', data_type: DataType.VarChar, max_length: 50 },
                {
                    name: 'tags',
                    data_type: DataType.Array,
                    element_type: DataType.VarChar,
                    max_capacity: 10,
                    max_length: 50,
                },
            ],
        });
        console.log('Collection created');

        // 创建索引（使用 vector 字段），用来快速查询
        console.log('\nCreating index...');
        await milvusClient.createIndex({
            collection_name: COLLECTION_NAME,
            field_name: 'vector',
            index_type: IndexType.IVF_FLAT,
            metric_type: MetricType.COSINE, // 指定用余弦相似度作为距离度量
            params: { nlist: 1024 },
        });
        console.log('Index created');

        // 加载集合
        console.log('\nLoading collection...');
        await milvusClient.loadCollection({ collection_name: COLLECTION_NAME });
        console.log('Collection loaded');

        // 插入日记数据
        console.log('\nInserting diary entries...');
        const diaryContents = [
            {
                id: 'diary_001',
                content:
                    '今天天气很好，去公园散步了，心情愉快。看到了很多花开了，春天真美好。',
                date: '2026-01-10',
                mood: 'happy',
                tags: ['生活', '散步'],
            },
            {
                id: 'diary_002',
                content:
                    '今天工作很忙，完成了一个重要的项目里程碑。团队合作很愉快，感觉很有成就感。',
                date: '2026-01-11',
                mood: 'excited',
                tags: ['工作', '成就'],
            },
            {
                id: 'diary_003',
                content:
                    '周末和朋友去爬山，天气很好，心情也很放松。享受大自然的感觉真好。',
                date: '2026-01-12',
                mood: 'relaxed',
                tags: ['户外', '朋友'],
            },
            {
                id: 'diary_004',
                content:
                    '今天学习了 Milvus 向量数据库，感觉很有意思。向量搜索技术真的很强大。',
                date: '2026-01-12',
                mood: 'curious',
                tags: ['学习', '技术'],
            },
            {
                id: 'diary_005',
                content:
                    '晚上做了一顿丰盛的晚餐，尝试了新菜谱。家人都说很好吃，很有成就感。',
                date: '2026-01-13',
                mood: 'proud',
                tags: ['美食', '家庭'],
            },
        ];

        console.log('Generating embeddingsModel...');
        const diaryData = await Promise.all(
            diaryContents.map(async (diary) => ({
                ...diary,
                vector: await getEmbedding(diary.content),
            }))
        );

        const insertResult = await milvusClient.insert({
            collection_name: COLLECTION_NAME,
            data: diaryData,
        });
        console.log(`✓ Inserted ${insertResult.insert_cnt} records\n`);
    } catch (error) {
        console.error('Error:', (error as Error).message);
    }
}

main();
