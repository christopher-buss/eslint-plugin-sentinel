import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { RuleFixer, SourceCode } from "@typescript-eslint/utils/ts-eslint";
import { Scope } from "@typescript-eslint/utils/ts-eslint";

import { createEslintRule } from "../../util";

export const RULE_NAME = "prefer-math-min-max";

function getExpressionText(
	node: TSESTree.Expression | TSESTree.PrivateIdentifier,
	sourceCode: Readonly<SourceCode>,
): string {
	const expressionNode = node.type === AST_NODE_TYPES.TSAsExpression ? node.expression : node;

	if (node.type === AST_NODE_TYPES.TSAsExpression) {
		return getExpressionText(expressionNode, sourceCode);
	}

	return sourceCode.getText(expressionNode);
}

function isNumberTypeAnnotation(typeAnnotation: TSESTree.Node): boolean {
	if (typeAnnotation.type === AST_NODE_TYPES.TSNumberKeyword) {
		return true;
	}

	if (
		typeAnnotation.type === AST_NODE_TYPES.TSTypeAnnotation &&
		typeAnnotation.typeAnnotation.type === AST_NODE_TYPES.TSNumberKeyword
	) {
		return true;
	}

	return !!(
		typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
		typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
		typeAnnotation.typeName.name === "Number"
	);
}

export const preferMathMinMaxRule = createEslintRule({
	create(context) {
		return {
			ConditionalExpression(conditionalExpression) {
				const { alternate, consequent, test } = conditionalExpression;
				if (test.type !== AST_NODE_TYPES.BinaryExpression) {
					return;
				}

				const { left, operator, right } = test;
				const [leftText, rightText, alternateText, consequentText] = [
					left,
					right,
					alternate,
					consequent,
				].map((node) => getExpressionText(node, context.sourceCode));

				const isGreaterOrEqual = operator === ">" || operator === ">=";
				const isLessOrEqual = operator === "<" || operator === "<=";

				let method: "max" | "min" | undefined;

				// Prefer `math.min()`
				if (
					// `height > 50 ? 50 : height`
					(isGreaterOrEqual &&
						leftText === alternateText &&
						rightText === consequentText) ||
					// `height < 50 ? height : 50`
					(isLessOrEqual && leftText === consequentText && rightText === alternateText)
				) {
					method = "min";
				} else if (
					// `height > 50 ? height : 50`
					(isGreaterOrEqual &&
						leftText === consequentText &&
						rightText === alternateText) ||
					// `height < 50 ? 50 : height`
					(isLessOrEqual && leftText === alternateText && rightText === consequentText)
				) {
					method = "max";
				}

				if (!method) {
					return;
				}

				for (const node of [left, right]) {
					let expressionNode = node;

					if (expressionNode.type === AST_NODE_TYPES.TSAsExpression) {
						// Ignore if the test is not a number comparison operator
						if (!isNumberTypeAnnotation(expressionNode.typeAnnotation)) {
							return;
						}

						expressionNode = expressionNode.expression;
					}

					// Find variable declaration
					if (expressionNode.type === AST_NODE_TYPES.Identifier) {
						const variable = context.sourceCode
							.getScope(expressionNode)
							.variables.find((variable_) => variable_.name === expressionNode.name);

						for (const definition of variable?.defs ?? []) {
							if (definition.type === Scope.DefinitionType.Parameter) {
								const identifier = definition.name;

								//
								// Capture the following statement
								//
								// ```ts
								// function foo(a: number) {}
								// ```
								//
								if (
									identifier.typeAnnotation?.type ===
										AST_NODE_TYPES.TSTypeAnnotation &&
									!isNumberTypeAnnotation(identifier.typeAnnotation)
								) {
									return;
								}

								//
								// Capture the following statement
								//
								// ```ts
								// function foo(a = 10) {}
								// ```
								//
								if (
									identifier.parent.type === AST_NODE_TYPES.AssignmentPattern &&
									identifier.parent.right.type === AST_NODE_TYPES.Literal &&
									typeof identifier.parent.right.value !== "number"
								) {
									return;
								}
							} else if (definition.type === Scope.DefinitionType.Variable) {
								const variableDeclarator = definition.node;

								//
								// Capture the following statement
								//
								// ```ts
								// let foo: number
								// ```
								//
								if (
									variableDeclarator.id.typeAnnotation?.type ===
										AST_NODE_TYPES.TSTypeAnnotation &&
									!isNumberTypeAnnotation(variableDeclarator.id.typeAnnotation)
								) {
									return;
								}

								//
								// Capture the following statement
								//
								// ```ts
								// let foo = 10
								// ```
								//
								if (
									variableDeclarator.init?.type === AST_NODE_TYPES.Literal &&
									typeof variableDeclarator.init.value !== "number"
								) {
									return;
								}
							}
						}
					}
				}

				context.report({
					data: { method },
					fix(fixer: RuleFixer) {
						const { sourceCode } = context;

						const argumentsText = [left, right]
							.map((node) => {
								return node.type === AST_NODE_TYPES.SequenceExpression
									? `(${sourceCode.getText(node)})`
									: sourceCode.getText(node);
							})
							.join(", ");

						return fixer.replaceText(
							conditionalExpression,
							`math.${method}(${argumentsText})`,
						);
					},
					messageId: RULE_NAME,
					node: conditionalExpression,
				});
			},
		};
	},
	defaultOptions: [] as Array<unknown>,
	meta: {
		docs: {
			description:
				"Require `math.min()` and `math.max()` over ternaries for simple comparisons",
			recommended: false,
		},
		fixable: "code",
		messages: {
			"prefer-math-min-max": "Use `math.{{method}}()` instead of the ternary operator.",
		},
		schema: [],
		type: "suggestion",
	},
	name: RULE_NAME,
});
