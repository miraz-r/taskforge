import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Two test projects with different environments:
 *
 *  - `client`  jsdom, for the React application.
 *  - `server`  node, for the API. Runs against the in-memory store, so the whole
 *              suite executes with NO PostgreSQL instance. Tests that genuinely
 *              need a database live in server/__tests__/db and are skipped
 *              unless DATABASE_URL is set — never silently passed.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // The client calls same-origin `/api`. In development Vite proxies that to
      // the Express server, so the session cookie is same-origin and behaves in
      // development exactly as it will in production.
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    // Same proxy as dev, so a built bundle can be exercised against the API.
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://127.0.0.1:4000',
        changeOrigin: false,
      },
    },
  },
  build: { target: 'es2022' },
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'server',
          environment: 'node',
          globals: true,
          include: ['server/**/*.test.ts'],
        },
      },
    ],
  },
})
