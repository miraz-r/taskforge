/**
 * DEVELOPMENT AID — NOT A PRODUCTION ENTRY POINT.
 *
 * Boots the real Express application against the in-memory store so the client
 * can be exercised end to end without a PostgreSQL instance. Useful for frontend
 * work and for demonstrating the full request path.
 *
 * It is NOT a substitute for the real server and must never be treated as one:
 *   - data is lost when the process exits;
 *   - `NFR-SEC-010` is only as good as the in-memory store, which is not a
 *     database boundary a user can cross;
 *   - nothing here is covered by the database integration suite.
 *
 * The production entry point is `server/index.ts`, which requires DATABASE_URL
 * and refuses to start without it.
 *
 *   npx tsx scripts/memory-api.ts
 */

import { createApp, createServices } from '../server/app'
import { loadConfig } from '../server/config'
import { MemoryStore } from '../server/repositories/memory'

const PORT = Number(process.env.PORT ?? 4000)
const HOST = process.env.HOST ?? '127.0.0.1'

const config = loadConfig({
  NODE_ENV: 'development',
  // Unused: this process never opens a database connection.
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
  COOKIE_SECURE: 'false',
  TRUST_PROXY: 'false',
  AUTH_RATE_LIMIT: '200',
  MAX_WORKSPACES_PER_USER: '2',
} as unknown as NodeJS.ProcessEnv)

const store = new MemoryStore()
const services = createServices(store, config)
const app = createApp({ config, store, services })

app.listen(PORT, HOST, () => {
  console.log(`[taskforge] IN-MEMORY api (development only) on http://${HOST}:${PORT}`)
  console.log('[taskforge] data is not persisted. Use server/index.ts with a real database.')
})
