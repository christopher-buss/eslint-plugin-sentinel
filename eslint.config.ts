import style from "@isentinel/eslint-config";

export default style({
	pnpm: true,
	roblox: false,
	test: true,
	type: "package",
	typescript: {
		parserOptions: {
			project: "tsconfig.json",
		},
		tsconfigPath: "tsconfig.json",
	},
});
