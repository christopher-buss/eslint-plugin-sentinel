import type { GenerateOptions } from "eslint-doc-generator";

const config: GenerateOptions = {
	ignoreConfig: ["all", "flat/all", "flat/recommended"],
	ignoreDeprecatedRules: true,
	pathRuleDoc: "./src/rules/{name}/documentation.md",
	pathRuleList: "./README.md",
	ruleDocTitleFormat: "desc",
	ruleListColumns: [
		"name",
		"description",
		"configsError",
		// Omit `configsOff` since we don't intend to convey meaning by setting rules to `off` in the `recommended` config.
		"configsWarn",
		"fixable",
		"hasSuggestions",
		"requiresTypeChecking",
	],
	urlConfigs: "https://github.com/christopher-buss/eslint-plugin-sentinel#recommended-config",
};

export default config;
