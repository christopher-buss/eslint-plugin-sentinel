import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	clean: true,
	declaration: "node16",
	entries: ["src/index"],
	externals: ["@typescript-eslint/utils"],
	rollup: {
		inlineDependencies: ["@antfu/utils"],
	},
});
