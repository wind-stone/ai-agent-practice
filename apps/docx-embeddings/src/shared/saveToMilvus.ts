import {
    MilvusClient,
    DataType,
    MetricType,
    IndexType,
} from '@zilliz/milvus2-sdk-node';
import { IDocxContent } from './interface.js';

// 初始化 Milvus 客户端
const milvusClient = new MilvusClient({
    address: 'localhost:19530',
});

const COLLECTION_NAME = 'image_text_collection';
const VECTOR_DIM = 1024;

/**
 * 创建或获取集合
 */
async function ensureCollection() {
    try {
        // 检查集合是否存在
        const hasCollection = await milvusClient.hasCollection({
            collection_name: COLLECTION_NAME,
        });

        if (!hasCollection.value) {
            console.log('创建集合...');
            await milvusClient.createCollection({
                collection_name: COLLECTION_NAME,
                fields: [
                    {
                        name: 'id',
                        data_type: DataType.VarChar,
                        max_length: 100,
                        is_primary_key: true,
                    },
                    {
                        name: 'type',
                        data_type: DataType.VarChar,
                        max_length: 100,
                    },
                    {
                        name: 'content',
                        data_type: DataType.VarChar,
                        max_length: 10000,
                    },
                    {
                        name: 'vector',
                        data_type: DataType.FloatVector,
                        dim: VECTOR_DIM,
                    },
                ],
            });
            console.log('✓ 集合创建成功'); // 创建索引

            console.log('创建索引...');
            await milvusClient.createIndex({
                collection_name: COLLECTION_NAME,
                field_name: 'vector',
                index_type: IndexType.IVF_FLAT,
                metric_type: MetricType.COSINE,
                params: { nlist: 1024 },
            });
            console.log('✓ 索引创建成功');
        } // 确保集合已加载
        try {
            await milvusClient.loadCollection({
                collection_name: COLLECTION_NAME,
            });
            console.log('✓ 集合已加载');
        } catch (error) {
            console.log('✓ 集合已处于加载状态');
        }
    } catch (error) {
        console.error('创建集合时出错:', (error as Error).message);
        throw error;
    }
}

export async function saveToMilvus(
    docxContent: IDocxContent & {
        id: string;
        vector: number[];
    }
) {
    await ensureCollection();

    // 批量插入到 Milvus
    const insertResult = await milvusClient.insert({
        collection_name: COLLECTION_NAME,
        // @ts-expect-error
        data: [docxContent],
    });

    console.log(
        '+++ saveToMilvus',
        `插入 ${insertResult.insert_cnt} 数据`,
        docxContent.type,
        docxContent.content
    );
}

export async function searchMilvus(queryVector: number[]) {
    const searchResult = await milvusClient.search({
        collection_name: COLLECTION_NAME,
        vector: queryVector,
        limit: 10,
        metric_type: MetricType.COSINE,
        output_fields: ['id', 'type', 'content'],
    });

    console.log(`Found ${searchResult.results.length} results:\n`);
    searchResult.results.forEach((item, index) => {
        console.log(`${index}. [Score: ${item.score.toFixed(4)}]`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Content: ${item.content}`);
    });
}
