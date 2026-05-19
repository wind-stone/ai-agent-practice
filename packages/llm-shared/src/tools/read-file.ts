import fs from 'node:fs/promises';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const readFileTool = tool(
    async ({ filePath }) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(
                `  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`
            );
            return `文件内容:\n${content}`;
        } catch (error) {
            console.log(
                `  [工具调用] read_file("${filePath}") - 错误: ${(error as Error).message}`
            );
            return `读取文件失败: ${(error as Error).message}`;
        }
    },
    {
        name: 'read_file',
        description: '读取指定路径的文件内容',
        schema: z.object({
            filePath: z.string().describe('文件路径'),
        }),
    }
);
