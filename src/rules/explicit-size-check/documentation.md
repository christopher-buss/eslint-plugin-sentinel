<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run eslint-docs` -->

This rule is only meant to enforce a specific style and make comparisons more clear.

This rule is fixable, unless it's [unsafe to fix](#unsafe-to-fix-case).

## Zero comparisons

Enforce comparison with `=== 0` when checking for zero size.

### Fail

```js
const isEmpty = !foo.size();
```

```js
const isEmpty = foo.size() === 0;
```

```js
const isEmpty = foo.size() < 1;
```

```js
const isEmpty = 1 > foo.size();
```

```js
// Negative style is disallowed too
const isEmpty = !(foo.size() > 0);
```

```js
const isEmptySet = !foo.size();
```

### Pass

```js
const isEmpty = foo.size() === 0;
```

## Non-zero comparisons

Enforce comparison with `> 0` when checking for non-zero size.

### Fail

```js
const isNotEmpty = foo.size() !== 0;
```

```js
const isNotEmpty = foo.size() >= 1;
```

```js
const isNotEmpty = 0 !== foo.size();
```

```js
const isNotEmpty = 0 < foo.size();
```

```js
const isNotEmpty = 1 <= foo.size();
```

```js
// Negative style is disallowed too
const isNotEmpty = !(foo.size() === 0);
```

```js
if (foo.size() || bar.size()) {}
```

```js
const unicorn = foo.size() ? 1 : 2;
```

```js
while (foo.size()) {}
```

```js
do {} while (foo.size());
```

```js
for (; foo.size(); ) {};
```

### Pass

```js
const isNotEmpty = foo.size() > 0;
```

```js
if (foo.size() > 0 || bar.size() > 0) {}
```

### Options

You can define your preferred way of checking non-zero size by providing a `non-zero` option (`greater-than` by default):

```js
{
	'sentinel/explicit-size-check': [
		'error',
		{
			'non-zero': 'not-equal'
		}
	]
}
```

The `non-zero` option can be configured with one of the following:

- `greater-than` (default)
  - Enforces non-zero to be checked with: `foo.size() > 0`
- `not-equal`
  - Enforces non-zero to be checked with: `foo.size() !== 0`

## Unsafe to fix case

`.size()` check inside `LogicalExpression`s are not safe to fix.

Example:

```js
const bothNotEmpty = (a, b) => a.size() && b.size();

if (bothNotEmpty(foo, bar)) {}
```

In this case, the `bothNotEmpty` function returns a `number`, but it will most likely be used as a `boolean`. The rule will still report this as an error, but without an auto-fix. You can apply a [suggestion](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions) in your editor, which will fix it to:

```js
const bothNotEmpty = (a, b) => a.size() > 0 && b.size() > 0;

if (bothNotEmpty(foo, bar)) {}
```

The rule is smart enough to know some `LogicalExpression`s are safe to fix, like
when it's inside `if`, `while`, etc.

## Credits

This rule is inspired by the
[explicit-length-check](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/explicit-length-check.md) rule from the
[unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn) ESLint plugin.
