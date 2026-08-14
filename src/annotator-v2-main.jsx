import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './annotator.css'
import { initAnalytics } from './lib/analytics'
import DataAnnotatorApp from './pages/DataAnnotatorV2/DataAnnotatorApp'

initAnalytics('v2')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataAnnotatorApp />
  </StrictMode>,
)
