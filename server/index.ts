/**
 * Server entry point.
 *
 * Reads and validates configuration, builds the Prisma-backed store, and starts
 * listening. Nothing here is imported by tests: `createApp` is used directly so
 * the app can be exercised over real HTTP without a production process.
 */

import { createApp, createServices } from './app'
import { ConfigError, loadConfig } from './config'
import { PrismaStore } from './repositories/prisma'

async function main(): Promise<void> {
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
