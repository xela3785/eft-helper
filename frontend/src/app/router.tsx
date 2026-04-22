import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { DashboardPage2 } from '../pages/DashboardPage2';
import { ItemsPage } from '../pages/ItemsPage';
import { LoginPage } from '../pages/LoginPage';
import { MarketPage } from '../pages/MarketPage';
import { ModuleDetailPage } from '../pages/ModuleDetailPage';
import { RegisterPage } from '../pages/RegisterPage';
import { getPreferredDashboardPath } from '../shared/lib/dashboard-view';

function DashboardRedirect() {
  return <Navigate replace to={getPreferredDashboardPath()} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard-compact" element={<DashboardPage2 />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/items" element={<ItemsPage />} />
      <Route path="/module/:moduleId" element={<ModuleDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
