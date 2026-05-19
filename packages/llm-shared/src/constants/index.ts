import * as dotenv from 'dotenv';
dotenv.config();

export const AI_PROVIDERS = {
    deepseek: {
        type: 'openai-compatible',
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY,
        defaultModel: 'deepseek-chat',
    },
    openai: {
        type: 'openai-compatible',
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-4o-mini',
    },
    qwen: {
        type: 'openai-compatible',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: process.env.QWEN_API_KEY,
        defaultModel: 'qwen-plus',
    },
    ollama: {
        type: 'openai-compatible',
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama',
        defaultModel: 'qwen2.5',
    },
    claude: {
        type: 'anthropic',
        baseURL: '',
        apiKey: process.env.CLAUDE_API_KEY,
        defaultModel: 'claude-sonnet-4-20250514',
    },
};

export type AI_PROVIDER_NAME = keyof typeof AI_PROVIDERS;
