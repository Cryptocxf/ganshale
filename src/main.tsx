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
import { WeeklyReportProvider } from './context/WeeklyReportContext.tsx'
import { MonthlyReportProvider } from './context/MonthlyReportContext.tsx'
import { DataRecordsProvider } from './context/DataRecordsContext.tsx'

applyAppearanceFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
        <GanshaleDataProvider>
          <DailyReportProvider>
            <WeeklyReportProvider>
              <MonthlyReportProvider>
                <DataRecordsProvider>
                  <App />
                </DataRecordsProvider>
              </MonthlyReportProvider>
            </WeeklyReportProvider>
          </DailyReportProvider>
        </GanshaleDataProvider>
    </AppearanceProvider>
  </StrictMode>,
)
