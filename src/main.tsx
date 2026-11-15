import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyAppearanceFromStorage } from './context/AppearanceProvider.tsx'
import { AppearanceProvider } from './context/AppearanceProviderView.tsx'
import { DailyReportProvider } from './context/DailyReportProviderView.tsx'
import { GanshaleDataProvider } from './context/DataProvider.tsx'
import { WeeklyReportProvider } from './context/WeeklyReportProviderView.tsx'
import { MonthlyReportProvider } from './context/MonthlyReportProviderView.tsx'
import { DataRecordsProvider } from './context/DataRecordsProviderView.tsx'

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
