import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { IDocxContent } from './interface.js';

/**
 * 解析 .docx 文档，提取按顺序排列的文本和图片
 * @param docxPath docx 文件的绝对路径
 * @param imagesDir 提取出的图片要保存到的本地文件夹路径
 */
export async function extractDocxData({
    docxPath,
    imagesDir,
}: {
    docxPath: string;
    imagesDir: string;
}): Promise<IDocxContent[]> {
    // 确保图片输出目录存在
    try {
        const stat = await fs.stat(imagesDir);
        console.log('+++ imagesDir stat', stat);
    } catch (error) {
        await fs.mkdir(imagesDir, { recursive: true });
    }

    // 记录图片索引 -> 本地保存路径的映射
    const imagesAbsPathMap: { [key: string]: string } = {};

    // 将 docx 转换成 HTML, 获取生成的 HTML
    const htmlContent = (
        await mammoth.convertToHtml(
            { path: docxPath },
            {
                // 配置 mammoth 的图片转换逻辑：将图片保存到本地，并替换为本地路径
                // 详见：https://github.com/mwilliamson/mammoth.js#custom-image-handlers
                convertImage: mammoth.images.imgElement(async (image) => {
                    const imageBase64 = await image.read('base64');

                    // 生成唯一的图片文件名
                    const imageName = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${image.contentType.split('/')[1]}`;
                    const imagePath = path.resolve(imagesDir, imageName);

                    // 将 base64 转为 buffer 并写入本地文件
                    await fs.writeFile(
                        imagePath,
                        Buffer.from(imageBase64, 'base64')
                    );

                    // 记录该图片的本地绝对路径
                    imagesAbsPathMap[imageName] = imagePath;

                    // 返回一个带有自定义属性的 img 标签，方便后续用正则匹配
                    return { src: imageName };
                }),
            }
        )
    ).value;

    console.log('+++ 文档基础 HTML 结构:\n', htmlContent);

    // 核心逻辑：解析 HTML，按阅读顺序重组 articleData
    const articleData: IDocxContent[] = [];

    // 使用简单的正则拆分 HTML，分离出纯文本段落和图片标签
    // 这里为了演示简化了逻辑，实际生产环境可以使用 cheerio 等库来更精准地解析 DOM
    const parts = htmlContent.split(/(<img[^>]+>)/g);

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        if (trimmedPart.startsWith('<img')) {
            // 提取出图片的文件名，并从之前的映射中拿到本地绝对路径
            const match = trimmedPart.match(/src="([^"]+)"/);
            if (match && imagesAbsPathMap[match[1]]) {
                articleData.push({
                    type: 'image',
                    content: imagesAbsPathMap[match[1]],
                });
            }
        } else {
            // 过滤掉纯 HTML 标签，只保留纯文本内容
            const textContent = trimmedPart.replace(/<[^>]+>/g, '').trim();
            if (textContent) {
                articleData.push({ type: 'text', content: textContent });
            }
        }
    }

    return articleData;
}
