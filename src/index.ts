import type { Linter } from "eslint";

import { version } from "../package.json";
import { preferMathMinMaxRule } from "./rules/prefer-math-min-max/rule";

const plugin = {
	meta: {
		name: "sentinel",
		version,
	},
	rules: {
		"prefer-math-min-max": preferMathMinMaxRule,
	},
};

export default plugin;

export type RuleOptions = {
	[K in keyof RuleDefinitions]: RuleDefinitions[K]["defaultOptions"];
};

export type Rules = {
	[K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>;
};

type RuleDefinitions = (typeof plugin)["rules"];
