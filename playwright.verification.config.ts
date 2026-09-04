import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const deployment = env.CONVEX_DEPLOYMENT
const backend = env.VITE_CONVEX_URL

if (!deployment?.startsWith('dev:') || !backend) {
  throw new Error(
    'Verification requires a dev Convex deployment in .env.local.',
  )
}
const backendUrl = new URL(backend)
const deploymentName = deployment.slice('dev:'.length)
if (
  backendUrl.protocol !== 'https:' ||
  backendUrl.hostname.split('.')[0] !== deploymentName ||
  !backendUrl.hostname.endsWith('.convex.cloud')
) {
  throw new Error('VITE_CONVEX_URL must match the configured dev deployment.')
}

export default defineConfig({
  testDir: './tests/verification',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: '.cache/verification/results',
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Own the server so an existing process cannot silently target another backend.
  webServer: {
    command: 'pnpm exec vite dev --port 3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: { VITE_CONVEX_URL: backend },
  },
})
