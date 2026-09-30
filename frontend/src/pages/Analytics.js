import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import client from "../api/client";
const COLORS = ["#0b2447", "#ff9933", "#138808", "#6b7686", "#b8860b", "#d64545"];
function toChartData(obj = {}) {
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
}
export default function Analytics() {
    const { t } = useTranslation();
    const [period, setPeriod] = useState("MONTH");
    const [data, setData] = useState(null);
    useEffect(() => {
        client.get(`/api/analytics?period=${period}`).then((r) => setData(r.data.data));
    }, [period]);
    if (!data)
        return _jsx("div", { className: "card", children: t("common.loading") });
    const kpis = [
        { label: t("dashboard.totalParcels"), value: data.kpis.total_parcels },
        { label: t("analytics.verifiedParcels"), value: data.kpis.verified_parcels },
        { label: t("analytics.pendingRecords"), value: data.kpis.pending_records },
        { label: t("analytics.encumberedParcels"), value: data.kpis.encumbered_parcels },
        { label: t("analytics.totalArea"), value: `${data.kpis.total_land_area} sq m` },
        { label: t("analytics.activeRequests"), value: data.kpis.active_requests },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [_jsx("div", { style: { fontWeight: 700, fontSize: 18 }, children: t("analytics.title") }), _jsxs("select", { value: period, onChange: (e) => setPeriod(e.target.value), style: { width: 150 }, children: [_jsx("option", { value: "DAY", children: t("analytics.day") }), _jsx("option", { value: "WEEK", children: t("analytics.week") }), _jsx("option", { value: "MONTH", children: t("analytics.month") }), _jsx("option", { value: "YEAR", children: t("analytics.year") }), _jsx("option", { value: "ALL_TIME", children: t("analytics.allTime") })] })] }), _jsx("div", { className: "kpi-grid", children: kpis.map((k) => (_jsxs("div", { className: "kpi-card", children: [_jsx("div", { className: "kpi-value", children: k.value }), _jsx("div", { className: "kpi-label", children: k.label })] }, k.label))) }), _jsxs("div", { className: "card", style: { marginBottom: 16 }, children: [_jsxs("div", { style: { fontWeight: 700, marginBottom: 10 }, children: ["Period Comparison (", data.comparison.period, ")"] }), _jsxs("div", { className: "grid-2", children: [_jsxs("div", { children: ["Current: ", data.comparison.current.new_parcels, " new parcels, ", data.comparison.current.service_requests, " requests"] }), _jsxs("div", { children: ["Previous: ", data.comparison.previous.new_parcels, " new parcels, ", data.comparison.previous.service_requests, " requests"] })] })] }), _jsxs("div", { className: "grid-2", children: [_jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 10 }, children: "Land Use Distribution" }), _jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: toChartData(data.charts.land_use_distribution), dataKey: "value", nameKey: "name", outerRadius: 90, label: true, children: toChartData(data.charts.land_use_distribution).map((_, i) => _jsx(Cell, { fill: COLORS[i % COLORS.length] }, i)) }), _jsx(Tooltip, {}), _jsx(Legend, {})] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 10 }, children: "State Distribution" }), _jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(BarChart, { data: toChartData(data.charts.state_distribution), children: [_jsx(XAxis, { dataKey: "name", tick: { fontSize: 10 }, interval: 0, angle: -30, textAnchor: "end", height: 70 }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "value", fill: "#0b2447" })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 10 }, children: "Registration Status" }), _jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(BarChart, { data: toChartData(data.charts.registration_status), children: [_jsx(XAxis, { dataKey: "name", tick: { fontSize: 11 } }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "value", fill: "#138808" })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 10 }, children: "Citizen Services" }), _jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(BarChart, { data: toChartData(data.charts.citizen_services), children: [_jsx(XAxis, { dataKey: "name", tick: { fontSize: 9 }, interval: 0, angle: -30, textAnchor: "end", height: 90 }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "value", fill: "#ff9933" })] }) })] })] })] }));
}
