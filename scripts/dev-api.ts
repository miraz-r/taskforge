/**
 * The documented local development launcher for the API.
 *
 * WHY THIS EXISTS
 * `tsx watch server/index.ts` fails in a way that is very hard to diagnose. Every
 * instance binds the same port, so the second one started exits on
 * `EADDRINUSE` — but each watcher independently restarts its own child on every
 * file save. While the one process that owns the port is being killed and
 * respawned, nothing is listening at all, and the Vite proxy reports
 * `ECONNREFUSED 127.0.0.1:4000`. The symptom looks like a crashing backend when
 * the real problem is three redundant watchers.
 *
 * WHAT IT DOES
 * Refuses to start when the port is already served, naming the owner, and points
 * at the existing instance. It never kills anything: terminating a process the
 * user may be using is not this script's decision to make. Startup failures from
 * the child are surfaced with their exit code rather than swallowed.
 *
 * Usage:  npm run dev:api
 */

import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const port = Number(process.env.PORT ?? 4000)
const host = process.env.HOST ?? '127.0.0.1'

/**
 * True when something already accepts a TCP connection on the port.
 *
 * A successful connect is the signal, not a successful handshake: a listener
 * owned by any process — including a stale one from a previous run — means
 * starting another watcher would produce exactly the churn this prevents.
 */
function portInUse(target: string, portNumber: number, timeoutMs = 750): Promise<boolean> {
  return new Promise((settle) => {
    const socket = createConnection({ host: target, port: portNumber })
    const finish = (inUse: boolean) => {
      socket.destroy()
      settle(inUse)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function main(): Promise<void> {
  if (await portInUse(host, port)) {
    const FIND_WATCHERS = [
      'powershell -c "Get-CimInstance Win32_Process -Filter',
      " \"Name='node.exe'\" |",
      " Where-Object CommandLine -match 'server/index.ts'\"",
    ].join(' ')
    console.error(
      [
        `[dev:api] Port ${port} is already being served, so this launcher is`,
        'refusing to start a second API watcher.',
        '',
        'Multiple watchers cause the intermittent ECONNREFUSED on port ' +
          `${port} you see in the`,
        'Vite terminal: only one process owns the port, and each watcher',
        'restarts its own child on every file save, so the port is briefly',
        'unserved in between.',
        '',
        'What to do:',
        '  - If the existing server is working, just use it. This is normal.',
        '  - To restart it, stop the terminal running it (Ctrl+C) and run',
        '    `npm run dev:api` again.',
        '  - To list every watcher currently running:',
        `      ${FIND_WATCHERS}`,
        '    This launcher will not kill them for you.',
      ].join('\n'),
    )
    process.exit(1)
  }

  console.log(`[dev:api] starting api watcher on ${host}:${port}`)

  const child = spawn(
    process.execPath,
    [resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'watch', 'server/index.ts'],
    { cwd: projectRoot, stdio: 'inherit', env: process.env },
  )

  child.on('error', (error) => {
    console.error(`[dev:api] could not start the watcher: ${error.message}`)
    process.exit(1)
  })

  // A watcher that exits is a failure the developer must see, not a silent
  // return to the prompt that looks like a clean shutdown.
  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[dev:api] watcher terminated by ${signal}`)
    } else {
      console.error(
        `[dev:api] watcher exited with code ${code}. The API is no longer ` +
          'running on port ' +
          port +
          '.',
      )
    }
    process.exit(code ?? 1)
  })

  // Forward interrupts so Ctrl+C stops the watcher instead of orphaning it.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal))
  }
}

void main()