import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.tsx'
import { EditionProvider } from './contexts/EditionContext'
import { analyticsUrl } from './lib/bullfinchAnalytics'
import { initCookieConsent } from './lib/cookieConsent'
import './styles/globals.css'
import './styles/lockShake.css'
import './styles/tooltipOverrides.css'

initCookieConsent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditionProvider>
      <App />
      <Analytics beforeSend={(event) => ({ ...event, url: analyticsUrl(event.url) })} />
    </EditionProvider>
  </StrictMode>,
)
