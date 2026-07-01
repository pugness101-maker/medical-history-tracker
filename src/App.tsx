import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MedicalDataProvider } from './context/MedicalDataContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { HealthPage } from './pages/HealthPage';
import { RecordsPage } from './pages/RecordsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <MedicalDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MedicalDataProvider>
  );
}
