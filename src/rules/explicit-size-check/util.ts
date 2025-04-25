import type { RuleContext, RuleListener } from "@typescript-eslint/utils/ts-eslint";

class FixAbortError extends Error {
	public name = "FixAbortError";
}

function isIterable<T = unknown>(object: unknown): object is Iterable<T> {
	return object !== null && typeof object === "object" && Symbol.iterator in object;
}

const fixOptions = {
	abort(): never {
		throw new FixAbortError();
	},
};

interface Context {
	[key: string]: unknown;
	report: (problem: Problem) => void;
}

interface Problem {
	[key: string]: unknown;
	data?: Record<string, unknown>;
	fix?: (fixer: unknown, options?: typeof fixOptions) => unknown;
	suggest?: Array<{
		data?: Record<string, unknown>;
		fix?: (fixer: unknown, options?: typeof fixOptions) => unknown;
	}>;
}

export function reportProblems<MessageIds extends string, Options extends ReadonlyArray<unknown>>(
	create: (context: Readonly<RuleContext<MessageIds, Options>>) => RuleListener,
): (context: Readonly<RuleContext<MessageIds, Options>>) => RuleListener {
	return (context: Readonly<RuleContext<MessageIds, Options>>): RuleListener => {
		const listeners: Record<string, Array<(...args: Array<unknown>) => unknown>> = {};
		const addListener = (
			selector: string,
			listener: (...args: Array<unknown>) => unknown,
		): void => {
			listeners[selector] ??= [];
			listeners[selector].push(listener);
		};

		const contextProxy = new Proxy(context, {
			get(target, property, receiver) {
				if (property === "on") {
					return (
						selectorOrSelectors: Array<string> | string,
						listener: (...args: Array<unknown>) => unknown,
					): void => {
						const selectors = Array.isArray(selectorOrSelectors)
							? selectorOrSelectors
							: [selectorOrSelectors];
						for (const selector of selectors) {
							addListener(selector, listener);
						}
					};
				}

				if (property === "onExit") {
					return (
						selectorOrSelectors: Array<string> | string,
						listener: (...args: Array<unknown>) => unknown,
					): void => {
						const selectors = Array.isArray(selectorOrSelectors)
							? selectorOrSelectors
							: [selectorOrSelectors];
						for (const selector of selectors) {
							addListener(`${selector}:exit`, listener);
						}
					};
				}

				return Reflect.get(target, property, receiver) as
					| ((...args: Array<unknown>) => unknown)
					| Context
					| undefined;
			},
		});

		for (const [selector, listener] of Object.entries(create(contextProxy))) {
			addListener(selector, listener as (...args: Array<unknown>) => unknown);
		}

		return Object.fromEntries(
			Object.entries(listeners).map(([selector, listenerList]) => {
				return [
					selector,
					(...listenerArguments: Array<unknown>) => {
						for (const listener of listenerList) {
							reportListenerProblems(
								listener(...listenerArguments) as
									| Array<Problem>
									| Problem
									| undefined,
								context as never,
							);
						}
					},
				];
			}),
		) as RuleListener;
	};
}

function reportListenerProblems(
	problems: Array<Problem> | Problem | undefined,
	context: Context,
): void {
	if (!problems) {
		return;
	}

	const problemList: Array<Problem> = isIterable<Problem>(problems)
		? Array.from(problems)
		: [problems];

	for (const problem of problemList) {
		if (typeof problem.fix === "function") {
			problem.fix = wrapFixFunction(problem.fix);
		}

		if (Array.isArray(problem.suggest)) {
			for (const suggest of problem.suggest) {
				if (typeof suggest.fix === "function") {
					suggest.fix = wrapFixFunction(suggest.fix);
				}

				suggest.data = {
					...(problem.data ?? {}),
					...(suggest.data ?? {}),
				};
			}
		}

		context.report(problem);
	}
}

function wrapFixFunction<T = unknown>(
	fix: (fixer: T, options?: typeof fixOptions) => unknown,
): (fixer: T) => unknown {
	return (fixer: T): unknown => {
		const result = fix(fixer, fixOptions);

		if (isIterable(result)) {
			try {
				return Array.from(result);
			} catch (err) {
				if (err instanceof FixAbortError) {
					return;
				}

				throw err;
			}
		}

		return result;
	};
}
