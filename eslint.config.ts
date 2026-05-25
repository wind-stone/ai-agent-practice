import tseslint from 'typescript-eslint';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径，用于定位 tsconfig.json
const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
    // 【配置项1】全局忽略不需要检查的文件夹
    { ignores: ['dist/**', 'node_modules/**'] },

    // 【配置项2 & 3】展开官方推荐的 TS 基础规则与类型感知规则
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    // 【配置项4】针对 .ts 和 .tsx 文件的具体语言选项与自定义规则
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off', // Node.js 允许使用 console
        },
    },
];
