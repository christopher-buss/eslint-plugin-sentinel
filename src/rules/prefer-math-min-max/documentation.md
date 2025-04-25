# Prefer `math.min()` and `math.max()` over ternaries for simple comparisons

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run eslint-docs` -->

This rule enforces the use of `math.min()` and `math.max()` functions instead of ternary expressions when performing simple comparisons, such as selecting the minimum or maximum value between two or more options.

By replacing ternary expressions with these functions, the code becomes more concise, easier to understand, and less prone to errors. It also enhances consistency across the codebase, ensuring that the same approach is used for similar operations, ultimately improving the overall readability and maintainability of the code.

## Examples

<!-- math.min() -->

```
height > 50 ? 50 : height; // ❌
math.min(height, 50); // ✅
```

```js
height >= 50 ? 50 : height; // ❌
math.min(height, 50); // ✅
```

```js
height < 50 ? height : 50; // ❌
math.min(height, 50); // ✅
```

```js
height <= 50 ? height : 50; // ❌
math.min(height, 50); // ✅
```

<!-- math.max() -->

```js
height > 50 ? height : 50; // ❌
math.max(height, 50); // ✅
```

```js
height >= 50 ? height : 50; // ❌
math.max(height, 50); // ✅
```

```js
height < 50 ? 50 : height; // ❌
math.max(height, 50); // ✅
```

```js
height <= 50 ? 50 : height; // ❌
math.max(height, 50); // ✅
```

## Credits

This rule is inspired by the
[prefer-math-min-max](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-math-min-max.md)
rule from the
[unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn) ESLint plugin.
