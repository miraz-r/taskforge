import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from './app/AppProvider'
import './index.css'

const container = document.getElementById('root')
if (!container) {
  // Nothing renders if the mount point is missing; failing loudly beats a blank
  // page (NFR-ERR-002).
  throw new Error('Root element #root was not found.')
}

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
