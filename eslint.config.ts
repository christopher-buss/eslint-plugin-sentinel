import style, { GLOB_TESTS } from "@isentinel/eslint-config";

import local from "./src/index";

export default style(
	{
		pnpm: true,
		roblox: false,
		test: false,
		type: "package",
		typescript: {
			parserOptions: {
				project: "tsconfig.json",
			},
			tsconfigPath: "tsconfig.json",
		},
	},
	{
		rules: {
			"max-lines": "off",
			"max-lines-per-function": "off",
			// "sentinel/explicit-size-check": "error",
			"sonar/cognitive-complexity": "off",
			"sonar/no-duplicate-string": "off",
			"unicorn/explicit-length-check": "error",
		},
	},
	{
		ignores: [".eslint-doc-generatorrc.ts"],
	},
	{
		files: GLOB_TESTS,
		rules: {
			"ts/no-non-null-assertion": "off",
		},
	},
)
	// replace local config
	.onResolved(configs => {
		for (const config of configs) {
			if (config.plugins && "sentinel" in config.plugins) {
				console.log("Replacing local config");
				config.plugins.sentinel = local;
			}
		}
	});
