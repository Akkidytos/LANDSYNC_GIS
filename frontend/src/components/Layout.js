import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MessagesPopup from "../pages/MessagesPopup";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Map, FileText, HeadphonesIcon, ClipboardList, BarChart3, ShieldCheck, Users, Settings, LogOut, Bell, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { setLanguage } from "../i18n";
export default function Layout() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const items = [
        { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/map", icon: Map, label: t("nav.map") },
        { to: "/registry", icon: FileText, label: t("nav.registry") },
        { to: "/services", icon: HeadphonesIcon, label: t("nav.services") },
        { to: "/requests", icon: ClipboardList, label: t("nav.requests") },
        { to: "/reports", icon: BarChart3, label: t("nav.reports") },
        { to: "/messages", icon: MessageCircle, label: t("nav.reports") },
        { to: "/analytics", icon: BarChart3, label: t("nav.analytics") },
        ...(user?.role !== "CITIZEN" ? [{ to: "/audit", icon: ShieldCheck, label: t("nav.audit") }] : []),
        ...(user?.role === "ADMIN" ? [{ to: "/users", icon: Users, label: t("nav.users") }] : []),
        { to: "/settings", icon: Settings, label: t("nav.settings") },
    ];
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-title", children: t("app.name") }), _jsx("div", { className: "brand-sub", children: t("app.subtitle") })] }), _jsxs("nav", { children: [items.map((it) => (_jsxs(NavLink, { to: it.to, className: ({ isActive }) => "nav-item" + (isActive ? " active" : ""), children: [_jsx(it.icon, { size: 18 }), _jsx("span", { children: it.label })] }, it.to))), _jsxs("div", { className: "nav-item", onClick: () => { logout(); navigate("/login"); }, children: [_jsx(LogOut, { size: 18 }), _jsx("span", { children: t("nav.logout") })] })] })] }), _jsxs("div", { className: "main-area", children: [_jsx("div", { className: "tricolour-strip" }), _jsxs("div", { className: "topbar", children: [_jsxs("div", { style: { fontWeight: 600 }, children: [t("dashboard.welcome"), ", ", user?.name] }), _jsxs("div", { className: "topbar-actions", children: [_jsxs("select", { value: i18n.language, onChange: (e) => setLanguage(e.target.value), style: { width: 100 }, children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "hi", children: String.fromCodePoint(0x0939, 0x093f, 0x0928, 0x094d, 0x0926, 0x0940) })] }), _jsx(Bell, { size: 18 }), _jsx("span", { className: "badge gray", children: user?.role })] })] }), _jsx("div", { className: "content", children: _jsx(Outlet, {}) })] }), _jsx(MessagesPopup, {})] }));
}
