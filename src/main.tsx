import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initCookieConsent } from './lib/cookieConsent'
import './styles/globals.css'
import './styles/lockShake.css'
import './styles/tooltipOverrides.css'

initCookieConsent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
