import { type StructuredTool } from '@langchain/core/tools';
import {
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import chalk from 'chalk';
import { getModelClient } from '@llm/shared';

(async () => {
    const model = getModelClient({
        provider: 'ollama',
        modelName: 'qwen3:32b',
    });

    const mcpClient = new MultiServerMCPClient({
        mcpServers: {
            'user-query-mcp': {
                command: 'node',
                args: [
                    '/Users/WindStone/github/ai-agent-practice/apps/tool-test/src/mcp/user-query-mcp.mjs',
                ],
            },
            'amap-maps-streamableHTTP': {
                url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_MAPS_API_KEY}`,
            },
            filesystem: {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/server-filesystem',
                    '/Users/WindStone/github/ai-agent-practice/apps/mcp-target-directory',
                ],
            },
            'chrome-devtools': {
                command: 'npx',
                args: ['-y', 'chrome-devtools-mcp@latest'],
            },
        },
    });

    const tools: StructuredTool[] = await mcpClient.getTools();

    const modelWithTools = model.bindTools(tools);

    const runAgentWithTools = async (query: string, maxIterations = 30) => {
        const messages: BaseMessage[] = [
            new SystemMessage(
                `你是一个智能助手，拥有多种工具能力。当用户提出需求时，你必须直接调用工具来完成任务，而不是描述你会怎么做。如果需要地理坐标，先调用 maps_geo 获取经纬度，再调用其他工具。不要向用户反问，尽最大努力自主完成。

限制条件：
- 每一轮对话中，最多只能同时发起 3 个 maps_ 工具调用；
- 如果需要查询超过 3 个地点，必须分批执行：每批最多 3 个，等上一批全部返回结果后，再发起下一批；
- 严禁在同一轮中一次性发起超过 3 个 maps_ 工具调用。`
            ),
            new HumanMessage(query),
        ];

        for (let i = 0; i < maxIterations; i++) {
            console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
            const response = await modelWithTools.invoke(messages);

            messages.push(response);

            if (!response.tool_calls?.length) {
                console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
                return response.content;
            }

            console.log(
                chalk.bgBlue(
                    `🔍 检测到 ${response.tool_calls.length} 个工具调用`
                )
            );
            console.log(
                chalk.bgBlue(
                    `🔍 工具调用: ${response.tool_calls.map((t: { name: string }) => t.name).join(', ')}`
                )
            );

            for (const toolCall of response.tool_calls) {
                const foundTool = tools.find(
                    (item) => item.name === toolCall.name
                );

                if (foundTool) {
                    const content = await foundTool.invoke(toolCall.args);

                    messages.push(
                        new ToolMessage({
                            content:
                                typeof content === 'string'
                                    ? content
                                    : content?.text
                                      ? content.text
                                      : '',
                            tool_call_id: toolCall.id!,
                        })
                    );
                }
            }
        }

        return messages[messages.length - 1].content;
    };

    runAgentWithTools('北京南站附近的酒店，以及去的路线');

    // runAgentWithTools(
    //     '北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/guang/Desktop 的一个 md 文件'
    // );

    // runAgentWithTools(
    //     '北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名'
    // );
})();
