import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'oasis-professional-service'
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default defineConfig({
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'src/client-entry.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: CLIENT_EXTERNALS,
    alwaysBundle: (id) => CLIENT_EXTERNALS.includes(id) ? undefined : true,
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: "${PLUGIN_ID}", factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
