import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pages/Report/report.css'
import ReportApp from './pages/Report/ReportApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ReportApp />
  </StrictMode>,
)
