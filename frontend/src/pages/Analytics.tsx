import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import client from "../api/client";

const COLORS = ["#0b2447", "#ff9933", "#138808", "#6b7686", "#b8860b", "#d64545"];

function toChartData(obj: Record<string, number> = {}) {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("MONTH");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    client.get(`/api/analytics?period=${period}`).then((r) => setData(r.data.data));
  }, [period]);

  if (!data) return <div className="card">{t("common.loading")}</div>;

  const kpis = [
    { label: t("dashboard.totalParcels"), value: data.kpis.total_parcels },
    { label: t("analytics.verifiedParcels"), value: data.kpis.verified_parcels },
    { label: t("analytics.pendingRecords"), value: data.kpis.pending_records },
    { label: t("analytics.encumberedParcels"), value: data.kpis.encumbered_parcels },
    { label: t("analytics.totalArea"), value: `${data.kpis.total_land_area} sq m` },
    { label: t("analytics.activeRequests"), value: data.kpis.active_requests },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{t("analytics.title")}</div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 150 }}>
          <option value="DAY">{t("analytics.day")}</option>
          <option value="WEEK">{t("analytics.week")}</option>
          <option value="MONTH">{t("analytics.month")}</option>
          <option value="YEAR">{t("analytics.year")}</option>
          <option value="ALL_TIME">{t("analytics.allTime")}</option>
        </select>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}><div className="kpi-value">{k.value}</div><div className="kpi-label">{k.label}</div></div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Period Comparison ({data.comparison.period})</div>
        <div className="grid-2">
          <div>Current: {data.comparison.current.new_parcels} new parcels, {data.comparison.current.service_requests} requests</div>
          <div>Previous: {data.comparison.previous.new_parcels} new parcels, {data.comparison.previous.service_requests} requests</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Land Use Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={toChartData(data.charts.land_use_distribution)} dataKey="value" nameKey="name" outerRadius={90} label>
                {toChartData(data.charts.land_use_distribution).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>State Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={toChartData(data.charts.state_distribution)}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
              <YAxis /><Tooltip /><Bar dataKey="value" fill="#0b2447" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Registration Status</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={toChartData(data.charts.registration_status)}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#138808" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Citizen Services</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={toChartData(data.charts.citizen_services)}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={90} />
              <YAxis /><Tooltip /><Bar dataKey="value" fill="#ff9933" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
