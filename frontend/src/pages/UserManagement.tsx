import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";

type UserRow = {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  phone?: string;
  department?: string;
  associated_parcels?: number;
};

const roleMeta: Record<string, { bg: string; color: string; icon: string }> = {
  ADMIN: { bg: "#fef2f2", color: "#b91c1c", icon: "◆" },
  OFFICER: { bg: "#eff6ff", color: "#1d4ed8", icon: "●" },
  CITIZEN: { bg: "#ecfdf5", color: "#047857", icon: "●" },
};

function getRoleMeta(role?: string) {
  return (
    roleMeta[String(role || "").toUpperCase()] || {
      bg: "#f8fafc",
      color: "#475569",
      icon: "●",
    }
  );
}

function Avatar({ name, role }: { name?: string; role?: string }) {
  const initials =
    (name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "U";

  const meta = getRoleMeta(role);

  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        fontWeight: 900,
        fontSize: 13,
        color: meta.color,
        background: `linear-gradient(135deg,${meta.bg},#ffffff)`,
        border: `1px solid ${meta.bg}`,
        boxShadow: "0 5px 14px rgba(15,23,42,.08)",
      }}
    >
      {initials}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number;
  icon: string;
  accent: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        padding: 18,
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 25px rgba(15,23,42,.06)",
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: ".09em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 7,
              color: "#0f172a",
              fontSize: 27,
              fontWeight: 900,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: `${accent}15`,
            color: accent,
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { t } = useTranslation();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState<number | string | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CITIZEN",
    phone: "",
    department: "",
  });

  async function load() {
    try {
      setLoading(true);
      setError("");
      const r = await client.get("/api/users");
      const data = r?.data?.data ?? [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Users load failed:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "CITIZEN",
      phone: "",
      department: "",
    });
    setShowPassword(false);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await client.post("/api/users", form);

      setShowForm(false);
      resetForm();
      await load();
    } catch (err: any) {
      console.error("Create user failed:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          "Failed to create user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: UserRow) {
    const active = String(u.status || "").toUpperCase() === "ACTIVE";
    const nextStatus = active ? "INACTIVE" : "ACTIVE";

    const confirmed = window.confirm(
      `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} ${
        u.name || u.email || "this user"
      }?`
    );

    if (!confirmed) return;

    try {
      setChangingStatus(u.id);
      setError("");

      await client.put(`/api/users/${u.id}`, {
        status: nextStatus,
      });

      await load();
    } catch (err: any) {
      console.error("User status update failed:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          "Failed to update user status."
      );
    } finally {
      setChangingStatus(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        [u.name, u.email, u.role, u.status, u.phone, u.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesRole =
        roleFilter === "ALL" ||
        String(u.role || "").toUpperCase() === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        String(u.status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(
      (u) => String(u.status || "").toUpperCase() === "ACTIVE"
    ).length;
    const admins = users.filter(
      (u) => String(u.role || "").toUpperCase() === "ADMIN"
    ).length;
    const officers = users.filter(
      (u) => String(u.role || "").toUpperCase() === "OFFICER"
    ).length;
    const citizens = users.filter(
      (u) => String(u.role || "").toUpperCase() === "CITIZEN"
    ).length;

    return { total, active, admins, officers, citizens };
  }, [users]);

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
          padding: "25px 26px",
          marginBottom: 20,
          color: "#fff",
          background:
            "linear-gradient(135deg,#0f172a 0%,#123d35 50%,#14532d 100%)",
          boxShadow: "0 14px 35px rgba(15,23,42,.17)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -75,
            right: -30,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -90,
            right: 110,
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "26px solid rgba(255,153,51,.13)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              color: "#86efac",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: ".16em",
              textTransform: "uppercase",
            }}
          >
            Identity • Roles • Access
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
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
                  lineHeight: 1.1,
                  fontWeight: 900,
                  letterSpacing: "-.03em",
                }}
              >
                {t("users.title") || "User Management"}
              </h1>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#cbd5e1",
                  maxWidth: 680,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Manage LandSync users, operational roles, access status and
                associated parcel responsibilities.
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                border: "0",
                borderRadius: 11,
                padding: "11px 17px",
                background:
                  "linear-gradient(135deg,#ff9933,#f97316)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(249,115,22,.25)",
              }}
            >
              + {t("users.createUser") || "Create User"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 18,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 14,
            padding: "12px 15px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard title="Total users" value={stats.total} icon="◎" accent="#2563eb" />
        <StatCard title="Active users" value={stats.active} icon="✓" accent="#138808" />
        <StatCard title="Administrators" value={stats.admins} icon="◆" accent="#dc2626" />
        <StatCard title="Officers" value={stats.officers} icon="●" accent="#f59e0b" />
        <StatCard title="Citizens" value={stats.citizens} icon="○" accent="#7c3aed" />
      </div>

      {/* Filters */}
      <div
        style={{
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,.05)",
          padding: 15,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(250px,1fr) 170px 170px auto",
            gap: 10,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role, phone..."
            style={{
              height: 42,
              boxSizing: "border-box",
              width: "100%",
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              padding: "0 13px",
              outline: "none",
              fontSize: 13,
            }}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: 42,
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              padding: "0 11px",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="OFFICER">Officer</option>
            <option value="CITIZEN">Citizen</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 42,
              borderRadius: 11,
              border: "1px solid #dbe2ea",
              background: "#f8fafc",
              padding: "0 11px",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
            }}
            style={{
              height: 42,
              borderRadius: 11,
              padding: "0 14px",
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
            fontSize: 12,
            color: "#64748b",
            fontWeight: 700,
          }}
        >
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Table */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 18px",
            borderBottom: "1px solid #eef2f7",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              Registered Users
            </div>
            <div
              style={{
                marginTop: 3,
                color: "#64748b",
                fontSize: 12,
              }}
            >
              Role-based access and account status
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              border: "1px solid #dbe2ea",
              background: "#fff",
              color: "#475569",
              borderRadius: 10,
              padding: "8px 11px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: 52,
              textAlign: "center",
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div
            style={{
              padding: 55,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: 34 }}>◎</div>
            <div
              style={{
                marginTop: 7,
                fontWeight: 900,
                color: "#334155",
              }}
            >
              No users found
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              Adjust the search or filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 920,
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
                    "User",
                    "Contact",
                    "Role",
                    "Status",
                    "Parcels",
                    "Actions",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        textAlign: "left",
                        padding: "13px 14px",
                        borderBottom: "1px solid #e5e7eb",
                        color: "#64748b",
                        fontSize: 10,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => {
                  const meta = getRoleMeta(u.role);
                  const active =
                    String(u.status || "").toUpperCase() === "ACTIVE";

                  return (
                    <tr
                      key={u.id}
                      style={{
                        transition: "background .18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                      }}
                    >
                      <td
                        style={{
                          padding: "14px",
                          borderBottom: "1px solid #eef2f7",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                          }}
                        >
                          <Avatar name={u.name} role={u.role} />
                          <div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontWeight: 900,
                                fontSize: 13,
                              }}
                            >
                              {u.name || "Unnamed User"}
                            </div>
                            <div
                              style={{
                                marginTop: 3,
                                color: "#94a3b8",
                                fontSize: 11,
                              }}
                            >
                              ID #{u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom: "1px solid #eef2f7",
                        }}
                      >
                        <div
                          style={{
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {u.email || "—"}
                        </div>
                        {u.phone && (
                          <div
                            style={{
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 11,
                            }}
                          >
                            {u.phone}
                          </div>
                        )}
                        {u.department && (
                          <div
                            style={{
                              marginTop: 3,
                              color: "#94a3b8",
                              fontSize: 10,
                            }}
                          >
                            {u.department}
                          </div>
                        )}
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
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 999,
                            padding: "6px 9px",
                            background: meta.bg,
                            color: meta.color,
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: ".04em",
                          }}
                        >
                          {meta.icon} {u.role || "UNKNOWN"}
                        </span>
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
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 999,
                            padding: "6px 9px",
                            background: active ? "#ecfdf5" : "#fef2f2",
                            color: active ? "#047857" : "#b91c1c",
                            fontSize: 10,
                            fontWeight: 900,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: active ? "#16a34a" : "#dc2626",
                            }}
                          />
                          {u.status || "UNKNOWN"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom: "1px solid #eef2f7",
                          color: "#334155",
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
                        {u.associated_parcels ?? 0}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom: "1px solid #eef2f7",
                        }}
                      >
                        <button
                          disabled={changingStatus === u.id}
                          onClick={() => toggleStatus(u)}
                          style={{
                            borderRadius: 10,
                            padding: "8px 11px",
                            border: active
                              ? "1px solid #fecaca"
                              : "1px solid #bbf7d0",
                            background: active ? "#fff7f7" : "#f0fdf4",
                            color: active ? "#b91c1c" : "#166534",
                            fontSize: 11,
                            fontWeight: 900,
                            cursor:
                              changingStatus === u.id
                                ? "wait"
                                : "pointer",
                          }}
                        >
                          {changingStatus === u.id
                            ? "Updating..."
                            : active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div
          onClick={() => {
            if (!saving) {
              setShowForm(false);
              resetForm();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(15,23,42,.55)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(620px,100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 22,
              background: "#fff",
              boxShadow: "0 30px 80px rgba(15,23,42,.28)",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                color: "#fff",
                background:
                  "linear-gradient(135deg,#0f172a,#123d35,#14532d)",
                borderRadius: "22px 22px 0 0",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: ".13em",
                  fontWeight: 900,
                  color: "#86efac",
                  textTransform: "uppercase",
                }}
              >
                Identity Management
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                Create New User
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                Add a LandSync account with a controlled operational role.
              </div>
            </div>

            <form onSubmit={submit} style={{ padding: 22 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    FULL NAME
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                    placeholder="Enter full name"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 6,
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #dbe2ea",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                    placeholder="name@example.com"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 6,
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #dbe2ea",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    ROLE
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 6,
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #dbe2ea",
                      background: "#fff",
                    }}
                  >
                    <option value="CITIZEN">Citizen</option>
                    <option value="OFFICER">Officer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    PHONE
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 6,
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #dbe2ea",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    DEPARTMENT
                  </label>
                  <input
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 6,
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #dbe2ea",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 900, color: "#475569" }}>
                    PASSWORD
                  </label>

                  <div style={{ position: "relative", marginTop: 6 }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                      placeholder="Create password"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: 42,
                        padding: "0 72px 0 12px",
                        borderRadius: 10,
                        border: "1px solid #dbe2ea",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: 7,
                        top: 6,
                        height: 30,
                        border: "0",
                        borderRadius: 8,
                        background: "#f1f5f9",
                        color: "#475569",
                        fontSize: 10,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 15,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{
                    height: 42,
                    padding: "0 15px",
                    borderRadius: 10,
                    border: "1px solid #dbe2ea",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t("registry.cancel") || "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    height: 42,
                    padding: "0 17px",
                    borderRadius: 10,
                    border: "0",
                    background:
                      "linear-gradient(135deg,#138808,#166534)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: saving ? "wait" : "pointer",
                  }}
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
