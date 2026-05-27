import fs from 'fs';
import path from 'path';
import { IDocxContent } from './interface.js';

const VECTOR_DIM = 1024;

/**
 * 将本地图片路径转换为 Data URL (Base64) 格式
 */
function imageToBase64DataUrl(imagePath: string): string {
    const absolutePath = path.resolve(imagePath);
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Image = imageBuffer.toString('base64');

    // 这里默认以 jpeg 为例，如果是 png 可以改为 data:image/png;base64,
    return `data:image/jpeg;base64,${base64Image}`;
}

/**
 * 使用 fetch 调用多模态向量接口获取图片向量
 */
export async function getImageOrTextEmbedding(docxContent: IDocxContent) {
    const url =
        'https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding';

    const headers = {
        Authorization: `Bearer sk-ef3f04d53db24815826b3d876b250133`,
        'Content-Type': 'application/json',
    };

    const content =
        docxContent.type === 'image'
            ? { image: imageToBase64DataUrl(docxContent.content) }
            : {
                  text: docxContent.content,
              };

    const requestBody = {
        model: process.env.EMBEDDINGS_MODEL_NAME, // 或者使用 "tongyi-embedding-vision-plus"
        input: {
            contents: [content],
        },
        parameters: {
            dimension: VECTOR_DIM, // 指定输出向量的维度
        },
    };

    try {
        console.log('正在向量化...');
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        // 检查返回结果是否成功
        if (result.output?.embeddings?.[0]?.embedding) {
            const vector = result.output.embeddings[0].embedding;
            console.log(`✅ 向量化成功！`);
            return vector;
        } else {
            console.error('❌ API 调用失败:', JSON.stringify(result, null, 2));
            return null;
        }
    } catch (error) {
        console.error('❌ 网络或程序发生错误:', error);
        return null;
    }
}
