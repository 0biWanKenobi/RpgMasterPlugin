import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

const recommendedRules = (obsidianmd.configs?.recommended ?? {}) as Linter.RulesRecord;

export default tseslint.config(
	{
		files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json',
						'vite.config.mts'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			...recommendedRules,
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					acronyms: ["RPG", "DM", "ID"],
					brands: ["Dungeon Master"],
					enforceCamelCaseLower: true,
				},
			],
		},
	},		
	globalIgnores([
		"node_modules",
		".yalc",
		"*.json",
		"**/*.json",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
