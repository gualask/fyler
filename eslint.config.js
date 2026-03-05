import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
    { ignores: ['dist', 'src-tauri'] },

    // Base JS
    js.configs.recommended,

    // TypeScript senza type-info (copre tutti i file incluso config/script)
    tseslint.configs.recommended,

    // Typed lint solo su sorgenti app
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
        },
    },

    // Disabilita typed lint su file JS e di config
    {
        files: ['**/*.{js,cjs,mjs}', '*.config.{js,ts}'],
        ...tseslint.configs.disableTypeChecked,
    },

    // React (flat config jsx-runtime: niente react-in-jsx-scope manuale)
    react.configs.flat['jsx-runtime'],

    // react-hooks + react-refresh + regole condivise
    {
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react/self-closing-comp': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            'no-console': 'error',
            'no-debugger': 'error',
        },
    },

    prettierConfig,
]);
