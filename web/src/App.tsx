import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, Toaster, useApp } from "./lib/store";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/ui";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { DashboardPage } from "./pages/Dashboard";
import { DebtorsPage } from "./pages/Debtors";
import { DebtorDetailPage } from "./pages/DebtorDetail";
import { HistoryPage } from "./pages/History";
import { SmsPage } from "./pages/Sms";
import { ShopsPage } from "./pages/Shops";
import { SettingsPage } from "./pages/Settings";
import { PublicDebtorPage } from "./pages/Public";

function Gate() {
  const { me, loading } = useApp();
  if (loading) return <PageLoader />;
  if (!me) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="debtors" element={<DebtorsPage />} />
        <Route path="debtors/:id" element={<DebtorDetailPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="sms" element={<SmsPage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Toaster />
        <Routes>
          <Route path="/p/:token" element={<PublicDebtorPage />} />
          <Route path="*" element={<Gate />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
