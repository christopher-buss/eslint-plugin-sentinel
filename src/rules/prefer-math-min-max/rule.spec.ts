import type { InvalidTestCase, ValidTestCase } from "eslint-vitest-rule-tester";
import { expect } from "vitest";

import { run } from "../test";
import { preferMathMinMaxRule, RULE_NAME } from "./rule";

const valid: Array<ValidTestCase> = [
	// Already using math.min/max
	"math.min(height, 50);",
	// Not a simple min/max ternary
	"height > 50 ? height + 1 : height;",
	"height < 50 ? 0 : height;",
	// Not a binary expression
	"foo ? 1 : 2;",
];

const invalid: Array<InvalidTestCase> = [
	{
		code: "height > 50 ? 50 : height;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.min(height, 50);"');
		},
	},
	{
		code: "height >= 50 ? 50 : height;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.min(height, 50);"');
		},
	},
	{
		code: "height < 50 ? height : 50;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.min(height, 50);"');
		},
	},
	{
		code: "height <= 50 ? height : 50;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.min(height, 50);"');
		},
	},
	{
		code: "height > 50 ? height : 50;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.max(height, 50);"');
		},
	},
	{
		code: "height >= 50 ? height : 50;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.max(height, 50);"');
		},
	},
	{
		code: "height < 50 ? 50 : height;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.max(height, 50);"');
		},
	},
	{
		code: "height <= 50 ? 50 : height;",
		output: (output) => {
			expect(output).toMatchInlineSnapshot('"math.max(height, 50);"');
		},
	},
];

run({
	invalid,
	name: RULE_NAME,
	rule: preferMathMinMaxRule,
	valid,
});
