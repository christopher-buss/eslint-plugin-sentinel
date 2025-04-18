import { RuleCreator } from "@typescript-eslint/utils/eslint-utils";

export interface PluginDocumentation {
	description: string;
}

export const createEslintRule = RuleCreator<PluginDocumentation>(name => {
	return `https://github.com/your/eslint-plugin-sentinel/tree/main/src/rules/${name}/documentation.md`;
});
