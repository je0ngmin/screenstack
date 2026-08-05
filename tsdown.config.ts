import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  unbundle: true,
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  deps: {
    neverBundle: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  target: ["es2019", "safari13"],
});
