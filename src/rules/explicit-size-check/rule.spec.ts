import type { Linter } from "@typescript-eslint/utils/ts-eslint";

import { type InvalidTestCase, unindent, type ValidTestCase } from "eslint-vitest-rule-tester";
import { expect } from "vitest";

import { run } from "../test";
import { explicitSizeCheckRule, RULE_NAME } from "./rule";

const TYPE_NON_ZERO = "non-zero";

function applyFix(code: string, { fix }: Linter.LintSuggestion): string {
	return `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}`;
}

function suggestionCase({
	code,
	desc,
	messageId,
	options = [],
	output,
}: {
	code: string;
	desc: string;
	messageId: string;
	options?: Array<any>;
	output: string;
}): InvalidTestCase {
	return {
		code,
		errors(errors) {
			expect(errors).toHaveLength(1);
			const error = errors[0]!;

			expect(error.suggestions).toHaveLength(1);
			const suggestion = error.suggestions![0]!;

			expect(suggestion.desc).toEqual(desc);

			expect(error.messageId).toBe(messageId);
			expect(applyFix(code, suggestion)).toEqual(output);
		},
		options,
		output: null,
	};
}

const valid: Array<ValidTestCase> = [
	// Not `.size()`
	"if (foo.notSize) {}",
	"if (size) {}",
	"if (foo[size]) {}",
	'if (foo["size"]) {}',
	// Already in wanted style
	"foo.size() === 0",
	"foo.size() > 0",
	// Not boolean
	"const bar = foo.size()",
	"const bar = +foo.size()",
	"const x = Boolean(foo.size(), foo.size())",
	"const x = new Boolean(foo.size())",
	"const x = NotBoolean(foo.size())",
	"const size = foo.size() ?? 0",
	"if (foo.size() ?? bar) {}",
	// Checking 'non-zero'
	"if (foo.size() > 0) {}",
	{
		code: "if (foo.size() > 0) {}",
		options: [{ "non-zero": "greater-than" }],
	},
	{
		code: "if (foo.size() !== 0) {}",
		options: [{ "non-zero": "not-equal" }],
	},
	// Checking 'non-zero'
	"if (foo.size() === 0) {}",
	// `ConditionalExpression`
	"const bar = foo.size() === 0 ? 1 : 2",
	// `WhileStatement`
	unindent`
		while (foo.size() > 0) {
			foo.pop();
		}
	`,
	// `DoWhileStatement`
	unindent`
		do {
			foo.pop();
		} while (foo.size() > 0);
	`,
	// `ForStatement`
	"for (; foo.size() > 0; foo.pop());",
	"if (foo.size() !== 1) {}",
	"if (foo.size() > 1) {}",
	"if (foo.size() < 2) {}",
	// With known static size value (should not trigger)
	'const foo = { size: "small" }; if (foo.size) {}',
	"const foo = { size: -1 }; if (foo.size) {}",
	"const foo = { size: 1.5 }; if (foo.size) {}",
	"const foo = { size: NaN }; if (foo.size) {}",
	"const foo = { size: Infinity }; if (foo.size) {}",
	unindent`
		class A {
			a() {
				if (this.size);
				while (!this.size || foo);
			}
		}
	`,
	// Logical OR
	"const x = foo.size() || 2",
	"const A_NUMBER = 2; const x = foo.size() || A_NUMBER",
];

const invalid: Array<InvalidTestCase> = [
	suggestionCase({
		code: "const x = foo.size() || bar()",
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		output: "const x = foo.size() > 0 || bar()",
	}),
	suggestionCase({
		code: "const x = foo.size() || unknown",
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		output: "const x = foo.size() > 0 || unknown",
	}),
	suggestionCase({
		code: 'const NON_NUMBER = "2"; const x = foo.size() || NON_NUMBER',
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		output: 'const NON_NUMBER = "2"; const x = foo.size() > 0 || NON_NUMBER',
	}),
	suggestionCase({
		code: "const x = foo.size() || bar()",
		desc: "Replace `.size()` with `.size() !== 0`.",
		messageId: TYPE_NON_ZERO,
		options: [{ "non-zero": "not-equal" }],
		output: "const x = foo.size() !== 0 || bar()",
	}),
	suggestionCase({
		code: "const x = foo.size() || bar()",
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		options: [{ "non-zero": "greater-than" }],
		output: "const x = foo.size() > 0 || bar()",
	}),
	suggestionCase({
		code: "() => foo.size() && bar()",
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		output: "() => foo.size() > 0 && bar()",
	}),
	suggestionCase({
		code: "alert(foo.size() && bar())",
		desc: "Replace `.size()` with `.size() > 0`.",
		messageId: TYPE_NON_ZERO,
		output: "alert(foo.size() > 0 && bar())",
	}),
	{
		code: "if (foo.bar && foo.bar.size()) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.bar && foo.bar.size() > 0) {}"');
		},
	},
	{
		code: "if (foo.size() || foo.bar()) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.size() > 0 || foo.bar()) {}"');
		},
	},
	{
		code: "if (!!(!!foo.size())) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.size() > 0) {}"');
		},
	},
	{
		code: "if (!(foo.size() === 0)) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.size() > 0) {}"');
		},
	},
	{
		code: "while (foo.size() >= 1) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"while (foo.size() > 0) {}"');
		},
	},
	{
		code: "do {} while (foo.size());",
		output: output => {
			expect(output).toMatchInlineSnapshot('"do {} while (foo.size() > 0);"');
		},
	},
	{
		code: "for (let i = 0; (bar && !foo.size()); i ++) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot(
				'"for (let i = 0; (bar && foo.size() === 0); i ++) {}"',
			);
		},
	},
	{
		code: "const isEmpty = foo.size() < 1;",
		output: output => {
			expect(output).toMatchInlineSnapshot('"const isEmpty = foo.size() === 0;"');
		},
	},
	{
		code: "bar(foo.size() >= 1)",
		output: output => {
			expect(output).toMatchInlineSnapshot('"bar(foo.size() > 0)"');
		},
	},
	{
		code: "const bar = void !foo.size();",
		output: output => {
			expect(output).toMatchInlineSnapshot('"const bar = void (foo.size() === 0);"');
		},
	},
	{
		code: "if (foo.size()) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.size() > 0) {}"');
		},
	},
	{
		code: "if (foo.size() && bar.size()) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if (foo.size() > 0 && bar.size() > 0) {}"');
		},
	},
	{
		code: "function foo() {return!foo.size()}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"function foo() {return foo.size() === 0}"');
		},
	},
	{
		code: "function foo() {throw!foo.size()}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"function foo() {throw foo.size() === 0}"');
		},
	},
	{
		code: "async function foo() {await!foo.size()}",
		output: output => {
			expect(output).toMatchInlineSnapshot(
				'"async function foo() {await (foo.size() === 0)}"',
			);
		},
	},
	{
		code: "function * foo() {yield!foo.size()}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"function * foo() {yield foo.size() === 0}"');
		},
	},
	{
		code: "function * foo() {yield*!foo.size()}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"function * foo() {yield*foo.size() === 0}"');
		},
	},
	{
		code: "delete!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"delete (foo.size() === 0)"');
		},
	},
	{
		code: "typeof!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"typeof (foo.size() === 0)"');
		},
	},
	{
		code: "void!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"void (foo.size() === 0)"');
		},
	},
	{
		code: "a instanceof!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"a instanceof foo.size() === 0"');
		},
	},
	{
		code: "a in!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"a in foo.size() === 0"');
		},
	},
	{
		code: "export default!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"export default foo.size() === 0"');
		},
	},
	{
		code: "if(true){}else!foo.size()",
		output: output => {
			expect(output).toMatchInlineSnapshot('"if(true){}else foo.size() === 0"');
		},
	},
	{
		code: "do!foo.size();while(true) {}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"do foo.size() === 0;while(true) {}"');
		},
	},
	{
		code: "switch(foo){case!foo.size():{}}",
		output: output => {
			expect(output).toMatchInlineSnapshot('"switch(foo){case foo.size() === 0:{}}"');
		},
	},
	{
		code: "for(const a of !foo.size());",
		output: output => {
			expect(output).toMatchInlineSnapshot('"for(const a of foo.size() === 0);"');
		},
	},
];

run({
	invalid,
	name: RULE_NAME,
	rule: explicitSizeCheckRule,
	valid,
	verifyAfterFix: true,
});
