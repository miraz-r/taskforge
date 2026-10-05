/**
 * Server entry point.
 *
 * Reads and validates configuration, builds the Prisma-backed store, and starts
 * listening. Nothing here is imported by tests: `createApp` is used directly so
 * the app can be exercised over real HTTP without a production process.
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, createServices } from './app'
import { ConfigError, loadConfig } from './config'
import { PrismaStore } from './repositories/prisma'

/** Repository root, resolved from this file so cwd does not matter. */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Loads the project-root `.env` into `process.env` for local development.
 *
 * WHY THIS EXISTS: `config.ts` reads `process.env` and nothing populates it, so
 * `npm run dev:api` failed with `DATABASE_URL is required` even though a correct
 * `.env` sat in the project root. The Prisma CLI loads `.env` itself, which is
 * why migrations worked while the server did not.
 *
 * WHY THE BUILT-IN RATHER THAN `dotenv`: `process.loadEnvFile` ships with Node
 * (20.12+), so this adds no dependency. `dotenv` is present only transitively
 * through Prisma, and depending on that would be an undeclared dependency.
 *
 * Production behaviour is preserved deliberately:
 *   - An existing environment variable is NEVER overridden. A real deployment
 *     injects configuration through the environment, and that must win over any
 *     file that happens to be present.
 *   - A missing `.env` is not an error. Production normally has none and must
 *     start from the real environment alone.
 *
 * Deliberately in the entry point rather than `config.ts`, so tests stay
 * hermetic: they pass an explicit config source and must never pick up ambient
 * developer credentials.
 */
function loadLocalEnvFile(): void {
  const envPath = resolve(projectRoot, '.env')
  if (!existsSync(envPath)) return
  process.loadEnvFile(envPath)
  // Names the fact, never a value (AGENTS.md 11.1, 11.2).
  console.log('[taskforge] loaded .env from the project root')
}

async function main(): Promise<void> {
  loadLocalEnvFile()

  let config
  try {
    config = loadConfig()
  } catch (error) {
    if (error instanceof ConfigError) {
      // Field names and reasons only — never values (AGENTS.md 11.2, 11.5).
      console.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  const store = PrismaStore.fromUrl(config.DATABASE_URL)
  const services = createServices(store, config)
  const app = createApp({ config, store, services })

  const server = app.listen(config.PORT, config.HOST, () => {
    console.log(
      `[taskforge] api listening on http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`,
    )
  })

  const shutdown = (signal: string) => {
    console.log(`[taskforge] ${signal} received, closing`)
    server.close(() => process.exit(0))
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

void main().catch((error: unknown) => {
  console.error('[taskforge] failed to start:', error)
  process.exit(1)
})
