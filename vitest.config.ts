import { readFileSync } from 'node:fs'

import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// The Convex Auth password provider hashes with argon2id-wasm. Vitest cannot
// import a raw `.wasm` file through its transform pipeline, so the module is
// embedded as bytes and instantiated the way the Convex runtime does.
function wasmModulePlugin(): Plugin {
  return {
    name: 'wasm-as-webassembly-module',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.wasm')) return null
      const base64 = readFileSync(id).toString('base64')
      return `const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), (c) => c.charCodeAt(0));
export default new WebAssembly.Module(bytes);`
    },
  }
}

export default defineConfig({
  plugins: [wasmModulePlugin()],
  test: {
    environment: 'edge-runtime',
    include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'],
    server: {
      deps: {
        inline: ['convex-test', 'argon2id-wasm'],
      },
    },
  },
})
