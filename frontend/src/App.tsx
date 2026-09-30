import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GisMap from "./pages/GisMap";
import Registry from "./pages/Registry";
import ParcelDetails from "./pages/ParcelDetails";
import CitizenServices from "./pages/CitizenServices";
import ServiceRequests from "./pages/ServiceRequests";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import AuditTrail from "./pages/AuditTrail";
import UserManagement from "./pages/UserManagement";
import SettingsPage from "./pages/Settings";

import Messages from "./pages/Messages.jsx";
function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<GisMap />} />
            <Route path="/registry" element={<Registry />} />
            <Route path="/parcels/:id" element={<ParcelDetails />} />
            <Route path="/services" element={<CitizenServices />} />
            <Route path="/requests" element={<ServiceRequests />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/messages" element={<Messages />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

