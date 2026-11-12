import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-plugin'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'game',
          environment: 'node',
          include: ['tests/*.integration.test.js', 'tests/unit/**/*.test.js'],
        },
      },
      {
        // The Durable Object and the Pages Function in the real Workers runtime (local, no account).
        plugins: [cloudflareTest({ wrangler: { configPath: './server/wrangler.toml' } })],
        test: {
          name: 'worker',
          include: ['server/**/*.worker.test.js'],
        },
      },
    ],
  },
})
