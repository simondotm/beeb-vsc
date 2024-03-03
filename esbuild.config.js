#! node
const esbuild = require('esbuild')
const argv = require('minimist')(process.argv.slice(2))
const { rimraf } = require('rimraf')
const { copy } = require('esbuild-plugin-copy')
const { join } = require('path')

const TEST_PROD = false // do not commit this as true. Its just for testing prod builds locally

const minify = argv['minify'] ?? false
const watch = argv['watch'] ?? false
const isProd = TEST_PROD || minify === true

const sharedConfig = {
  logLevel: 'info',
  bundle: true,
  outdir: 'dist',
  sourcemap: true,
  minify,
  banner: {
    js: `const environment = ${isProd ? "'prod'" : "'dev'"};`,
  },
  external: ['vscode*'], //Object.keys(require('../package.json').dependencies),
}

const extensionConfig = {
  ...sharedConfig,
  entryPoints: [
    {
      out: 'main',
      in: './src/client/extension.ts',
    },
    {
      out: 'server',
      in: './src/server/server.ts',
    },
  ],
  platform: 'node',
  format: 'cjs',
  // target: 'node12',
  plugins: [
    copyAssets(['assets', '**', '*'], ['dist', 'webview']),
    copyAssets(
      ['node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'],
      ['dist', 'webview', 'css'],
    ),
    copyAssets(
      ['node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf'],
      ['dist', 'webview', 'css'],
    ),
  ],
}

const webConfig = {
  ...sharedConfig,
  outdir: 'dist/webview',
  entryPoints: [
    {
      out: 'main',
      in: './src/scripts/index.ts',
    },
  ],
  platform: 'browser',
  format: 'iife',
  plugins: [copyJsBeebAssets('roms'), copyJsBeebAssets('sounds')],
}

function copyJsBeebAssets(dir) {
  return copyAssets(
    ['node_modules', 'jsbeeb', dir, '**', '*'],
    ['dist', 'webview', 'jsbeeb', dir],
  )
}

function copyAssets(src, dst) {
  // const from = join('node_modules', 'jsbeeb', dir, '**', '*');
  // const to = join('dist', 'assets', 'jsbeeb', dir);
  const from = join(...src)
  const to = join(...dst)
  console.log(`assets will be copied from '${from}' to '${to}'`)
  return copy({
    // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
    // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
    resolveFrom: 'cwd',
    assets: {
      from: [from],
      to: [to],
    },
    watch,
    verbose: false,
  })
}

async function main() {
  console.log('cleaning...')
  await rimraf(sharedConfig.outdir)
  console.log('building...')
  await Promise.all([esbuild.build(extensionConfig), esbuild.build(webConfig)])
  if (watch) {
    console.log('watching...')
    const extensionContext = await esbuild.context(extensionConfig)
    const webContext = await esbuild.context(webConfig)
    await Promise.all([extensionContext.watch(), webContext.watch()])
  }
}

main()
