import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Loader2,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import client from "../api/client";

type RequestRow = {
  id: number | string;
  request_code?: string;
  service_type?: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  assigned_officer?: string;
  remarks?: string;
};

const DEFAULT_SERVICES = [
  "Land Information Request",
  "Record Correction Request",
  "Ownership Information Request",
  "Registration Status Request",
  "Encumbrance Information Request",
  "Property Tax Information Request",
  "Building Permission Information Request",
  "General Land Query",
];

const SERVICE_META: Record<
  string,
  {
    icon: any;
    color: string;
    soft: string;
    category: string;
    description: string;
  }
> = {
  "Land Information Request": {
    icon: MapPinned,
    color: "#2563eb",
    soft: "#eff6ff",
    category: "Land Records",
    description: "Request connected information about a parcel and its available governance records.",
  },
  "Record Correction Request": {
    icon: FileCheck2,
    color: "#d97706",
    soft: "#fffbeb",
    category: "Land Records",
    description: "Raise a request to review or correct information in a land record.",
  },
  "Ownership Information Request": {
    icon: UserRoundCheck,
    color: "#059669",
    soft: "#ecfdf5",
    category: "Ownership",
    description: "Request available ownership-related information linked to a parcel.",
  },
  "Registration Status Request": {
    icon: FileText,
    color: "#7c3aed",
    soft: "#f5f3ff",
    category: "Registration",
    description: "Track or request information about registration workflow status.",
  },
  "Encumbrance Information Request": {
    icon: ShieldCheck,
    color: "#dc2626",
    soft: "#fef2f2",
    category: "Governance",
    description: "Request available information relating to encumbrance or mortgage status.",
  },
  "Property Tax Information Request": {
    icon: Landmark,
    color: "#0891b2",
    soft: "#ecfeff",
    category: "Tax & Revenue",
    description: "Request available property-tax information associated with a parcel.",
  },
  "Building Permission Information Request": {
    icon: Building2,
    color: "#4f46e5",
    soft: "#eef2ff",
    category: "Planning",
    description: "Request available building-permission or approval information.",
  },
  "General Land Query": {
    icon: HelpCircle,
    color: "#475569",
    soft: "#f8fafc",
    category: "General",
    description: "Submit a general query related to land records or services.",
  },
};

const normalizeService = (service: string) => {
  const exact = SERVICE_META[service];
  if (exact) return exact;

  const value = service.toLowerCase();

  if (value.includes("tax")) {
    return {
      icon: Landmark,
      color: "#0891b2",
      soft: "#ecfeff",
      category: "Tax & Revenue",
      description: "Request available property-tax information associated with a parcel.",
    };
  }

  if (value.includes("registration")) {
    return {
      icon: FileText,
      color: "#7c3aed",
      soft: "#f5f3ff",
      category: "Registration",
      description: "Track or request information about registration workflow status.",
    };
  }

  if (value.includes("ownership")) {
    return {
      icon: UserRoundCheck,
      color: "#059669",
      soft: "#ecfdf5",
      category: "Ownership",
      description: "Request available ownership-related information linked to a parcel.",
    };
  }

  if (value.includes("building")) {
    return {
      icon: Building2,
      color: "#4f46e5",
      soft: "#eef2ff",
      category: "Planning",
      description: "Request available building-permission or approval information.",
    };
  }

  return {
    icon: FileText,
    color: "#2563eb",
    soft: "#eff6ff",
    category: "Land Services",
    description: "Submit and track a digital land governance service request.",
  };
};

function prettyDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function prettyStatus(status?: string) {
  return String(status || "SUBMITTED")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status?: string) {
  const value = String(status || "").toUpperCase();

  if (value === "COMPLETED" || value === "APPROVED") return "done";
  if (value === "REJECTED") return "rejected";
  if (value === "IN_PROGRESS" || value === "UNDER_REVIEW") return "progress";
  return "submitted";
}

function getTimeline(status?: string) {
  const stages = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  const normalized = String(status || "SUBMITTED").toUpperCase();

  if (normalized === "APPROVED") {
    return stages.map((stage) => ({
      stage,
      done: true,
      current: false,
    }));
  }

  if (normalized === "REJECTED") {
    return [
      { stage: "SUBMITTED", done: true, current: false },
      { stage: "UNDER_REVIEW", done: true, current: false },
      { stage: "REJECTED", done: false, current: true },
    ];
  }

  const index = Math.max(stages.indexOf(normalized), 0);

  return stages.map((stage, i) => ({
    stage,
    done: i < index,
    current: i === index,
  }));
}

export default function CitizenServices() {
  const [types, setTypes] = useState<string[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [serviceRes, requestRes] = await Promise.all([
        client.get("/api/services"),
        client.get("/api/services/requests"),
      ]);

      const serviceData = serviceRes.data?.data ?? [];
      const requestData = requestRes.data?.data ?? [];

      const available =
        Array.isArray(serviceData) && serviceData.length
          ? serviceData
          : DEFAULT_SERVICES;

      setTypes(available);
      setServiceType((current) => current || available[0] || "");
      setRequests(Array.isArray(requestData) ? requestData : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Citizen service data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!serviceType || !description.trim()) {
      setError("Please select a service and enter a description.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const res = await client.post("/api/services/requests", {
        service_type: serviceType,
        description: description.trim(),
      });

      const code = res.data?.data?.request_code || "Request created";

      setMessage(`Request submitted successfully • ${code}`);
      setDescription("");
      await load();

      window.setTimeout(() => setMessage(""), 5000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "The service request could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const categories = useMemo(() => {
    const values = types.map((type) => normalizeService(type).category);
    return ["All", ...Array.from(new Set(values))];
  }, [types]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return types.filter((type) => {
      const meta = normalizeService(type);
      const matchesCategory =
        category === "All" || meta.category === category;

      const matchesSearch =
        !query ||
        type.toLowerCase().includes(query) ||
        meta.category.toLowerCase().includes(query) ||
        meta.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [types, search, category]);

  const stats = useMemo(() => {
    const submitted = requests.filter(
      (r) => String(r.status).toUpperCase() === "SUBMITTED"
    ).length;

    const active = requests.filter((r) =>
      ["UNDER_REVIEW", "IN_PROGRESS"].includes(
        String(r.status).toUpperCase()
      )
    ).length;

    const completed = requests.filter((r) =>
      ["COMPLETED", "APPROVED"].includes(String(r.status).toUpperCase())
    ).length;

    return {
      total: requests.length,
      submitted,
      active,
      completed,
    };
  }, [requests]);

  async function selectRequest(request: RequestRow) {
    setSelectedRequest(request);

    try {
      const res = await client.get(
        `/api/services/requests/${request.id}`
      );

      const detail = res.data?.data ?? res.data;

      if (detail && typeof detail === "object") {
        setSelectedRequest({
          ...request,
          ...detail,
        });
      }
    } catch (err) {
      console.warn("Could not load latest request details.", err);
    }
  }
  function chooseService(service: string) {
    setServiceType(service);
    document
      .getElementById("citizen-request-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="citizen-services">
      <div className="cs-topline" />

      <div className="cs-hero">
        <div>
          <div className="cs-eyebrow">
            <ShieldCheck size={15} />
            CITIZEN DIGITAL SERVICES
          </div>

          <h1>
            Land Services,
            <span> simplified.</span>
          </h1>

          <p>
            Submit land-related service requests, receive a request ID and
            track workflow progress from one place.
          </p>

          <div className="cs-hero-pills">
            <span>
              <CheckCircle2 size={14} />
              Digital workflow
            </span>
            <span>
              <Clock3 size={14} />
              Status tracking
            </span>
            <span>
              <ShieldCheck size={14} />
              Secure access
            </span>
          </div>
        </div>

        <div className="cs-hero-art">
          <div className="cs-art-circle cs-art-circle-one" />
          <div className="cs-art-circle cs-art-circle-two" />
          <Landmark size={80} strokeWidth={1.15} />
          <small>LANDSYNC</small>
        </div>
      </div>

      <div className="cs-demo-note">
        <Info size={17} />
        <div>
          <strong>Prototype service environment</strong>
          <span>
            Request workflows shown here are part of the LandSync prototype
            and use demo/synthetic records.
          </span>
        </div>
      </div>

      <div className="cs-stat-grid">
        <div className="cs-stat-card">
          <div className="cs-stat-icon blue">
            <FileText size={19} />
          </div>
          <div>
            <small>Total Requests</small>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="cs-stat-card">
          <div className="cs-stat-icon amber">
            <Clock3 size={19} />
          </div>
          <div>
            <small>Submitted</small>
            <strong>{stats.submitted}</strong>
          </div>
        </div>

        <div className="cs-stat-card">
          <div className="cs-stat-icon violet">
            <RefreshCw size={19} />
          </div>
          <div>
            <small>In Progress</small>
            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="cs-stat-card">
          <div className="cs-stat-icon green">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <small>Completed</small>
            <strong>{stats.completed}</strong>
          </div>
        </div>
      </div>

      {message && (
        <div className="cs-alert success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="cs-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="cs-section-heading">
        <div>
          <span className="cs-mini-label">SERVICE CATALOGUE</span>
          <h2>Choose a land service</h2>
          <p>Find the service that matches your requirement.</p>
        </div>

        <div className="cs-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
          />
        </div>
      </div>

      <div className="cs-category-row">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="cs-service-grid">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div className="cs-service-skeleton" key={i} />
          ))}

        {!loading &&
          filteredServices.map((service) => {
            const meta = normalizeService(service);
            const Icon = meta.icon;

            return (
              <article
                key={service}
                className={`cs-service-card ${
                  service === serviceType ? "selected" : ""
                }`}
                onClick={() => setServiceType(service)}
                style={
                  {
                    "--service-color": meta.color,
                    "--service-soft": meta.soft,
                  } as React.CSSProperties
                }
              >
                <div className="cs-service-top">
                  <div className="cs-service-icon">
                    <Icon size={22} />
                  </div>

                  <span className="cs-service-category">
                    {meta.category}
                  </span>
                </div>

                <h3>{service}</h3>
                <p>{meta.description}</p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseService(service);
                  }}
                >
                  Apply for service
                  <ArrowRight size={16} />
                </button>
              </article>
            );
          })}
      </div>

      {!loading && filteredServices.length === 0 && (
        <div className="cs-empty">
          <Search size={30} />
          <strong>No services found</strong>
          <span>Try another search or category.</span>
        </div>
      )}

      <div className="cs-main-grid">
        <div className="cs-form-card" id="citizen-request-form">
          <div className="cs-card-heading">
            <div>
              <span className="cs-mini-label">NEW REQUEST</span>
              <h2>Submit a service request</h2>
              <p>
                Select a service and describe what you need assistance with.
              </p>
            </div>

            <div className="cs-card-icon">
              <Sparkles size={20} />
            </div>
          </div>

          <form onSubmit={submit}>
            <label>
              Service type
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Request description
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request, parcel reference, record issue or information you need..."
                required
              />
              <small>{description.length}/1000 characters</small>
            </label>

            <div className="cs-form-footer">
              <span>
                <ShieldCheck size={15} />
                Your request will receive a unique request ID.
              </span>

              <button
                className="cs-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="spin" size={17} />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="cs-info-card">
          <div className="cs-info-head">
            <div className="cs-info-icon">
              <UserRoundCheck size={21} />
            </div>
            <div>
              <strong>How it works</strong>
              <span>Simple digital workflow</span>
            </div>
          </div>

          <div className="cs-step">
            <span>01</span>
            <div>
              <strong>Select a service</strong>
              <p>Choose the service from the catalogue above.</p>
            </div>
          </div>

          <div className="cs-step">
            <span>02</span>
            <div>
              <strong>Submit your request</strong>
              <p>Add a clear description of your requirement.</p>
            </div>
          </div>

          <div className="cs-step">
            <span>03</span>
            <div>
              <strong>Receive a request ID</strong>
              <p>Use the generated code to identify your request.</p>
            </div>
          </div>

          <div className="cs-step">
            <span>04</span>
            <div>
              <strong>Track progress</strong>
              <p>Monitor review and completion status below.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cs-request-heading">
        <div>
          <span className="cs-mini-label">MY REQUESTS</span>
          <h2>Request tracking</h2>
          <p>Select any request to view its current workflow stage.</p>
        </div>

        <button
          className="cs-refresh"
          onClick={() => load()}
          title="Refresh requests"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="cs-request-grid">
        <div className="cs-request-list">
          {loading ? (
            <div className="cs-request-loading">
              <Loader2 className="spin" size={24} />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="cs-empty request">
              <FileText size={30} />
              <strong>No requests yet</strong>
              <span>Your submitted service requests will appear here.</span>
            </div>
          ) : (
            requests.map((request) => {
              const meta = normalizeService(
                request.service_type || "Land Service"
              );
              const Icon = meta.icon;
              const active =
                selectedRequest?.id === request.id;

              return (
                <button
                  key={request.id}
                  className={`cs-request-row ${active ? "active" : ""}`}
                  onClick={() => selectRequest(request)}
                >
                  <div
                    className="cs-request-icon"
                    style={
                      {
                        "--request-color": meta.color,
                        "--request-soft": meta.soft,
                      } as React.CSSProperties
                    }
                  >
                    <Icon size={19} />
                  </div>

                  <div className="cs-request-content">
                    <strong>
                      {request.service_type || "Land Service"}
                    </strong>
                    <span>
                      {request.request_code || `Request #${request.id}`}
                    </span>
                  </div>

                  <div className="cs-request-date">
                    <small>{prettyDate(request.created_at)}</small>
                    <span className={`cs-status ${statusClass(request.status)}`}>
                      {prettyStatus(request.status)}
                    </span>
                  </div>

                  <ArrowRight size={17} />
                </button>
              );
            })
          )}
        </div>

        <div className="cs-detail-card">
          {!selectedRequest ? (
            <div className="cs-detail-empty">
              <div>
                <FileText size={29} />
              </div>
              <strong>Select a request</strong>
              <span>
                Click a request on the left to view its details and workflow.
              </span>
            </div>
          ) : (
            <>
              <div className="cs-detail-head">
                <div>
                  <span className="cs-mini-label">REQUEST DETAILS</span>
                  <h3>
                    {selectedRequest.request_code ||
                      `Request #${selectedRequest.id}`}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedRequest(null)}
                  aria-label="Close request"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="cs-detail-service">
                <div className="cs-detail-service-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <strong>
                    {selectedRequest.service_type || "Land Service"}
                  </strong>
                  <span>
                    Submitted {prettyDate(selectedRequest.created_at)}
                  </span>
                </div>
                <span
                  className={`cs-status large ${statusClass(
                    selectedRequest.status
                  )}`}
                >
                  {prettyStatus(selectedRequest.status)}
                </span>
              </div>

              <div className="cs-timeline">
                {getTimeline(selectedRequest.status).map((item, index) => (
                  <div
                    className={`cs-timeline-item ${
                      item.done ? "done" : ""
                    } ${item.current ? "current" : ""}`}
                    key={item.stage}
                  >
                    <div className="cs-timeline-dot">
                      {item.done ? (
                        <CheckCircle2 size={16} />
                      ) : item.current ? (
                        <Clock3 size={16} />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    <div>
                      <strong>{prettyStatus(item.stage)}</strong>
                      <small>
                        {item.done
                          ? "Completed"
                          : item.current
                          ? "Current stage"
                          : "Upcoming"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cs-detail-block">
                <span>Description</span>
                <p>
                  {selectedRequest.description ||
                    "No description was provided for this request."}
                </p>
              </div>

              {(selectedRequest.assigned_officer ||
                selectedRequest.remarks) && (
                <div className="cs-detail-meta">
                  {selectedRequest.assigned_officer && (
                    <div>
                      <small>Assigned officer</small>
                      <strong>{selectedRequest.assigned_officer}</strong>
                    </div>
                  )}

                  {selectedRequest.remarks && (
                    <div>
                      <small>Latest remarks</small>
                      <strong>{selectedRequest.remarks}</strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}


