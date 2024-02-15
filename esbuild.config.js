const esbuild = require('esbuild');
const argv = require('minimist')(process.argv.slice(2));
const { rimraf } = require('rimraf');

const minify = argv['minify'] ?? false;
const watch = argv['watch'] ?? false;

const config = {
	logLevel: 'info',
	entryPoints: [
		{
			out: 'main',
			in: './src/client/extension.ts'
		},
		{
			out: 'server',
			in: './src/server/server.ts'
		}
	],
	bundle: true,
	platform: 'node',
	// outfile: 'build/main.js',
	format: 'cjs',
	outdir: 'dist',
	sourcemap: true,
	// target: 'node12',
	minify,
	external: ['vscode'] //Object.keys(require('../package.json').dependencies),
};





async function main() {
	await rimraf(config.outdir);
	await esbuild.build(config);
	if (watch) {
		console.log('watching...');
		const ctx = await esbuild.context(config);
		await ctx.watch();
	}
}

main();
