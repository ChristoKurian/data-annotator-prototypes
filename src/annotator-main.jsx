import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './annotator.css'
import { initAnalytics } from './lib/analytics'
import DataAnnotatorApp from './pages/DataAnnotator/DataAnnotatorApp'

initAnalytics('v1')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataAnnotatorApp />
  </StrictMode>,
)
