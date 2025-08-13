import isentinel, { GLOB_MARKDOWN_CODE, GLOB_TESTS, GLOB_TS } from "@isentinel/eslint-config";

import eslintPlugin from "eslint-plugin-eslint-plugin";

export default isentinel(
	{
		pnpm: true,
		roblox: false,
		test: true,
		type: "package",
	},
	{
		rules: {
			"max-lines": "off",
			"max-lines-per-function": "off",
			"sonar/cognitive-complexity": "off",
			"sonar/no-duplicate-string": "off",
			"unicorn/explicit-length-check": "error",
		},
	},
	{
		files: GLOB_TESTS,
		rules: {
			"ts/no-non-null-assertion": "off",
		},
	},
	{
		files: [GLOB_MARKDOWN_CODE],
		rules: {
			"sonar/no-inverted-boolean-check": "off",
		},
	},
	{
		files: [GLOB_TS],
		...eslintPlugin.configs["all-type-checked"],
		rules: {
			...eslintPlugin.configs["all-type-checked"].rules,
			"eslint-plugin/meta-property-ordering": "off",
			"eslint-plugin/require-meta-docs-description": [
				"error",
				{
					pattern: "^(Enforce|Require|Disallow).*[^\.!]$",
				},
			],
			"eslint-plugin/require-meta-docs-url": "off",
		},
	},
);
