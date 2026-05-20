import { type StructuredTool } from '@langchain/core/tools';
import {
    BaseMessage,
    HumanMessage,
    ToolMessage,
} from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import chalk from 'chalk';
import { getModelClient } from '@llm/shared';

(async () => {
    const model = getModelClient({
        provider: 'deepseek',
    });

    const mcpClient = new MultiServerMCPClient({
        mcpServers: {
            'user-query-mcp': {
                command: 'node',
                args: [
                    '/Users/WindStone/github/ai-agent-practice/apps/tool-test/src/mcp/user-query-mcp.mjs',
                ],
            },
        },
    });

    const tools: StructuredTool[] = await mcpClient.getTools();

    const modelWithTools = model.bindTools(tools);

    const runAgentWithTools = async (query: string, maxIterations = 30) => {
        const messages: BaseMessage[] = [new HumanMessage(query)];

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
                            content,
                            tool_call_id: toolCall.id!,
                        })
                    );
                }
            }
        }

        return messages[messages.length - 1].content;
    };

    runAgentWithTools('查一下用户 002 的信息');
})();
