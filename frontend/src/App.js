import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function Protected({ children }) {
    const { user } = useAuth();
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsxs(Route, { element: _jsx(Protected, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/map", element: _jsx(GisMap, {}) }), _jsx(Route, { path: "/registry", element: _jsx(Registry, {}) }), _jsx(Route, { path: "/parcels/:id", element: _jsx(ParcelDetails, {}) }), _jsx(Route, { path: "/services", element: _jsx(CitizenServices, {}) }), _jsx(Route, { path: "/requests", element: _jsx(ServiceRequests, {}) }), _jsx(Route, { path: "/reports", element: _jsx(Reports, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(Analytics, {}) }), _jsx(Route, { path: "/audit", element: _jsx(AuditTrail, {}) }), _jsx(Route, { path: "/users", element: _jsx(UserManagement, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "/messages", element: _jsx(Messages, {}) })] }) }) }));
}
