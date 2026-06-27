// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import fsdPlugin from 'eslint-plugin-fsd-lint';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    fsdPlugin.configs.recommended,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        // Storybook config and build output are outside FSD structure
        '.storybook/**',
        'storybook-static/**',
        // apps/* は各アプリ固有の lint 整備を後続 Issue (#93/#94/#96) に委ねる
        'apps/**',
    ]),
    ...storybook.configs['flat/recommended'],
]);

export default eslintConfig;
