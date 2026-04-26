import { defineConfig } from 'tsup';

export default defineConfig([
  // Full Node.js build (ESM + CJS) with __dirname shims
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    shims: true,
    clean: true,
  },
  // Browser-safe build (ESM only, no shims, no Node built-ins)
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    shims: false,
    platform: 'browser',
    clean: false,
  },
]);
