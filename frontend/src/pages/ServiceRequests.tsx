import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

type RequestRow = {
  id: string | number;
  request_code?: string;
  service_type?: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  assigned_officer_id?: string | null;
  assigned_officer?: string;
  remarks?: string;
  history?: any[];
  request_history?: any[];
};

const STATUS_FLOW = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "APPROVED",
  "COMPLETED",
];

function statusLabel(value?: string) {
  return String(value || "SUBMITTED")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(value?: string) {
  const s = String(value || "").toUpperCase();

  if (s === "COMPLETED" || s === "APPROVED") return "done";
  if (s === "REJECTED") return "rejected";
  if (s === "UNDER_REVIEW" || s === "IN_PROGRESS") return "progress";
  return "submitted";
}

function dateText(value?: string) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPayload(value: any) {
  return value?.data?.data ?? value?.data ?? value ?? {};
}

export default function ServiceRequests() {
  const { user } = useAuth();

  const isStaff =
    user?.role === "ADMIN" || user?.role === "OFFICER";

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [editStatus, setEditStatus] = useState("SUBMITTED");
  const [remarks, setRemarks] = useState("");
  const [officerId, setOfficerId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRequests(selectFirst = false) {
    try {
      setLoading(true);
      setError("");

      const res = await client.get("/api/services/requests");
      const data = getPayload(res);

      const rows = Array.isArray(data) ? data : [];
      setRequests(rows);

      if (selectFirst && rows.length > 0) {
        await openRequest(rows[0]);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Service requests could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function openRequest(request: RequestRow) {
    setSelected(request);
    setEditStatus(request.status || "SUBMITTED");
    setRemarks(request.remarks || "");
    setOfficerId(request.assigned_officer_id || "");

    try {
      setDetailLoading(true);

      const res = await client.get(
        `/api/services/requests/${request.id}`
      );

      const detail = getPayload(res);

      if (detail && typeof detail === "object") {
        const merged = { ...request, ...detail };
        setSelected(merged);
        setEditStatus(merged.status || "SUBMITTED");
        setRemarks(merged.remarks || "");
        setOfficerId(merged.assigned_officer_id || "");
      }
    } catch (err) {
      console.warn("Request detail could not be loaded.", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveUpdate() {
    if (!selected) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const body: {
        status: string;
        remarks: string;
        assigned_officer_id?: string | null;
      } = {
        status: editStatus,
        remarks: remarks.trim(),
      };

      if (officerId.trim()) {
        body.assigned_officer_id = officerId.trim();
      } else {
        body.assigned_officer_id = null;
      }

      const res = await client.put(
        `/api/services/requests/${selected.id}`,
        body
      );

      const updated = getPayload(res);

      setSelected((prev) => ({
        ...(prev || {}),
        ...(updated || {}),
        status: editStatus,
        remarks: remarks.trim(),
        assigned_officer_id: officerId.trim() || null,
      }));

      setMessage("Request updated successfully.");
      await loadRequests();

      const refreshed = await client.get(
        `/api/services/requests/${selected.id}`
      );

      const detail = getPayload(refreshed);

      if (detail && typeof detail === "object") {
        setSelected(detail);
        setEditStatus(detail.status || editStatus);
        setRemarks(detail.remarks || "");
        setOfficerId(detail.assigned_officer_id || "");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Request could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  function assignToMe() {
    if (!user?.id) return;

    setOfficerId(String(user.id));
    setMessage("Your user ID has been selected for assignment.");
    window.setTimeout(() => setMessage(""), 2500);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        String(request.status || "").toUpperCase() === statusFilter;

      const text = [
        request.request_code,
        request.service_type,
        request.description,
        request.assigned_officer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!q || text.includes(q));
    });
  }, [requests, query, statusFilter]);

  const counts = useMemo(() => {
    const value = {
      all: requests.length,
      submitted: 0,
      review: 0,
      progress: 0,
      completed: 0,
      rejected: 0,
    };

    requests.forEach((request) => {
      const s = String(request.status || "").toUpperCase();

      if (s === "SUBMITTED") value.submitted++;
      else if (s === "UNDER_REVIEW") value.review++;
      else if (s === "IN_PROGRESS") value.progress++;
      else if (s === "COMPLETED" || s === "APPROVED") value.completed++;
      else if (s === "REJECTED") value.rejected++;
    });

    return value;
  }, [requests]);

  const currentStatusIndex = Math.max(
    STATUS_FLOW.indexOf(editStatus),
    0
  );

  const history =
    selected?.history ||
    selected?.request_history ||
    [];

  return (
    <section className="sr-page">
      <div className="sr-accent" />

      <div className="sr-hero">
        <div>
          <div className="sr-eyebrow">
            <ShieldCheck size={15} />
            SERVICE REQUEST MANAGEMENT
          </div>

          <h1>
            {isStaff ? "Citizen Request Desk" : "My Service Requests"}
          </h1>

          <p>
            {isStaff
              ? "Review citizen requests, assign responsibility, update workflow status and record remarks."
              : "Track the progress of your submitted land-service requests."}
          </p>
        </div>

        <div className="sr-hero-icon">
          <MessageSquareText size={48} strokeWidth={1.3} />
        </div>
      </div>

      {message && (
        <div className="sr-alert success">
          <CheckCircle2 size={17} />
          <span>{message}</span>
          <button onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="sr-alert error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="sr-stats">
        <div className="sr-stat">
          <div className="sr-stat-icon blue">
            <FileText size={18} />
          </div>
          <span>Total Requests</span>
          <strong>{counts.all}</strong>
        </div>

        <div className="sr-stat">
          <div className="sr-stat-icon amber">
            <Clock3 size={18} />
          </div>
          <span>Submitted</span>
          <strong>{counts.submitted}</strong>
        </div>

        <div className="sr-stat">
          <div className="sr-stat-icon violet">
            <RefreshCw size={18} />
          </div>
          <span>In Progress</span>
          <strong>{counts.progress + counts.review}</strong>
        </div>

        <div className="sr-stat">
          <div className="sr-stat-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span>Completed</span>
          <strong>{counts.completed}</strong>
        </div>

        <div className="sr-stat">
          <div className="sr-stat-icon red">
            <AlertCircle size={18} />
          </div>
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </div>
      </div>

      <div className="sr-toolbar">
        <div className="sr-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search request ID, service or description..."
          />
        </div>

        <div className="sr-filter">
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <button
          className="sr-refresh"
          onClick={() => loadRequests()}
          title="Refresh"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="sr-layout">
        <div className="sr-list-card">
          <div className="sr-list-head">
            <div>
              <span>REQUEST INBOX</span>
              <strong>{filtered.length} requests</strong>
            </div>

            <div className="sr-live">
              <i />
              Live data
            </div>
          </div>

          {loading ? (
            <div className="sr-loading">
              <Loader2 className="sr-spin" size={25} />
              Loading requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="sr-empty">
              <FileText size={30} />
              <strong>No requests found</strong>
              <span>Try changing your search or status filter.</span>
            </div>
          ) : (
            <div className="sr-list">
              {filtered.map((request) => {
                const active = selected?.id === request.id;

                return (
                  <button
                    key={request.id}
                    className={`sr-row ${active ? "active" : ""}`}
                    onClick={() => openRequest(request)}
                  >
                    <div className="sr-row-icon">
                      <FileText size={18} />
                    </div>

                    <div className="sr-row-main">
                      <strong>
                        {request.service_type || "Land Service"}
                      </strong>
                      <span>
                        {request.request_code ||
                          `Request #${request.id}`}
                      </span>
                      <small>
                        Submitted {dateText(request.created_at)}
                      </small>
                    </div>

                    <span
                      className={`sr-status ${statusTone(
                        request.status
                      )}`}
                    >
                      {statusLabel(request.status)}
                    </span>

                    <ArrowRight size={16} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sr-detail-card">
          {!selected ? (
            <div className="sr-select-empty">
              <div>
                <MessageSquareText size={30} />
              </div>
              <strong>Select a request</strong>
              <span>
                Choose a request from the inbox to inspect its complete
                workflow.
              </span>
            </div>
          ) : (
            <>
              <div className="sr-detail-head">
                <div>
                  <span>REQUEST DETAILS</span>
                  <h2>
                    {selected.request_code ||
                      `Request #${selected.id}`}
                  </h2>
                </div>

                <button onClick={() => setSelected(null)}>
                  <X size={17} />
                </button>
              </div>

              {detailLoading ? (
                <div className="sr-detail-loading">
                  <Loader2 className="sr-spin" size={22} />
                  Loading details...
                </div>
              ) : (
                <>
                  <div className="sr-summary">
                    <div className="sr-summary-icon">
                      <FileText size={20} />
                    </div>

                    <div>
                      <strong>
                        {selected.service_type || "Land Service"}
                      </strong>
                      <span>
                        Submitted {dateText(selected.created_at)}
                      </span>
                    </div>

                    <span
                      className={`sr-status large ${statusTone(
                        selected.status
                      )}`}
                    >
                      {statusLabel(selected.status)}
                    </span>
                  </div>

                  <div className="sr-timeline">
                    {STATUS_FLOW.map((stage, index) => {
                      const done =
                        index < currentStatusIndex ||
                        editStatus === "COMPLETED" ||
                        editStatus === "APPROVED";

                      const current =
                        stage === editStatus;

                      return (
                        <div
                          key={stage}
                          className={`sr-time ${
                            done ? "done" : ""
                          } ${current ? "current" : ""}`}
                        >
                          <div className="sr-time-dot">
                            {done ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              index + 1
                            )}
                          </div>

                          <span>{statusLabel(stage)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="sr-info-box">
                    <span>Description</span>
                    <p>
                      {selected.description ||
                        "No description provided."}
                    </p>
                  </div>

                  {isStaff ? (
                    <div className="sr-admin-panel">
                      <div className="sr-panel-title">
                        <div>
                          <span>OFFICER WORKFLOW</span>
                          <strong>Process this request</strong>
                        </div>
                        <ShieldCheck size={19} />
                      </div>

                      <label>
                        Status
                        <select
                          value={editStatus}
                          onChange={(e) =>
                            setEditStatus(e.target.value)
                          }
                        >
                          <option value="SUBMITTED">
                            Submitted
                          </option>
                          <option value="UNDER_REVIEW">
                            Under Review
                          </option>
                          <option value="IN_PROGRESS">
                            In Progress
                          </option>
                          <option value="APPROVED">
                            Approved
                          </option>
                          <option value="REJECTED">
                            Rejected
                          </option>
                          <option value="COMPLETED">
                            Completed
                          </option>
                        </select>
                      </label>

                      <label>
                        Assigned Officer ID
                        <div className="sr-assignment">
                          <input
                            value={officerId}
                            onChange={(e) =>
                              setOfficerId(e.target.value)
                            }
                            placeholder="Officer user ID"
                          />

                          <button
                            type="button"
                            onClick={assignToMe}
                          >
                            <UserCheck size={15} />
                            Assign to me
                          </button>
                        </div>
                      </label>

                      <label>
                        Remarks
                        <textarea
                          rows={4}
                          value={remarks}
                          onChange={(e) =>
                            setRemarks(e.target.value)
                          }
                          placeholder="Add review notes, action taken, missing documents or next steps..."
                        />
                      </label>

                      <button
                        className="sr-save"
                        onClick={saveUpdate}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2
                              size={17}
                              className="sr-spin"
                            />
                            Saving...
                          </>
                        ) : (
                          <>
                            Update Request
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="sr-citizen-note">
                      <ShieldCheck size={18} />
                      <div>
                        <strong>Request under LandSync workflow</strong>
                        <span>
                          Status shown above reflects the latest
                          available backend record.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="sr-meta-grid">
                    <div>
                      <span>Created</span>
                      <strong>{dateText(selected.created_at)}</strong>
                    </div>

                    <div>
                      <span>Last Updated</span>
                      <strong>{dateText(selected.updated_at)}</strong>
                    </div>

                    <div>
                      <span>Assigned Officer</span>
                      <strong>
                        {selected.assigned_officer ||
                          selected.assigned_officer_id ||
                          "Not assigned"}
                      </strong>
                    </div>
                  </div>

                  {history.length > 0 && (
                    <div className="sr-history">
                      <div className="sr-history-title">
                        <Clock3 size={17} />
                        Request History
                      </div>

                      {history.map((item: any, index: number) => (
                        <div
                          className="sr-history-row"
                          key={item.id || index}
                        >
                          <span>
                            {item.created_at ||
                              item.timestamp ||
                              item.ts ||
                              "—"}
                          </span>

                          <strong>
                            {item.status ||
                              item.action ||
                              "Updated"}
                          </strong>

                          <p>
                            {item.remarks ||
                              item.details ||
                              ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
