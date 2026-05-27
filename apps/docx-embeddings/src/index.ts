import { extractDocxData } from './shared/extractDocxData.js';
import { getImageOrTextEmbedding } from './shared/getImageOrTextEmbedding.js';
import { saveToMilvus, searchMilvus } from './shared/saveToMilvus.js';
import * as dotenv from 'dotenv';
dotenv.config();

// --- 测试调用 ---
(async () => {
    // let extractedData: Awaited<ReturnType<typeof extractDocxData>> | undefined =
    //     undefined;
    // try {
    //     extractedData = await extractDocxData({
    //         docxPath:
    //             '/Users/WindStone/github/ai-agent-practice/apps/docx-embeddings/src/test.docx', // docx 绝对路径
    //         imagesDir: './src/assets/images', // 图片提取后存放的相对或绝对路径
    //     });
    //     console.log(
    //         '✅ 成功提取文章结构化数据：\n',
    //         JSON.stringify(extractedData, null, 2)
    //     );
    // } catch (error) {
    //     console.error('❌ 提取文档失败:', error);
    // }

    // if (!extractedData) {
    //     return;
    // }

    // let i = 0;
    // for (const data of extractedData) {
    //     const vector = await getImageOrTextEmbedding(data);

    //     await saveToMilvus({
    //         ...data,
    //         vector,
    //         id: String(++i),
    //     });
    // }

    const queryVector = await getImageOrTextEmbedding({
        type: 'text',
        content: '红色的菜品图片',
    });

    console.log('提问：', '红色的菜品图片');

    searchMilvus(queryVector);
})();
