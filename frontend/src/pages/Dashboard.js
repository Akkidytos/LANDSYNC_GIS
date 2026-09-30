import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, Clock3, FileText, Layers3, Map as MapIcon, MapPinned, Plus, Search, ShieldCheck, Users, Database, Eye, ChevronRight, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
function payload(value) {
    return value?.data?.data ?? value?.data ?? value ?? {};
}
function arrayPayload(value) {
    const x = payload(value);
    if (Array.isArray(x))
        return x;
    return x?.items ?? x?.data ?? [];
}
export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState({});
    const [parcels, setParcels] = useState([]);
    const [services, setServices] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const firstName = user?.name?.split(" ")[0] ||
        user?.email?.split("@")[0] ||
        "Admin";
    async function load() {
        setLoading(true);
        const [parcelRes, dashboardRes, serviceRes] = await Promise.allSettled([
            client.get("/api/parcels"),
            client.get("/api/dashboard"),
            client.get("/api/services/requests"),
        ]);
        const parcelRows = parcelRes.status === "fulfilled"
            ? arrayPayload(parcelRes.value)
            : [];
        const serviceRows = serviceRes.status === "fulfilled"
            ? arrayPayload(serviceRes.value)
            : [];
        const dash = dashboardRes.status === "fulfilled"
            ? payload(dashboardRes.value)
            : {};
        setParcels(Array.isArray(parcelRows) ? parcelRows : []);
        setServices(Array.isArray(serviceRows) ? serviceRows : []);
        setDashboard(dash || {});
        setLoading(false);
    }
    useEffect(() => {
        load();
    }, []);
    const derived = useMemo(() => {
        const verified = parcels.filter((p) => ["VERIFIED", "APPROVED", "ACTIVE"].includes(String(p.status || p.ror_status || "").toUpperCase())).length;
        const pending = parcels.filter((p) => ["PENDING", "REVIEW", "IN REVIEW"].includes(String(p.status || p.ror_status || "").toUpperCase())).length;
        const states = new Set(parcels.map((p) => p.state).filter(Boolean)).size;
        const landUseMap = new globalThis.Map();
        parcels.forEach((p) => {
            const key = p.land_use || "Other";
            landUseMap.set(key, (landUseMap.get(key) || 0) + 1);
        });
        const landUse = dashboard.land_use?.length
            ? dashboard.land_use
            : Array.from(landUseMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => Number(b.value) - Number(a.value));
        const requestPending = services.filter((s) => ["PENDING", "SUBMITTED", "IN REVIEW", "IN_REVIEW", "OPEN"].includes(String(s.status || "").toUpperCase())).length;
        return {
            total: dashboard.parcel_count ??
                parcels.length,
            verified: dashboard.verified_records ??
                verified,
            pending: dashboard.pending_requests ??
                requestPending ??
                pending,
            requests: dashboard.request_count ??
                services.length,
            states,
            landUse,
        };
    }, [dashboard, parcels, services]);
    const filteredParcels = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return parcels.slice(0, 6);
        return parcels
            .filter((p) => [
            p.ulpin,
            p.owner,
            p.village,
            p.district,
            p.state,
            p.land_use,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q))
            .slice(0, 6);
    }, [parcels, search]);
    const maxLandUse = Math.max(...derived.landUse.map((x) => Number(x.value || 0)), 1);
    return (_jsxs("div", { className: "ls-pro-dashboard", children: [_jsxs("section", { className: "ls-pro-hero", children: [_jsx("div", { className: "ls-pro-hero-image" }), _jsx("div", { className: "ls-pro-hero-overlay" }), _jsxs("div", { className: "ls-pro-hero-content", children: [_jsxs("div", { className: "ls-pro-overline", children: [_jsx("span", { className: "ls-pro-live" }), "DIGITAL LAND GOVERNANCE", _jsx("span", { className: "ls-pro-overline-dot" }), "LIVE WORKSPACE"] }), _jsxs("h1", { children: ["Welcome back,", _jsxs("strong", { children: [" ", firstName] }), _jsx("span", { className: "ls-pro-wave", children: "\uD83D\uDC4B" })] }), _jsx("p", { children: "One parcel, one digital identity, connected land information \u2014 all from a single governance workspace." }), _jsxs("div", { className: "ls-pro-hero-pills", children: [_jsxs("span", { children: [_jsx(MapPinned, { size: 14 }), " GIS Connected"] }), _jsxs("span", { children: [_jsx(ShieldCheck, { size: 14 }), " Secure Access"] }), _jsxs("span", { children: [_jsx(Layers3, { size: 14 }), " Parcel Intelligence"] })] }), _jsxs("div", { className: "ls-pro-search", children: [_jsx(Search, { size: 18 }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search ULPIN, owner, village or district..." }), _jsxs("button", { type: "button", onClick: () => navigate("/map"), children: ["Search", _jsx(ArrowRight, { size: 15 })] })] })] }), _jsxs("div", { className: "ls-pro-hero-side", children: [_jsxs("div", { className: "ls-pro-date-card", children: [_jsx("span", { children: "LANDSYNC PORTAL" }), _jsx("strong", { children: "Governance Dashboard" }), _jsx("small", { children: "Integrated GIS-Based Digital Land Governance System" })] }), _jsxs("div", { className: "ls-pro-orbit", children: [_jsx("div", { className: "ls-pro-orbit-ring ring-a" }), _jsx("div", { className: "ls-pro-orbit-ring ring-b" }), _jsxs("div", { className: "ls-pro-orbit-core", children: [_jsx(MapIcon, { size: 23 }), _jsx("b", { children: "GIS" }), _jsx("small", { children: "LANDSYNC" })] })] })] })] }), _jsxs("section", { className: "ls-pro-kpis", children: [_jsx(Kpi, { icon: _jsx(Database, { size: 21 }), value: loading ? "—" : derived.total, label: "Total Parcels", caption: "Across connected records", tone: "blue" }), _jsx(Kpi, { icon: _jsx(CheckCircle2, { size: 21 }), value: loading ? "—" : derived.verified, label: "Verified Records", caption: "Current verified status", tone: "green" }), _jsx(Kpi, { icon: _jsx(Clock3, { size: 21 }), value: loading ? "—" : derived.pending, label: "Pending Workflows", caption: "Requests needing attention", tone: "orange" }), _jsx(Kpi, { icon: _jsx(MapPinned, { size: 21 }), value: loading ? "—" : derived.states, label: "States Covered", caption: "Available in pilot dataset", tone: "purple" })] }), _jsxs("section", { className: "ls-pro-section", children: [_jsxs("div", { className: "ls-pro-section-head", children: [_jsxs("div", { children: [_jsx("span", { children: "WORKSPACE" }), _jsx("h2", { children: "Quick Actions" }), _jsx("p", { children: "Frequently used LandSync workflows" })] }), _jsxs("button", { className: "ls-pro-view-link", onClick: () => navigate("/map"), children: ["Open GIS", _jsx(ArrowRight, { size: 14 })] })] }), _jsxs("div", { className: "ls-pro-actions", children: [_jsx(Action, { icon: _jsx(Search, { size: 20 }), title: "Search Parcel", text: "Find by ULPIN, owner or location", tone: "blue", onClick: () => navigate("/map") }), _jsx(Action, { icon: _jsx(Plus, { size: 20 }), title: "Add Land Record", text: "Create a new registry record", tone: "green", onClick: () => navigate("/registry") }), _jsx(Action, { icon: _jsx(FileText, { size: 20 }), title: "Generate Report", text: "Export authorized records", tone: "orange", onClick: () => navigate("/reports") }), _jsx(Action, { icon: _jsx(Users, { size: 20 }), title: "Service Requests", text: "Review citizen workflows", tone: "purple", onClick: () => navigate("/service-requests") })] })] }), _jsxs("section", { className: "ls-pro-main-grid", children: [_jsxs("div", { className: "ls-pro-card ls-pro-records", children: [_jsxs("div", { className: "ls-pro-card-head", children: [_jsxs("div", { children: [_jsx("span", { children: "LAND REGISTRY" }), _jsx("h2", { children: "Recent Land Records" }), _jsx("p", { children: "Latest parcel records available in LandSync" })] }), _jsxs("button", { onClick: () => navigate("/registry"), children: ["View All", _jsx(ChevronRight, { size: 15 })] })] }), _jsx("div", { className: "ls-pro-table-wrap", children: _jsxs("table", { className: "ls-pro-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ULPIN" }), _jsx("th", { children: "OWNER" }), _jsx("th", { children: "LOCATION" }), _jsx("th", { children: "AREA" }), _jsx("th", { children: "STATUS" }), _jsx("th", {})] }) }), _jsx("tbody", { children: filteredParcels.length ? (filteredParcels.map((parcel, index) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { className: "ls-pro-ulpin", children: parcel.ulpin || "—" }) }), _jsx("td", { children: parcel.owner || "—" }), _jsx("td", { children: _jsxs("div", { className: "ls-pro-location", children: [_jsx("strong", { children: parcel.village || "—" }), _jsx("span", { children: parcel.district || parcel.state || "—" })] }) }), _jsx("td", { children: parcel.area != null
                                                            ? `${parcel.area} ${parcel.area_unit || ""}`
                                                            : "—" }), _jsx("td", { children: _jsx(Status, { status: parcel.status || parcel.ror_status }) }), _jsx("td", { children: _jsx("button", { className: "ls-pro-eye", onClick: () => parcel.id &&
                                                                navigate(`/parcels/${parcel.id}`), title: "View parcel", children: _jsx(Eye, { size: 15 }) }) })] }, parcel.id ?? parcel.ulpin ?? index)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: _jsxs("div", { className: "ls-pro-empty", children: [_jsx(Layers3, { size: 28 }), _jsx("strong", { children: "No parcel records found" }), _jsx("span", { children: search
                                                                    ? "Try another search."
                                                                    : "Add records from the registry." })] }) }) })) })] }) })] }), _jsxs("div", { className: "ls-pro-card ls-pro-landuse", children: [_jsxs("div", { className: "ls-pro-card-head compact", children: [_jsxs("div", { children: [_jsx("span", { children: "SPATIAL PROFILE" }), _jsx("h2", { children: "Land Use Mix" }), _jsx("p", { children: "Distribution across current records" })] }), _jsx("div", { className: "ls-pro-head-icon green", children: _jsx(BarChart3, { size: 17 }) })] }), _jsx("div", { className: "ls-pro-landuse-body", children: derived.landUse.length ? (derived.landUse.slice(0, 6).map((item, index) => {
                                    const value = Number(item.value || 0);
                                    const width = Math.max(7, Math.round((value / maxLandUse) * 100));
                                    return (_jsxs("div", { className: "ls-pro-land-row", children: [_jsxs("div", { className: "ls-pro-land-top", children: [_jsx("span", { children: item.name || "Other" }), _jsx("strong", { children: value })] }), _jsx("div", { className: "ls-pro-land-track", children: _jsx("div", { className: `ls-pro-land-fill f-${index % 5}`, style: { width: `${width}%` } }) })] }, `${item.name}-${index}`));
                                })) : (_jsxs("div", { className: "ls-pro-empty", children: [_jsx(BarChart3, { size: 27 }), _jsx("strong", { children: "No land-use data" }), _jsx("span", { children: "Distribution will appear when records are available." })] })) })] })] }), _jsxs("section", { className: "ls-pro-lower-grid", children: [_jsxs("div", { className: "ls-pro-gis-card", children: [_jsx("div", { className: "ls-pro-gis-photo" }), _jsx("div", { className: "ls-pro-gis-shade" }), _jsxs("div", { className: "ls-pro-gis-copy", children: [_jsx("span", { children: "SPATIAL INTELLIGENCE" }), _jsx("h2", { children: "Explore land visually." }), _jsx("p", { children: "Locate parcels, inspect boundaries and connect map context with your land records." }), _jsxs("button", { onClick: () => navigate("/map"), children: ["Open GIS Explorer", _jsx(ArrowRight, { size: 15 })] })] }), _jsxs("div", { className: "ls-pro-mini-map", children: [_jsx("div", { className: "grid-lines" }), _jsx("div", { className: "map-shape shape-a" }), _jsx("div", { className: "map-shape shape-b" }), _jsx("div", { className: "map-shape shape-c" }), _jsx("span", { className: "map-pin pin-a", children: _jsx(MapPinned, { size: 15 }) }), _jsx("span", { className: "map-pin pin-b", children: _jsx(MapPinned, { size: 15 }) }), _jsx("span", { className: "map-pin pin-c", children: _jsx(MapPinned, { size: 15 }) })] })] }), _jsxs("div", { className: "ls-pro-card ls-pro-services", children: [_jsxs("div", { className: "ls-pro-card-head compact", children: [_jsxs("div", { children: [_jsx("span", { children: "CITIZEN SERVICES" }), _jsx("h2", { children: "Recent Requests" }), _jsxs("p", { children: [derived.requests, " total workflow records"] })] }), _jsx("button", { className: "ls-pro-view-link", onClick: () => navigate("/service-requests"), children: "View All" })] }), _jsx("div", { className: "ls-pro-service-list", children: services.length ? (services.slice(0, 5).map((item, index) => (_jsxs("div", { className: "ls-pro-service-row", children: [_jsx("div", { className: "ls-pro-service-icon", children: _jsx(FileText, { size: 15 }) }), _jsxs("div", { className: "ls-pro-service-copy", children: [_jsx("strong", { children: item.service ||
                                                        item.subject ||
                                                        "Land Information Request" }), _jsx("span", { children: item.applicant || "Citizen request" })] }), _jsx(Status, { status: item.status })] }, item.id ?? item.request_id ?? index)))) : (_jsxs("div", { className: "ls-pro-empty service-empty", children: [_jsx(ShieldCheck, { size: 27 }), _jsx("strong", { children: "No service requests yet" }), _jsx("span", { children: "Citizen workflows will appear here." })] })) })] })] }), _jsxs("div", { className: "ls-pro-demo-note", children: [_jsx(ShieldCheck, { size: 15 }), _jsx("span", { children: "Demo / Synthetic Data \u2014 Not an Official Land Record" }), _jsx("span", { className: "dot" }), _jsx("span", { children: "LandSync academic prototype" })] })] }));
}
function Kpi({ icon, value, label, caption, tone, }) {
    return (_jsxs("article", { className: `ls-pro-kpi ${tone}`, children: [_jsxs("div", { className: "ls-pro-kpi-top", children: [_jsx("span", { className: "ls-pro-kpi-icon", children: icon }), _jsx("span", { className: "ls-pro-kpi-badge", children: "LIVE" })] }), _jsx("strong", { className: "ls-pro-kpi-value", children: value }), _jsx("span", { className: "ls-pro-kpi-label", children: label }), _jsx("small", { children: caption }), _jsx("div", { className: "ls-pro-kpi-glow" })] }));
}
function Action({ icon, title, text, tone, onClick, }) {
    return (_jsxs("button", { className: `ls-pro-action ${tone}`, onClick: onClick, children: [_jsx("span", { className: "ls-pro-action-icon", children: icon }), _jsxs("span", { className: "ls-pro-action-copy", children: [_jsx("strong", { children: title }), _jsx("small", { children: text })] }), _jsx(ArrowRight, { className: "action-arrow", size: 16 })] }));
}
function Status({ status }) {
    const normalized = String(status || "PENDING")
        .trim()
        .toUpperCase();
    const map = {
        VERIFIED: ["Verified", "verified"],
        APPROVED: ["Approved", "approved"],
        ACTIVE: ["Active", "active"],
        PENDING: ["Pending", "pending"],
        REVIEW: ["Review", "review"],
        "IN REVIEW": ["In Review", "review"],
        "IN_REVIEW": ["In Review", "review"],
        SUBMITTED: ["Submitted", "review"],
        REJECTED: ["Rejected", "rejected"],
    };
    const [label, className] = map[normalized] || ["Pending", "pending"];
    return (_jsxs("span", { className: `ls-pro-status ${className}`, children: [_jsx("i", {}), label] }));
}
