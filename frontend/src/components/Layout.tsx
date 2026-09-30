import MessagesPopup from "../pages/MessagesPopup";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Map, FileText, HeadphonesIcon, ClipboardList, BarChart3,
  ShieldCheck, Users, Settings, LogOut, Bell,
  MessageCircle
} from "lucide-react";
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">{t("app.name")}</div>
          <div className="brand-sub">{t("app.subtitle")}</div>
        </div>
        <nav>
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <it.icon size={18} />
              <span>{it.label}</span>
            </NavLink>
          ))}
          <div className="nav-item" onClick={() => { logout(); navigate("/login"); }}>
            <LogOut size={18} />
            <span>{t("nav.logout")}</span>
          </div>
        </nav>
      </aside>
      <div className="main-area">
        <div className="tricolour-strip" />
        <div className="topbar">
          <div style={{ fontWeight: 600 }}>{t("dashboard.welcome")}, {user?.name}</div>
          <div className="topbar-actions">
            <select value={i18n.language} onChange={(e) => setLanguage(e.target.value)} style={{ width: 100 }}>
              <option value="en">English</option>
              <option value="hi">{String.fromCodePoint(0x0939,0x093f,0x0928,0x094d,0x0926,0x0940)}</option>
            </select>
            <Bell size={18} />
            <span className="badge gray">{user?.role}</span>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    
<MessagesPopup />
</div>
  );
}


