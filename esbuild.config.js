#! node
const esbuild = require('esbuild');
const argv = require('minimist')(process.argv.slice(2));
const { rimraf } = require('rimraf');
const { copy } = require('esbuild-plugin-copy');
const { join } = require('path');

const minify = argv['minify'] ?? false;
const watch = argv['watch'] ?? false;

const sharedConfig = {
	logLevel: 'info',
	bundle: true,
	format: 'cjs',
	outdir: 'dist',
	sourcemap: true,
	minify,
	external: ['vscode'], //Object.keys(require('../package.json').dependencies),
};

const extensionConfig = {
	...sharedConfig,
	entryPoints: [
		{
			out: 'main',
			in: './src/client/extension.ts'
		},
		{
			out: 'server',
			in: './src/server/server.ts'
		},
	],
	platform: 'node',
	// target: 'node12',
};

const webConfig = {
	...sharedConfig,
	entryPoints: [
		{
			out: 'emulator',
			in: './src/emulator/index.ts'
		},
	],
	platform: 'browser',
	plugins: [
		copyAssets('roms'),
		copyAssets('sounds'),
	],
};

function copyAssets(dir) {
	const from = join('node_modules', 'jsbeeb', dir, '**', '*');
	const to = join('dist', 'assets', 'jsbeeb', dir);
	console.log(`copying assets from '${from}' to '${to}'`);
	return 	copy({
		// this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
		// if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
		resolveFrom: 'cwd',
		assets: {
			from: [from],
			to: [to],
		},
		watch,
		verbose: false,
	});
}



async function main() {
	await rimraf(sharedConfig.outdir);
	await Promise.all([
		esbuild.build(extensionConfig),
		esbuild.build(webConfig),
	]);
	if (watch) {
		console.log('watching...');
		const extensionContext = await esbuild.context(extensionConfig);
		const webContext = await esbuild.context(webConfig);
		await Promise.all([extensionContext.watch(), webContext.watch()]);
	}
}

main();
