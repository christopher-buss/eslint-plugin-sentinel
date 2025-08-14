// cspell:ignore publint
import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	entry: ["src/index.ts"],
	external: [
		"@typescript-eslint/utils",
		"@typescript-eslint/utils/ast-utils",
		"@typescript-eslint/utils/eslint-utils",
		"@typescript-eslint/utils/ts-eslint",
		"@typescript-eslint/type-utils",
		"@typescript-eslint/parser",
		"typescript",
	],
	fixedExtension: true,
	format: ["esm"],
	noExternal: ["ts-api-utils"],
	onSuccess() {
		console.info("🙏 Build succeeded!");
	},
	publint: true,
	shims: true,
	unused: {
		level: "error",
	},
});
