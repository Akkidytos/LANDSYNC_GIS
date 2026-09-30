import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Map as MapIcon,
  MapPinned,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Database,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

type Parcel = {
  id?: number | string;
  ulpin?: string;
  owner?: string;
  state?: string;
  district?: string;
  village?: string;
  area?: number;
  area_unit?: string;
  land_use?: string;
  status?: string;
  ror_status?: string;
  encumbrance_status?: string;
  tax_status?: string;
};

type Service = {
  id?: number | string;
  request_id?: string;
  service?: string;
  subject?: string;
  applicant?: string;
  status?: string;
  created_at?: string;
};

type DashboardData = {
  parcel_count?: number;
  request_count?: number;
  pending_requests?: number;
  verified_records?: number;
  clear_encumbrances?: number;
  land_use?: Array<{ name?: string; value?: number }>;
};

function payload(value: any) {
  return value?.data?.data ?? value?.data ?? value ?? {};
}

function arrayPayload(value: any) {
  const x = payload(value);
  if (Array.isArray(x)) return x;
  return x?.items ?? x?.data ?? [];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Admin";

  async function load() {
    setLoading(true);

    const [parcelRes, dashboardRes, serviceRes] = await Promise.allSettled([
      client.get("/api/parcels"),
      client.get("/api/dashboard"),
      client.get("/api/services/requests"),
    ]);

    const parcelRows =
      parcelRes.status === "fulfilled"
        ? arrayPayload(parcelRes.value)
        : [];

    const serviceRows =
      serviceRes.status === "fulfilled"
        ? arrayPayload(serviceRes.value)
        : [];

    const dash =
      dashboardRes.status === "fulfilled"
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
    const verified = parcels.filter((p) =>
      ["VERIFIED", "APPROVED", "ACTIVE"].includes(
        String(p.status || p.ror_status || "").toUpperCase()
      )
    ).length;

    const pending = parcels.filter((p) =>
      ["PENDING", "REVIEW", "IN REVIEW"].includes(
        String(p.status || p.ror_status || "").toUpperCase()
      )
    ).length;

    const states = new Set(
      parcels.map((p) => p.state).filter(Boolean)
    ).size;

    const landUseMap = new globalThis.Map<string, number>();

    parcels.forEach((p) => {
      const key = p.land_use || "Other";
      landUseMap.set(key, (landUseMap.get(key) || 0) + 1);
    });

    const landUse =
      dashboard.land_use?.length
        ? dashboard.land_use
        : Array.from(landUseMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));

    const requestPending = services.filter((s) =>
      ["PENDING", "SUBMITTED", "IN REVIEW", "IN_REVIEW", "OPEN"].includes(
        String(s.status || "").toUpperCase()
      )
    ).length;

    return {
      total:
        dashboard.parcel_count ??
        parcels.length,

      verified:
        dashboard.verified_records ??
        verified,

      pending:
        dashboard.pending_requests ??
        requestPending ??
        pending,

      requests:
        dashboard.request_count ??
        services.length,

      states,
      landUse,
    };
  }, [dashboard, parcels, services]);

  const filteredParcels = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return parcels.slice(0, 6);

    return parcels
      .filter((p) =>
        [
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
          .includes(q)
      )
      .slice(0, 6);
  }, [parcels, search]);

  const maxLandUse = Math.max(
    ...derived.landUse.map((x: any) => Number(x.value || 0)),
    1
  );

  return (
    <div className="ls-pro-dashboard">

      {/* HERO */}
      <section className="ls-pro-hero">

        <div className="ls-pro-hero-image" />

        <div className="ls-pro-hero-overlay" />

        <div className="ls-pro-hero-content">

          <div className="ls-pro-overline">
            <span className="ls-pro-live" />
            DIGITAL LAND GOVERNANCE
            <span className="ls-pro-overline-dot" />
            LIVE WORKSPACE
          </div>

          <h1>
            Welcome back,
            <strong> {firstName}</strong>
            <span className="ls-pro-wave">👋</span>
          </h1>

          <p>
            One parcel, one digital identity, connected land information —
            all from a single governance workspace.
          </p>

          <div className="ls-pro-hero-pills">
            <span><MapPinned size={14}/> GIS Connected</span>
            <span><ShieldCheck size={14}/> Secure Access</span>
            <span><Layers3 size={14}/> Parcel Intelligence</span>
          </div>

          <div className="ls-pro-search">
            <Search size={18}/>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ULPIN, owner, village or district..."
            />
            <button type="button" onClick={() => navigate("/map")}>
              Search
              <ArrowRight size={15}/>
            </button>
          </div>

        </div>

        <div className="ls-pro-hero-side">
          <div className="ls-pro-date-card">
            <span>LANDSYNC PORTAL</span>
            <strong>Governance Dashboard</strong>
            <small>Integrated GIS-Based Digital Land Governance System</small>
          </div>

          <div className="ls-pro-orbit">
            <div className="ls-pro-orbit-ring ring-a" />
            <div className="ls-pro-orbit-ring ring-b" />
            <div className="ls-pro-orbit-core">
              <MapIcon size={23}/>
              <b>GIS</b>
              <small>LANDSYNC</small>
            </div>
          </div>
        </div>

      </section>

      {/* KPI */}
      <section className="ls-pro-kpis">

        <Kpi
          icon={<Database size={21}/>}
          value={loading ? "—" : derived.total}
          label="Total Parcels"
          caption="Across connected records"
          tone="blue"
        />

        <Kpi
          icon={<CheckCircle2 size={21}/>}
          value={loading ? "—" : derived.verified}
          label="Verified Records"
          caption="Current verified status"
          tone="green"
        />

        <Kpi
          icon={<Clock3 size={21}/>}
          value={loading ? "—" : derived.pending}
          label="Pending Workflows"
          caption="Requests needing attention"
          tone="orange"
        />

        <Kpi
          icon={<MapPinned size={21}/>}
          value={loading ? "—" : derived.states}
          label="States Covered"
          caption="Available in pilot dataset"
          tone="purple"
        />

      </section>

      {/* QUICK ACTIONS */}
      <section className="ls-pro-section">

        <div className="ls-pro-section-head">
          <div>
            <span>WORKSPACE</span>
            <h2>Quick Actions</h2>
            <p>Frequently used LandSync workflows</p>
          </div>

          <button
            className="ls-pro-view-link"
            onClick={() => navigate("/map")}
          >
            Open GIS
            <ArrowRight size={14}/>
          </button>
        </div>

        <div className="ls-pro-actions">

          <Action
            icon={<Search size={20}/>}
            title="Search Parcel"
            text="Find by ULPIN, owner or location"
            tone="blue"
            onClick={() => navigate("/map")}
          />

          <Action
            icon={<Plus size={20}/>}
            title="Add Land Record"
            text="Create a new registry record"
            tone="green"
            onClick={() => navigate("/registry")}
          />

          <Action
            icon={<FileText size={20}/>}
            title="Generate Report"
            text="Export authorized records"
            tone="orange"
            onClick={() => navigate("/reports")}
          />

          <Action
            icon={<Users size={20}/>}
            title="Service Requests"
            text="Review citizen workflows"
            tone="purple"
            onClick={() => navigate("/service-requests")}
          />

        </div>

      </section>

      {/* MAIN GRID */}
      <section className="ls-pro-main-grid">

        {/* RECENT RECORDS */}
        <div className="ls-pro-card ls-pro-records">

          <div className="ls-pro-card-head">
            <div>
              <span>LAND REGISTRY</span>
              <h2>Recent Land Records</h2>
              <p>Latest parcel records available in LandSync</p>
            </div>

            <button onClick={() => navigate("/registry")}>
              View All
              <ChevronRight size={15}/>
            </button>
          </div>

          <div className="ls-pro-table-wrap">
            <table className="ls-pro-table">

              <thead>
                <tr>
                  <th>ULPIN</th>
                  <th>OWNER</th>
                  <th>LOCATION</th>
                  <th>AREA</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>

              <tbody>

                {filteredParcels.length ? (
                  filteredParcels.map((parcel, index) => (
                    <tr key={parcel.id ?? parcel.ulpin ?? index}>

                      <td>
                        <strong className="ls-pro-ulpin">
                          {parcel.ulpin || "—"}
                        </strong>
                      </td>

                      <td>{parcel.owner || "—"}</td>

                      <td>
                        <div className="ls-pro-location">
                          <strong>{parcel.village || "—"}</strong>
                          <span>{parcel.district || parcel.state || "—"}</span>
                        </div>
                      </td>

                      <td>
                        {parcel.area != null
                          ? `${parcel.area} ${parcel.area_unit || ""}`
                          : "—"}
                      </td>

                      <td>
                        <Status status={parcel.status || parcel.ror_status}/>
                      </td>

                      <td>
                        <button
                          className="ls-pro-eye"
                          onClick={() =>
                            parcel.id &&
                            navigate(`/parcels/${parcel.id}`)
                          }
                          title="View parcel"
                        >
                          <Eye size={15}/>
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="ls-pro-empty">
                        <Layers3 size={28}/>
                        <strong>No parcel records found</strong>
                        <span>
                          {search
                            ? "Try another search."
                            : "Add records from the registry."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

              </tbody>

            </table>
          </div>

        </div>

        {/* LAND USE */}
        <div className="ls-pro-card ls-pro-landuse">

          <div className="ls-pro-card-head compact">
            <div>
              <span>SPATIAL PROFILE</span>
              <h2>Land Use Mix</h2>
              <p>Distribution across current records</p>
            </div>

            <div className="ls-pro-head-icon green">
              <BarChart3 size={17}/>
            </div>
          </div>

          <div className="ls-pro-landuse-body">

            {derived.landUse.length ? (
              derived.landUse.slice(0, 6).map((item: any, index: number) => {

                const value = Number(item.value || 0);
                const width = Math.max(
                  7,
                  Math.round((value / maxLandUse) * 100)
                );

                return (
                  <div className="ls-pro-land-row" key={`${item.name}-${index}`}>

                    <div className="ls-pro-land-top">
                      <span>{item.name || "Other"}</span>
                      <strong>{value}</strong>
                    </div>

                    <div className="ls-pro-land-track">
                      <div
                        className={`ls-pro-land-fill f-${index % 5}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="ls-pro-empty">
                <BarChart3 size={27}/>
                <strong>No land-use data</strong>
                <span>Distribution will appear when records are available.</span>
              </div>
            )}

          </div>

        </div>

      </section>

      {/* LOWER GRID */}
      <section className="ls-pro-lower-grid">

        {/* GIS SPOTLIGHT */}
        <div className="ls-pro-gis-card">

          <div className="ls-pro-gis-photo" />
          <div className="ls-pro-gis-shade" />

          <div className="ls-pro-gis-copy">
            <span>SPATIAL INTELLIGENCE</span>

            <h2>Explore land visually.</h2>

            <p>
              Locate parcels, inspect boundaries and connect map context
              with your land records.
            </p>

            <button onClick={() => navigate("/map")}>
              Open GIS Explorer
              <ArrowRight size={15}/>
            </button>
          </div>

          <div className="ls-pro-mini-map">
            <div className="grid-lines" />
            <div className="map-shape shape-a" />
            <div className="map-shape shape-b" />
            <div className="map-shape shape-c" />
            <span className="map-pin pin-a"><MapPinned size={15}/></span>
            <span className="map-pin pin-b"><MapPinned size={15}/></span>
            <span className="map-pin pin-c"><MapPinned size={15}/></span>
          </div>

        </div>

        {/* SERVICE REQUESTS */}
        <div className="ls-pro-card ls-pro-services">

          <div className="ls-pro-card-head compact">
            <div>
              <span>CITIZEN SERVICES</span>
              <h2>Recent Requests</h2>
              <p>{derived.requests} total workflow records</p>
            </div>

            <button
              className="ls-pro-view-link"
              onClick={() => navigate("/service-requests")}
            >
              View All
            </button>
          </div>

          <div className="ls-pro-service-list">

            {services.length ? (
              services.slice(0, 5).map((item, index) => (
                <div
                  className="ls-pro-service-row"
                  key={item.id ?? item.request_id ?? index}
                >
                  <div className="ls-pro-service-icon">
                    <FileText size={15}/>
                  </div>

                  <div className="ls-pro-service-copy">
                    <strong>
                      {item.service ||
                        item.subject ||
                        "Land Information Request"}
                    </strong>
                    <span>
                      {item.applicant || "Citizen request"}
                    </span>
                  </div>

                  <Status status={item.status}/>

                </div>
              ))
            ) : (
              <div className="ls-pro-empty service-empty">
                <ShieldCheck size={27}/>
                <strong>No service requests yet</strong>
                <span>Citizen workflows will appear here.</span>
              </div>
            )}

          </div>

        </div>

      </section>

      {/* FOOT NOTE */}
      <div className="ls-pro-demo-note">
        <ShieldCheck size={15}/>
        <span>
          Demo / Synthetic Data — Not an Official Land Record
        </span>
        <span className="dot" />
        <span>LandSync academic prototype</span>
      </div>

    </div>
  );
}

function Kpi({
  icon,
  value,
  label,
  caption,
  tone,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  caption: string;
  tone: string;
}) {
  return (
    <article className={`ls-pro-kpi ${tone}`}>

      <div className="ls-pro-kpi-top">
        <span className="ls-pro-kpi-icon">{icon}</span>
        <span className="ls-pro-kpi-badge">LIVE</span>
      </div>

      <strong className="ls-pro-kpi-value">{value}</strong>

      <span className="ls-pro-kpi-label">{label}</span>

      <small>{caption}</small>

      <div className="ls-pro-kpi-glow" />

    </article>
  );
}

function Action({
  icon,
  title,
  text,
  tone,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button className={`ls-pro-action ${tone}`} onClick={onClick}>

      <span className="ls-pro-action-icon">{icon}</span>

      <span className="ls-pro-action-copy">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>

      <ArrowRight className="action-arrow" size={16}/>

    </button>
  );
}

function Status({ status }: { status?: string }) {
  const normalized = String(status || "PENDING")
    .trim()
    .toUpperCase();

  const map: Record<string, [string,string]> = {
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

  const [label, className] =
    map[normalized] || ["Pending", "pending"];

  return (
    <span className={`ls-pro-status ${className}`}>
      <i />
      {label}
    </span>
  );
}
