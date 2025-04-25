import { AST_NODE_TYPES, AST_TOKEN_TYPES, type TSESTree } from "@typescript-eslint/utils";
import {
	getStaticValue,
	isClosingParenToken,
	isOpeningParenToken,
	isParenthesized,
} from "@typescript-eslint/utils/ast-utils";
import type {
	RuleContext,
	RuleFix,
	RuleFixer,
	RuleListener,
	SourceCode,
} from "@typescript-eslint/utils/ts-eslint";

import assert from "node:assert";

import { createEslintRule } from "../../util";
import { reportProblems } from "./util";

export const RULE_NAME = "explicit-size-check";

const TYPE_NON_ZERO = "non-zero";
const TYPE_ZERO = "zero";
const MESSAGE_ID_SUGGESTION = "suggestion";

const messages = {
	[MESSAGE_ID_SUGGESTION]: "Replace `.{{property}}()` with `.{{property}}() {{code}}`.",
	[TYPE_NON_ZERO]: "Use `.{{property}}() {{code}}` when checking {{property}}() is not zero.",
	[TYPE_ZERO]: "Use `.{{property}}() {{code}}` when checking {{property}}() is zero.",
};

export function isLiteral(node: TSESTree.Node, value: unknown): boolean {
	if (node.type !== AST_NODE_TYPES.Literal) {
		return false;
	}

	if (value === null) {
		return node.raw === "null";
	}

	return node.value === value;
}

function isCompareLeft(node: TSESTree.Node, operator: string, value: number): boolean {
	return (
		node.type === AST_NODE_TYPES.BinaryExpression &&
		node.operator === operator &&
		isLiteral(node.left, value)
	);
}

function isCompareRight(node: TSESTree.Node, operator: string, value: number): boolean {
	return (
		node.type === AST_NODE_TYPES.BinaryExpression &&
		node.operator === operator &&
		isLiteral(node.right, value)
	);
}

const nonZeroStyles = new Map([
	[
		"greater-than",
		{
			code: "> 0",
			test: (node: TSESTree.Node) => isCompareRight(node, ">", 0),
		},
	],
	[
		"not-equal",
		{
			code: "!== 0",
			test: (node: TSESTree.Node) => isCompareRight(node, "!==", 0),
		},
	],
]);

function* fixSpaceAroundKeyword(
	fixer: RuleFixer,
	node: TSESTree.Node,
	sourceCode: SourceCode,
): Generator<RuleFix, void, unknown> {
	const range = getParenthesizedRange(node, sourceCode);
	const tokenBefore = sourceCode.getTokenBefore(node, { includeComments: true });

	if (tokenBefore && range[0] === tokenBefore.range[1] && isProblematicToken(tokenBefore)) {
		yield fixer.insertTextAfter(tokenBefore, " ");
	}

	const tokenAfter = sourceCode.getTokenAfter(node, { includeComments: true });

	if (tokenAfter && range[1] === tokenAfter.range[0] && isProblematicToken(tokenAfter)) {
		yield fixer.insertTextBefore(tokenAfter, " ");
	}
}

function getParentheses(
	node: TSESTree.Node,
	sourceCode: SourceCode,
): Array<
	(TSESTree.PunctuatorToken & { value: "(" }) | (TSESTree.PunctuatorToken & { value: ")" })
> {
	const count = getParenthesizedTimes(node, sourceCode);

	if (count === 0) {
		return [];
	}

	return [
		...sourceCode.getTokensBefore(node, { count, filter: isOpeningParenToken }),
		...sourceCode.getTokensAfter(node, { count, filter: isClosingParenToken }),
	];
}

function getParenthesizedRange(node: TSESTree.Node, sourceCode: SourceCode): Array<number> {
	const parentheses = getParentheses(node, sourceCode);
	const [start] = (parentheses[0] ?? node).range;
	const [, end] = (parentheses.at(-1) ?? node).range;
	return [start, end];
}

function getParenthesizedTimes(node: TSESTree.Node, sourceCode: SourceCode): number {
	let times = 0;

	while (isParenthesized(times + 1, node, sourceCode)) {
		times++;
	}

	return times;
}

function isProblematicToken({ type, value }: TSESTree.Token): boolean {
	return (
		(type === AST_TOKEN_TYPES.Keyword && /^[a-z]*$/.test(value)) ||
		// ForOfStatement
		(type === AST_TOKEN_TYPES.Identifier && value === "of") ||
		// AwaitExpression
		(type === AST_TOKEN_TYPES.Identifier && value === "await")
	);
}

const zeroStyle = {
	code: "=== 0",
	test: (node: TSESTree.Node) => isCompareRight(node, "===", 0),
} as const;

function create(
	context: Readonly<RuleContext<"non-zero" | "suggestion" | "zero", [object]>>,
): RuleListener {
	const options = {
		"non-zero": "greater-than",
		...context.options[0],
	};

	const nonZeroStyle = nonZeroStyles.get(options["non-zero"]);
	if (nonZeroStyle === undefined) {
		throw new Error(`Invalid option for non-zero: ${options["non-zero"]}`);
	}

	const { sourceCode } = context;

	function getProblem({
		autoFix,
		isZeroLengthCheck,
		node,
		sizeCallNode,
	}: {
		autoFix: boolean;
		isZeroLengthCheck: boolean;
		node: TSESTree.Node;
		sizeCallNode: TSESTree.CallExpression;
	}):
		| undefined
		| {
				data: { code: string; property: string };
				fix?: (fixer: RuleFixer) => Generator<RuleFix>;
				messageId: string;
				node: TSESTree.Node;
				suggest?: Array<{
					fix: (fixer: RuleFixer) => Generator<RuleFix>;
					messageId: string;
				}>;
		  } {
		assert(nonZeroStyle);

		const { code, test } = isZeroLengthCheck ? zeroStyle : nonZeroStyle;
		if (test(node)) {
			return;
		}

		let fixed = `${sourceCode.getText(sizeCallNode)} ${code}`;
		if (
			!isParenthesized(node, sourceCode) &&
			node.type === AST_NODE_TYPES.UnaryExpression &&
			(node.parent.type === AST_NODE_TYPES.UnaryExpression ||
				node.parent.type === AST_NODE_TYPES.AwaitExpression)
		) {
			fixed = `(${fixed})`;
		}

		const { callee } = sizeCallNode;
		if (
			callee.type !== AST_NODE_TYPES.MemberExpression ||
			callee.property.type !== AST_NODE_TYPES.Identifier
		) {
			return;
		}

		const fix = function* (fixer: RuleFixer): Generator<RuleFix> {
			yield fixer.replaceText(node, fixed);
			yield* fixSpaceAroundKeyword(fixer, node, sourceCode);
		};

		const problem: {
			data: { code: string; property: string };
			fix?: (fixer: RuleFixer) => Generator<RuleFix>;
			messageId: string;
			node: TSESTree.Node;
			suggest?: Array<{
				fix: (fixer: RuleFixer) => Generator<RuleFix>;
				messageId: string;
			}>;
		} = {
			data: { code, property: callee.property.name },
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			node,
		};

		if (autoFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					fix,
					messageId: MESSAGE_ID_SUGGESTION,
				},
			];
		}

		return problem;
	}

	return {
		CallExpression(callExpr) {
			if (
				callExpr.callee.type !== AST_NODE_TYPES.MemberExpression ||
				callExpr.callee.property.type !== AST_NODE_TYPES.Identifier ||
				callExpr.callee.property.name !== "size" ||
				callExpr.arguments.length > 0 ||
				callExpr.callee.optional ||
				callExpr.callee.object.type === AST_NODE_TYPES.ThisExpression
			) {
				return;
			}

			const sizeCallNode = callExpr;

			let node;
			let autoFix = true;
			const result = getSizeCheckNode(sizeCallNode);

			const sizeCheckNode = result?.node;
			let isZeroLengthCheck = result?.isZeroLengthCheck ?? false;
			if (sizeCheckNode) {
				const { isNegative, node: ancestor } = getBooleanAncestor(sizeCheckNode);
				node = ancestor;
				if (isNegative) {
					isZeroLengthCheck = !isZeroLengthCheck;
				}
			} else {
				const { isNegative, node: ancestor } = getBooleanAncestor(sizeCallNode);
				if (isBooleanNode(ancestor)) {
					isZeroLengthCheck = isNegative;
					node = ancestor;
				} else if (
					isLogicalExpression(sizeCallNode.parent) &&
					!(
						sizeCallNode.parent.operator === "||" &&
						isNodeValueNumber(sizeCallNode.parent.right, context)
					)
				) {
					isZeroLengthCheck = isNegative;
					node = sizeCallNode;
					autoFix = false;
				}
			}

			if (!node) {
				return;
			}

			return getProblem({
				autoFix,
				isZeroLengthCheck,
				node,
				sizeCallNode,
			});
		},
	};
}

function getBooleanAncestor(node: TSESTree.Node): { isNegative: boolean; node: TSESTree.Node } {
	let isNegative = false;

	while (true) {
		if (isLogicNotArgument(node)) {
			isNegative = !isNegative;
			if (node.parent) {
				node = node.parent;
			}
		} else if (isBooleanCallArgument(node)) {
			if (node.parent) {
				node = node.parent;
			}
		} else {
			break;
		}
	}

	return { isNegative, node };
}

function getSizeCheckNode(
	check: TSESTree.CallExpression,
): undefined | { isZeroLengthCheck: boolean; node: TSESTree.Node } {
	const node = check.parent;

	// Zero size check
	if (
		// `foo.size() === 0`
		isCompareRight(node, "===", 0) ||
		// `foo.size() == 0`
		isCompareRight(node, "==", 0) ||
		// `foo.size() < 1`
		isCompareRight(node, "<", 1) ||
		// `0 === foo.size()`
		isCompareLeft(node, "===", 0) ||
		// `0 == foo.size()`
		isCompareLeft(node, "==", 0) ||
		// `1 > foo.size()`
		isCompareLeft(node, ">", 1)
	) {
		return { isZeroLengthCheck: true, node };
	}

	// Non-Zero size check
	if (
		// `foo.size() !== 0`
		isCompareRight(node, "!==", 0) ||
		// `foo.size() != 0`
		isCompareRight(node, "!=", 0) ||
		// `foo.size() > 0`
		isCompareRight(node, ">", 0) ||
		// `foo.size() >= 1`
		isCompareRight(node, ">=", 1) ||
		// `0 !== foo.size()`
		isCompareLeft(node, "!==", 0) ||
		// `0 != foo.size()`
		isCompareLeft(node, "!=", 0) ||
		// `0 < foo.size()`
		isCompareLeft(node, "<", 0) ||
		// `1 <= foo.size()`
		isCompareLeft(node, "<=", 1)
	) {
		return { isZeroLengthCheck: false, node };
	}

	return undefined;
}

function isBooleanCall(node: TSESTree.Node): boolean {
	return (
		isCallExpression(node) &&
		node.callee.type === AST_NODE_TYPES.Identifier &&
		node.callee.name === "Boolean" &&
		node.arguments.length === 1
	);
}

function isBooleanCallArgument(node: TSESTree.Node): boolean {
	return (
		node.parent !== undefined &&
		isCallExpression(node.parent) &&
		isBooleanCall(node.parent) &&
		node.parent.arguments[0] === node
	);
}

function isBooleanNode(node: TSESTree.Node): boolean {
	if (
		isLogicNot(node) ||
		isLogicNotArgument(node) ||
		isBooleanCall(node) ||
		isBooleanCallArgument(node)
	) {
		return true;
	}

	const { parent } = node;
	if (parent === undefined) {
		return false;
	}

	if (
		(parent.type === AST_NODE_TYPES.IfStatement ||
			parent.type === AST_NODE_TYPES.ConditionalExpression ||
			parent.type === AST_NODE_TYPES.WhileStatement ||
			parent.type === AST_NODE_TYPES.DoWhileStatement ||
			parent.type === AST_NODE_TYPES.ForStatement) &&
		parent.test === node
	) {
		return true;
	}

	if (isLogicalExpression(parent)) {
		return isBooleanNode(parent);
	}

	return false;
}

function isCallExpression(node: TSESTree.Node): node is TSESTree.CallExpression {
	return node.type === AST_NODE_TYPES.CallExpression;
}

function isLogicalExpression(node: TSESTree.Node): node is TSESTree.LogicalExpression {
	return (
		node.type === AST_NODE_TYPES.LogicalExpression &&
		(node.operator === "&&" || node.operator === "||")
	);
}

function isLogicNot(node: TSESTree.Node): boolean {
	return isUnaryExpression(node) && node.operator === "!";
}

function isLogicNotArgument(node: TSESTree.Node): boolean {
	return (
		node.parent !== undefined &&
		isUnaryExpression(node.parent) &&
		isLogicNot(node.parent) &&
		node.parent.argument === node
	);
}

function isNodeValueNumber<MessageIds extends string, Options extends Array<unknown>>(
	node: TSESTree.Node,
	context: RuleContext<MessageIds, Options>,
): boolean {
	if (isNumberLiteral(node)) {
		return true;
	}

	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	return (staticValue && typeof staticValue.value === "number") ?? false;
}

function isNumberLiteral(node: TSESTree.Node): boolean {
	return node.type === AST_NODE_TYPES.Literal && typeof node.value === "number";
}

function isUnaryExpression(node: TSESTree.Node): node is TSESTree.UnaryExpression {
	return node.type === AST_NODE_TYPES.UnaryExpression;
}

export const explicitSizeCheckRule = createEslintRule({
	create: reportProblems(create),
	defaultOptions: [{}],
	meta: {
		docs: {
			description: "Enforce explicitly comparing the `size` property of a value.",
		},
		fixable: "code",
		hasSuggestions: true,
		messages,
		schema: [
			{
				additionalProperties: false,
				properties: {
					"non-zero": {
						default: "greater-than",
						enum: [...nonZeroStyles.keys()],
						type: "string",
					},
				},
				type: "object",
			},
		],
		type: "problem",
	},
	name: RULE_NAME,
});
