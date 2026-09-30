import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";

type AuditEvent = {
  id?: number | string;
  timestamp?: string;
  ts?: string;
  user_email?: string;
  user?: string;
  action?: string;
  entity?: string;
  entity_type?: string;
  entity_id?: number | string;
  details?: unknown;
  previous_hash?: string;
  prev_hash?: string;
  current_hash?: string;
  hash?: string;
};

function safeDetails(value: unknown) {
  if (value === null || value === undefined || value === "") return "No additional details";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function shortHash(value?: string) {
  if (!value) return "—";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

function actionTone(action = "") {
  const a = action.toUpperCase();

  if (a.includes("DELETE") || a.includes("REJECT")) {
    return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
  }

  if (a.includes("CREATE") || a.includes("APPROVE") || a.includes("LOGIN")) {
    return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  }

  if (a.includes("UPDATE") || a.includes("ASSIGN") || a.includes("GENERATE")) {
    return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" };
  }

  if (a.includes("EXPORT") || a.includes("LOGOUT")) {
    return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  }

  return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
}

function StatCard({
  title,
  value,
  accent,
  icon,
}: {
  title: string;
  value: string | number;
  accent: string;
  icon: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        padding: "18px 20px",
        background: "linear-gradient(145deg,#ffffff,#f8fafc)",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 24px rgba(15,23,42,.07)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 5,
          height: "100%",
          background: accent,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".09em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 27,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: `${accent}18`,
            color: accent,
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AuditTrail() {
  const { t } = useTranslation();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  async function load(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      setError("");

      const r = await client.get("/api/audit?page=1&page_size=200");
      const payload = r?.data?.data ?? r?.data ?? {};
      const items = Array.isArray(payload) ? payload : payload?.items ?? [];

      setEvents(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.error("Audit load failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load audit trail."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function verify() {
    try {
      setVerifying(true);
      setVerifyResult(null);
      setError("");

      const r = await client.get("/api/audit/verify");
      const payload = r?.data?.data ?? r?.data ?? {};

      setVerifyResult({
        ...payload,
        valid:
          typeof payload === "boolean"
            ? payload
            : Boolean(payload?.valid),
      });
    } catch (err: any) {
      console.error("Audit verification failed:", err);
      setVerifyResult({
        valid: false,
        message:
          err?.response?.data?.detail ||
          err?.message ||
          "Audit chain verification failed.",
      });
    } finally {
      setVerifying(false);
    }
  }

  const actionOptions = useMemo(() => {
    const set = new Set(
      events
        .map((e) => e.action)
        .filter(Boolean)
        .map((x) => String(x).toUpperCase())
    );

    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter((e) => {
      const text = [
        e.id,
        e.timestamp,
        e.ts,
        e.user_email,
        e.user,
        e.action,
        e.entity,
        e.entity_type,
        e.entity_id,
        safeDetails(e.details),
        e.previous_hash,
        e.prev_hash,
        e.current_hash,
        e.hash,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesAction =
        actionFilter === "ALL" ||
        String(e.action || "").toUpperCase() === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [events, search, actionFilter]);

  const uniqueUsers = new Set(
    events.map((e) => e.user_email || e.user).filter(Boolean)
  ).size;

  const createUpdateCount = events.filter((e) => {
    const a = String(e.action || "").toUpperCase();
    return a.includes("CREATE") || a.includes("UPDATE");
  }).length;

  const latest = events[0];

  return (
    <div
      style={{
        minHeight: "100%",
        paddingBottom: 28,
        background:
          "linear-gradient(180deg,rgba(248,250,252,.75),rgba(255,255,255,.98))",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 22,
          padding: "24px 26px",
          marginBottom: 20,
          color: "#fff",
          background:
            "linear-gradient(135deg,#0f172a 0%,#123d35 48%,#14532d 100%)",
          boxShadow: "0 14px 35px rgba(15,23,42,.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -50,
            top: -70,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,.07)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: 110,
            bottom: -100,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: "28px solid rgba(255,153,51,.14)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: ".16em",
              color: "#86efac",
              textTransform: "uppercase",
            }}
          >
            Trust • Integrity • Governance
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 18,
              flexWrap: "wrap",
              marginTop: 7,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: "-.03em",
                }}
              >
                {t("audit.title") || "Audit Trail"}
              </h1>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#cbd5e1",
                  maxWidth: 730,
                  lineHeight: 1.5,
                  fontSize: 14,
                }}
              >
                Immutable-style activity history with chained hash verification
                for LandSync governance actions.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => load(false)}
                disabled={refreshing}
                style={{
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "rgba(255,255,255,.1)",
                  color: "#fff",
                  borderRadius: 11,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: refreshing ? "wait" : "pointer",
                  backdropFilter: "blur(8px)",
                }}
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>

              <button
                onClick={verify}
                disabled={verifying}
                style={{
                  border: "0",
                  background: "linear-gradient(135deg,#ff9933,#f97316)",
                  color: "#fff",
                  borderRadius: 11,
                  padding: "10px 16px",
                  fontWeight: 900,
                  cursor: verifying ? "wait" : "pointer",
                  boxShadow: "0 7px 18px rgba(249,115,22,.25)",
                }}
              >
                {verifying ? "Verifying..." : "✓ Verify Audit Chain"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification */}
      {verifyResult && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            borderRadius: 16,
            border: `1px solid ${
              verifyResult.valid ? "#86efac" : "#fca5a5"
            }`,
            background: verifyResult.valid
              ? "linear-gradient(135deg,#f0fdf4,#dcfce7)"
              : "linear-gradient(135deg,#fef2f2,#fee2e2)",
            color: verifyResult.valid ? "#166534" : "#991b1b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>
              {verifyResult.valid
                ? "✓ Audit chain verified successfully"
                : "✕ Audit chain integrity check failed"}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              {verifyResult.message ||
                (verifyResult.valid
                  ? "The backend verification endpoint reports a valid chain."
                  : "The backend reported an invalid or unverifiable chain.")}
            </div>
          </div>

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,.7)",
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            SHA-256 Chain
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 15px",
            borderRadius: 13,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard
          title="Total events"
          value={events.length}
          accent="#ff9933"
          icon="◉"
        />
        <StatCard
          title="Unique users"
          value={uniqueUsers}
          accent="#12805c"
          icon="◎"
        />
        <StatCard
          title="Create / update"
          value={createUpdateCount}
          accent="#2563eb"
          icon="✦"
        />
        <StatCard
          title="Latest action"
          value={latest?.action || "—"}
          accent="#7c3aed"
          icon="↳"
        />
      </div>

      {/* Filters */}
      <div
        style={{
          padding: 16,
          marginBottom: 18,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,.05)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(240px,1fr) 210px auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, action, entity, ID, details or hash..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 42,
              padding: "0 14px",
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              outline: "none",
              fontSize: 13,
            }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              height: 42,
              padding: "0 12px",
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              fontSize: 13,
              fontWeight: 700,
              color: "#334155",
            }}
          >
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action === "ALL" ? "All actions" : action}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch("");
              setActionFilter("ALL");
            }}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#fff",
              color: "#475569",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        <div
          style={{
            marginTop: 9,
            color: "#64748b",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Audit table */}
      <div
        style={{
          overflow: "hidden",
          borderRadius: 20,
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 32px rgba(15,23,42,.07)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #eef2f7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Audit Events
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Every row represents an action returned by the LandSync audit API.
            </div>
          </div>

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: ".05em",
            }}
          >
            HASH CHAIN ENABLED
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: 50,
              textAlign: "center",
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            Loading audit events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div
            style={{
              padding: 55,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: 34 }}>⌁</div>
            <div
              style={{
                marginTop: 8,
                fontWeight: 900,
                color: "#334155",
              }}
            >
              No audit events found
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              Try another search or reset the filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 1120,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(90deg,#fff7ed,#f8fafc,#ecfdf5)",
                  }}
                >
                  {[
                    "Timestamp",
                    "User",
                    "Action",
                    "Entity",
                    "Entity ID",
                    "Hash Chain",
                    "Details",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "13px 14px",
                        textAlign: "left",
                        fontSize: 10,
                        letterSpacing: ".09em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredEvents.map((e, index) => {
                  const id = e.id ?? `${index}-${e.timestamp}`;
                  const expanded = expandedId === id;
                  const tone = actionTone(e.action);
                  const prev = e.previous_hash || e.prev_hash;
                  const current = e.current_hash || e.hash;
                  const timestamp = e.timestamp || e.ts;

                  return (
                    <>
                      <tr
                        key={id}
                        onClick={() =>
                          setExpandedId(expanded ? null : id)
                        }
                        style={{
                          cursor: "pointer",
                          background: expanded ? "#f8fafc" : "#fff",
                          transition: "background .18s ease",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            color: "#334155",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {timestamp
                            ? new Date(timestamp).toLocaleString()
                            : "—"}
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {e.user_email || e.user || "System"}
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "5px 9px",
                              borderRadius: 999,
                              background: tone.bg,
                              color: tone.text,
                              border: `1px solid ${tone.border}`,
                              fontSize: 10,
                              fontWeight: 900,
                              letterSpacing: ".04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {e.action || "UNKNOWN"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.entity || e.entity_type || "—"}
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            fontSize: 12,
                            color: "#475569",
                            fontFamily:
                              "ui-monospace,SFMono-Regular,Menlo,monospace",
                          }}
                        >
                          {e.entity_id ?? "—"}
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            minWidth: 220,
                          }}
                        >
                          <div
                            style={{
                              fontFamily:
                                "ui-monospace,SFMono-Regular,Menlo,monospace",
                              fontSize: 10,
                              color: "#64748b",
                            }}
                          >
                            PREV
                          </div>
                          <div
                            style={{
                              fontFamily:
                                "ui-monospace,SFMono-Regular,Menlo,monospace",
                              fontSize: 11,
                              color: "#475569",
                              marginTop: 2,
                            }}
                          >
                            {shortHash(prev)}
                          </div>

                          <div
                            style={{
                              marginTop: 7,
                              fontFamily:
                                "ui-monospace,SFMono-Regular,Menlo,monospace",
                              fontSize: 10,
                              color: "#047857",
                              fontWeight: 800,
                            }}
                          >
                            CURRENT
                          </div>
                          <div
                            style={{
                              fontFamily:
                                "ui-monospace,SFMono-Regular,Menlo,monospace",
                              fontSize: 11,
                              color: "#065f46",
                              marginTop: 2,
                            }}
                          >
                            {shortHash(current)}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            borderBottom: "1px solid #eef2f7",
                            maxWidth: 340,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: expanded
                                  ? "normal"
                                  : "nowrap",
                                color: "#475569",
                                fontSize: 12,
                                lineHeight: 1.5,
                                flex: 1,
                              }}
                            >
                              {safeDetails(e.details)}
                            </div>

                            <span
                              style={{
                                color: "#64748b",
                                fontSize: 15,
                                fontWeight: 900,
                              }}
                            >
                              {expanded ? "⌃" : "⌄"}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr key={`${id}-details`}>
                          <td
                            colSpan={7}
                            style={{
                              padding: 0,
                              borderBottom: "1px solid #e5e7eb",
                              background: "#f8fafc",
                            }}
                          >
                            <div
                              style={{
                                padding: "18px 20px 20px",
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit,minmax(260px,1fr))",
                                gap: 14,
                              }}
                            >
                              <div
                                style={{
                                  padding: 15,
                                  borderRadius: 14,
                                  background: "#fff",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    color: "#64748b",
                                    letterSpacing: ".08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Previous Hash
                                </div>

                                <code
                                  style={{
                                    display: "block",
                                    marginTop: 8,
                                    wordBreak: "break-all",
                                    color: "#475569",
                                    fontSize: 11,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {prev || "Genesis / not available"}
                                </code>
                              </div>

                              <div
                                style={{
                                  padding: 15,
                                  borderRadius: 14,
                                  background: "#ecfdf5",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    color: "#047857",
                                    letterSpacing: ".08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Current Hash
                                </div>

                                <code
                                  style={{
                                    display: "block",
                                    marginTop: 8,
                                    wordBreak: "break-all",
                                    color: "#065f46",
                                    fontSize: 11,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {current || "Not available"}
                                </code>
                              </div>

                              <div
                                style={{
                                  padding: 15,
                                  borderRadius: 14,
                                  background: "#fff",
                                  border: "1px solid #e2e8f0",
                                  gridColumn: "1 / -1",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    color: "#64748b",
                                    letterSpacing: ".08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Full Event Details
                                </div>

                                <pre
                                  style={{
                                    margin: "9px 0 0",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    color: "#334155",
                                    fontSize: 12,
                                    lineHeight: 1.65,
                                    fontFamily:
                                      "ui-monospace,SFMono-Regular,Menlo,monospace",
                                  }}
                                >
                                  {safeDetails(e.details)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer notice */}
      <div
        style={{
          marginTop: 16,
          padding: "11px 14px",
          borderRadius: 12,
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        <strong>LandSync demo notice:</strong> Audit information shown here is
        generated from the application audit API. Demo/synthetic records must
        not be treated as official government records.
      </div>
    </div>
  );
}
