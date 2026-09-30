import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

type Parcel = {
  id: string | number;
  ulpin?: string;
  owner_name?: string;
  owner?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  area?: number | string;
  area_unit?: string;
  land_use?: string;
  property_type?: string;
  ror_status?: string;
  registration_status?: string;
  encumbrance_status?: string;
  building_status?: string;
  tax_status?: string;
};

function payload(value: any) {
  return value?.data?.data ?? value?.data ?? value ?? {};
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [query, setQuery] = useState("");
  const [landUse, setLandUse] = useState("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [reportType, setReportType] = useState(
    "Detailed Land Parcel Report"
  );
  const [format, setFormat] = useState<"pdf" | "json" | "csv">("pdf");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"all" | "selected" | "user" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [reportUserId, setReportUserId] = useState("");

  async function load() {
    try {
      setLoading(true);

      const res = await client.get(
        "/api/parcels?page=1&page_size=1000"
      );

      const data = payload(res);
      const rows =
        data?.items ??
        data?.data ??
        (Array.isArray(data) ? data : []);

      setParcels(Array.isArray(rows) ? rows : []);

      if (user?.role === "ADMIN" || user?.role === "OFFICER") {
        const userRes = await client.get("/api/users");
        const userData = payload(userRes);
        const userRows =
          userData?.items ??
          userData?.data ??
          (Array.isArray(userData) ? userData : []);

        setUsers(Array.isArray(userRows) ? userRows : []);
      }

      if (user?.id && !reportUserId) {
        setReportUserId(String(user.id));
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Report data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  const landUses = useMemo(() => {
    const values = parcels
      .map((p) => p.land_use)
      .filter(Boolean) as string[];

    return ["ALL", ...Array.from(new Set(values))];
  }, [parcels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return parcels.filter((p) => {
      const text = [
        p.ulpin,
        p.owner_name,
        p.owner,
        p.state,
        p.district,
        p.village,
        p.tehsil,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesLandUse =
        landUse === "ALL" || p.land_use === landUse;

      return matchesSearch && matchesLandUse;
    });
  }, [parcels, query, landUse]);

  const selected =
    filtered.find((p) => String(p.id) === selectedId) ||
    parcels.find((p) => String(p.id) === selectedId) ||
    null;

  async function generate(scope: "all" | "selected" | "user") {
    try {
      setGenerating(scope);
      setMessage("");
      setError("");

      const params = new URLSearchParams();

      params.set("report_type", reportType);

      if (scope === "selected" && selectedId) {
        params.set("parcel_id", selectedId);
      }

      if (scope === "user") {
        if (!reportUserId) {
          throw new Error("Please select a user for the report.");
        }
        params.set("user_id", reportUserId);
        params.set("report_type", "USER_LAND_RECORDS");
      }

      if (landUse !== "ALL") {
        params.set("land_use", landUse);
      }

      const response = await client.get(
        `/api/reports-premium/${format}?${params.toString()}`,
        {
          responseType: "blob",
        }
      );

      let filename = "LandSync_Report";

      if (scope === "selected") {
        filename = "LandSync_Parcel_Dossier";
      }

      const ext = format === "pdf" ? "pdf" : format;
      filename += `.${ext}`;

      downloadBlob(response.data, filename);

      setMessage(
        scope === "selected"
          ? "Detailed parcel report generated successfully."
          : scope === "user"
          ? "Single-user report generated successfully."
          : "Accessible-record report generated successfully."
      );
    } catch (err: any) {
      setError(
        "Report generation failed. Please check the backend and try again."
      );
    } finally {
      setGenerating(null);
    }
  }

  return (
    <section className="report-studio">
      <div className="report-top-strip" />

      <div className="report-hero">
        <div>
          <div className="report-eyebrow">
            <ShieldCheck size={15} />
            LANDSYNC REPORT CENTRE
          </div>

          <h1>
            Detailed reports,
            <span> professionally generated.</span>
          </h1>

          <p>
            Generate parcel-specific or accessible-record reports with
            connected land governance information in PDF, JSON or CSV.
          </p>

          <div className="report-hero-pills">
            <span>
              <CheckCircle2 size={14} />
              RBAC-aware
            </span>
            <span>
              <FileText size={14} />
              Detailed PDF
            </span>
            <span>
              <MapPinned size={14} />
              Parcel-centric
            </span>
          </div>
        </div>

        <div className="report-hero-art">
          <FileText size={72} strokeWidth={1.15} />
          <BarChart3 size={31} />
        </div>
      </div>

      {message && (
        <div className="report-alert success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="report-alert error">
          <XCircle size={18} />
          {error}
        </div>
      )}

      <div className="report-layout">
        <div className="report-config">
          <div className="report-section-title">
            <div>
              <span>1 • REPORT TEMPLATE</span>
              <h2>Choose what to generate</h2>
            </div>
          </div>

          <div className="report-template-grid">
            <button type="button"
              className={
                reportType === "Detailed Land Parcel Report"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setReportType("Detailed Land Parcel Report")
              }
            >
              <div>
                <FileText size={22} />
              </div>
              <strong>Detailed Land Parcel</strong>
              <span>
                Identity, ownership, location, RoR, registration,
                encumbrance, planning, building and taxation.
              </span>
            </button>

            <button type="button"
              className={
                reportType === "Land Registry Summary"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setReportType("Land Registry Summary")
              }
            >
              <div>
                <FileSpreadsheet size={22} />
              </div>
              <strong>Land Registry Summary</strong>
              <span>
                Structured overview of accessible parcel records.
              </span>
            </button>
          </div>

          <div className="report-section-title second">
            <div>
              <span>2 • FORMAT</span>
              <h2>Output format</h2>
            </div>
          </div>

          <div className="report-format-row">
            {[
              ["pdf", "PDF", FileText],
              ["json", "JSON", FileJson],
              ["csv", "CSV", FileSpreadsheet],
            ].map(([id, label, Icon]: any) => (
              <button type="button"
                key={id}
                className={format === id ? "selected" : ""}
                onClick={() => setFormat(id)}
              >
                <Icon size={19} />
                <strong>{label}</strong>
                <span>
                  {id === "pdf"
                    ? "Designed dossier"
                    : id === "json"
                    ? "Structured data"
                    : "Spreadsheet export"}
                </span>
              </button>
            ))}
          </div>

          <div className="report-section-title second">
            <div>
              <span>3 • DATA FILTERS</span>
              <h2>Choose the records</h2>
            </div>
          </div>

          <div className="report-filter-grid">
            <div className="report-input">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ULPIN, owner, village..."
              />
            </div>

            <div className="report-select">
              <Filter size={16} />
              <select
                value={landUse}
                onChange={(e) => setLandUse(e.target.value)}
              >
                {landUses.map((value) => (
                  <option key={value} value={value}>
                    {value === "ALL" ? "All land uses" : value}
                  </option>
                ))}
              </select>
            </div>

            {(user?.role === "ADMIN" || user?.role === "OFFICER") && (
              <div className="report-select">
                <ShieldCheck size={16} />
                <select
                  value={reportUserId}
                  onChange={(e) => setReportUserId(e.target.value)}
                >
                  <option value="">Select user for single-user report</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name || u.email || `User ${u.id}`} ? {u.role || "USER"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="report-user-hint">
            {reportUserId
              ? "Single-user mode: only parcel associations belonging to the selected user will be included."
              : "Select a user to generate an individual user report."}
          </div>

          <div className="report-record-list">
            <div className="report-record-list-head">
              <span>{filtered.length} accessible records</span>
              <small>Select one for a parcel dossier</small>
            </div>

            <div className="report-record-scroll">
              {loading ? (
                <div className="report-loading">
                  <Loader2 className="report-spin" size={23} />
                  Loading parcel records...
                </div>
              ) : (
                filtered.slice(0, 80).map((parcel) => {
                  const active =
                    String(parcel.id) === selectedId;

                  return (
                    <button type="button"
                      key={parcel.id}
                      className={`report-record ${
                        active ? "active" : ""
                      }`}
                      onClick={() =>
                        setSelectedId(String(parcel.id))
                      }
                    >
                      <div className="report-record-icon">
                        <MapPinned size={17} />
                      </div>

                      <div>
                        <strong>
                          {parcel.ulpin || `Parcel ${parcel.id}`}
                        </strong>
                        <span>
                          {parcel.owner_name ||
                            parcel.owner ||
                            "Owner not available"}
                        </span>
                      </div>

                      <small>
                        {parcel.village || parcel.district || "—"}
                      </small>

                      <ChevronRight size={16} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="report-actions">
            <button type="button"
              className="report-secondary"
              onClick={() => generate("all")}
              disabled={generating !== null}
            >
              {generating === "all" ? (
                <Loader2 className="report-spin" size={17} />
              ) : (
                <Download size={17} />
              )}
              Generate All Accessible
            </button>

            <button type="button"
              className="report-primary"
              onClick={() => generate("user")}
              disabled={generating !== null || !reportUserId}
            >
              {generating === "all" ? (
                <Loader2 className="report-spin" size={17} />
              ) : (
                <ShieldCheck size={17} />
              )}
              Generate Single-User Report
            </button>

            <button type="button"
              className="report-primary"
              onClick={() => generate("selected")}
              disabled={generating !== null || !selected}
            >
              {generating === "all" ? (
                <Loader2 className="report-spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              Generate Selected Parcel
            </button>
          </div>
        </div>

        <div className="report-preview">
          <div className="report-preview-head">
            <div>
              <span>LIVE PREVIEW</span>
              <h2>Report contents</h2>
            </div>

            {selected && (
              <button type="button"
                className="report-clear"
                onClick={() => setSelectedId("")}
              >
                <XCircle size={15} />
                Clear selection
              </button>
            )}
          </div>

          {selected ? (
            <>
              <div className="report-preview-cover">
                <div className="report-preview-logo">
                  LANDSYNC
                </div>

                <span>
                  {reportType}
                </span>

                <strong>
                  {selected.ulpin ||
                    `Parcel ${selected.id}`}
                </strong>

                <small>
                  {selected.village}, {selected.district},{" "}
                  {selected.state}
                </small>
              </div>

              <div className="report-preview-kpis">
                <div>
                  <span>AREA</span>
                  <strong>
                    {selected.area || "—"}{" "}
                    {selected.area_unit || ""}
                  </strong>
                </div>

                <div>
                  <span>LAND USE</span>
                  <strong>
                    {selected.land_use || "—"}
                  </strong>
                </div>

                <div>
                  <span>ROR</span>
                  <strong>
                    {selected.ror_status || "—"}
                  </strong>
                </div>

                <div>
                  <span>REGISTRATION</span>
                  <strong>
                    {selected.registration_status || "—"}
                  </strong>
                </div>
              </div>

              <div className="report-preview-sections">
                {[
                  [
                    "Parcel Identity",
                    "ULPIN • Survey • Khasra • Property Type",
                  ],
                  [
                    "Ownership",
                    "Owner • Guardian • Ownership Type • Share",
                  ],
                  [
                    "Location",
                    "State • District • Tehsil • Village • Coordinates",
                  ],
                  [
                    "Governance",
                    "RoR • Registration • Encumbrance • Mortgage",
                  ],
                  [
                    "Planning",
                    "Master Plan • Zoning • Restrictions",
                  ],
                  [
                    "Building & Tax",
                    "Building Permission • Tax Status • Tax Reference",
                  ],
                ].map(([title, detail]) => (
                  <div key={title}>
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="report-preview-note">
                <ShieldCheck size={17} />
                <div>
                  <strong>Prototype data protection</strong>
                  <span>
                    Report output is generated only from records
                    accessible to the authenticated user.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="report-preview-empty">
              <FileText size={39} />
              <strong>Select a parcel to preview</strong>
              <span>
                The preview will show the sections that will appear in
                the generated report.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
