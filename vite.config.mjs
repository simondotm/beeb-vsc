import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
)
const APP_VERSION = pkg.version

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const target = process.env.VITE_TARGET || 'node'

  const commonDefine = {
    environment: JSON.stringify(isProd ? 'prod' : 'dev'),
    APP_VERSION: JSON.stringify(APP_VERSION),
  }

  if (target === 'webview') {
    return {
      build: {
        outDir: 'dist-webview',
        lib: {
          entry: resolve(__dirname, 'src/scripts/index.ts'),
          name: 'webview',
          formats: ['iife'],
          fileName: () => 'main.js',
        },
        sourcemap: true,
        minify: isProd,
        emptyOutDir: true,
      },
      define: commonDefine,
      resolve: {
        alias: [
          {
            find: 'jsbeeb',
            replacement: resolve(__dirname, 'node_modules/jsbeeb/src'),
          },
        ],
      },
      plugins: [
        viteStaticCopy({
          targets: [
            { src: 'assets/*', dest: '.' },
            {
              src: 'node_modules/@vscode/codicons/dist/codicon.{css,ttf}',
              dest: 'codicons',
            },
            {
              src: 'node_modules/jsbeeb/public/roms/**/*',
              dest: 'jsbeeb/roms',
            },
            {
              src: 'node_modules/jsbeeb/public/sounds/**/*',
              dest: 'jsbeeb/sounds',
            },
          ],
        }),
      ],
    }
  }

  // Node build (Extension + Server)
  return {
    build: {
      outDir: 'dist',
      lib: {
        entry: {
          main: resolve(__dirname, 'src/client/extension.ts'),
          server: resolve(__dirname, 'src/server/server.ts'),
        },
        formats: ['cjs'],
        fileName: (format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: ['vscode'],
      },
      sourcemap: true,
      minify: isProd,
      ssr: true,
      emptyOutDir: true,
    },
    ssr: {
      noExternal: true, // This forces bundling of dependencies in SSR/Node build
    },
    define: commonDefine,
    resolve: {
      alias: [
        {
          find: 'jsbeeb',
          replacement: resolve(__dirname, 'node_modules/jsbeeb/src'),
        },
      ],
    },
  }
})
