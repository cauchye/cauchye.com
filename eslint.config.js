import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['worker-configuration.d.ts'] },
	js.configs.recommended,
	ts.configs.recommended,
	astro.configs.recommended,
	prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-undef': 'off'
		}
	}
);
