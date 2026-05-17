import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {
  AppearanceProvider,
  applyAppearanceFromStorage,
} from './context/AppearanceProvider.tsx'
import { DailyReportProvider } from './context/DailyReportContext.tsx'
import { GanshaleDataProvider } from './context/DataProvider.tsx'

applyAppearanceFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <GanshaleDataProvider>
        <DailyReportProvider>
          <App />
        </DailyReportProvider>
      </GanshaleDataProvider>
    </AppearanceProvider>
  </StrictMode>,
)
