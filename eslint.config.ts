import style from "@isentinel/eslint-config";

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
			"max-lines-per-function": "off",
			"sonar/cognitive-complexity": "off",
			"sonar/no-duplicate-string": "off",
		},
	},
	{
		ignores: [".eslint-doc-generatorrc.ts"],
	},
)
	// replace local config
	.onResolved(configs => {
		for (const config of configs) {
			if (config.plugins && "sentinel" in config.plugins) {
				config.plugins.sentinel = local;
			}
		}
	});
