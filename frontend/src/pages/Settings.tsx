import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { setLanguage } from "../i18n";

function roleStyle(role?: string) {
  const value = String(role || "").toUpperCase();

  if (value === "ADMIN") {
    return {
      bg: "#fef2f2",
      color: "#b91c1c",
      border: "#fecaca",
      icon: "◆",
    };
  }

  if (value === "OFFICER") {
    return {
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
      icon: "●",
    };
  }

  return {
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
    icon: "●",
  };
}

function initials(name?: string) {
  return (
    (name || "LandSync User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "13px 0",
        borderBottom: "1px solid #eef2f7",
        display: "flex",
        justifyContent: "space-between",
        gap: 18,
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 800,
          textAlign: "right",
          fontFamily: mono
            ? "ui-monospace,SFMono-Regular,Menlo,monospace"
            : "inherit",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        boxShadow: "0 10px 28px rgba(15,23,42,.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "17px 19px",
          borderBottom: "1px solid #eef2f7",
          background:
            "linear-gradient(90deg,rgba(255,153,51,.04),rgba(255,255,255,.8),rgba(19,136,8,.04))",
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            marginTop: 4,
            color: "#0f172a",
            fontSize: 16,
            fontWeight: 900,
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ padding: "3px 19px 17px" }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const role = roleStyle(user?.role);

  return (
    <div
      style={{
        minHeight: "100%",
        paddingBottom: 30,
        background:
          "linear-gradient(180deg,rgba(248,250,252,.78),rgba(255,255,255,.98))",
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
            top: -80,
            right: -35,
            width: 230,
            height: 230,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: 120,
            width: 150,
            height: 150,
            borderRadius: "50%",
            border: "25px solid rgba(255,153,51,.13)",
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
            Account • Preferences • Access
          </div>

          <h1
            style={{
              margin: "7px 0 0",
              fontSize: 30,
              lineHeight: 1.1,
              fontWeight: 900,
              letterSpacing: "-.03em",
            }}
          >
            {t("settings.title") || "Settings"}
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              maxWidth: 720,
              color: "#cbd5e1",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Manage your LandSync account information and application
            preferences.
          </p>
        </div>
      </div>

      {/* Profile hero */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          marginBottom: 20,
          padding: 22,
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 28px rgba(15,23,42,.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 5,
            height: "100%",
            background:
              "linear-gradient(180deg,#ff9933 0%,#ffffff 50%,#138808 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 19,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg,#0f172a,#123d35,#14532d)",
                color: "#fff",
                fontSize: 20,
                fontWeight: 900,
                boxShadow: "0 9px 22px rgba(15,23,42,.16)",
              }}
            >
              {initials(user?.name)}
            </div>

            <div>
              <div
                style={{
                  color: "#0f172a",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {user?.name || "LandSync User"}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {user?.email || "No email available"}
              </div>

              <div
                style={{
                  marginTop: 9,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 10px",
                  borderRadius: 999,
                  color: role.color,
                  background: role.bg,
                  border: `1px solid ${role.border}`,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: ".05em",
                }}
              >
                {role.icon} {user?.role || "CITIZEN"}
              </div>
            </div>
          </div>

          <div
            style={{
              minWidth: 190,
              padding: "13px 15px",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              Account access
            </div>

            <div
              style={{
                marginTop: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#047857",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#16a34a",
                  boxShadow: "0 0 0 4px #dcfce7",
                }}
              />
              Authenticated session
            </div>
          </div>
        </div>
      </div>

      {/* Main settings grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.35fr) minmax(320px,.85fr)",
          gap: 18,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <Panel
            eyebrow="Identity"
            title={t("settings.profile") || "Profile Information"}
          >
            <InfoRow label="Full name" value={user?.name} />
            <InfoRow label="Email address" value={user?.email} />
            <InfoRow label="Role" value={user?.role} />
          </Panel>

          <Panel eyebrow="Security" title="Access & Security">
            <div
              style={{
                padding: "15px 0 12px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  Role-based access enabled
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "#64748b",
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                >
                  Your available LandSync modules are controlled by your
                  authenticated role.
                </div>
              </div>
            </div>

            <InfoRow label="Current role" value={user?.role} />
            <InfoRow label="Authentication" value="JWT session" />
            <InfoRow label="Audit tracking" value="Enabled" />
          </Panel>
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Panel
            eyebrow="Localization"
            title={t("settings.language") || "Language & Localization"}
          >
            <div style={{ padding: "15px 0 12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 12,
                    background: "#fff7ed",
                    color: "#ea580c",
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  文
                </div>

                <div>
                  <div
                    style={{
                      color: "#0f172a",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    Interface language
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: "#64748b",
                      fontSize: 11,
                    }}
                  >
                    Choose the language used throughout the interface.
                  </div>
                </div>
              </div>

              <select
                value={i18n.language?.startsWith("hi") ? "hi" : "en"}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 11,
                  border: "1px solid #dbe2ea",
                  background: "#f8fafc",
                  padding: "0 12px",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 800,
                  outline: "none",
                }}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            <div
              style={{
                marginTop: 7,
                padding: "10px 11px",
                borderRadius: 10,
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              Language preference is applied through LandSync's existing
              localization system.
            </div>
          </Panel>

          <Panel eyebrow="LandSync" title="System Information">
            <InfoRow label="Platform" value="LandSync" />
            <InfoRow
              label="System"
              value="Integrated GIS-Based Digital Land Governance System"
            />
            <InfoRow label="Data mode" value="Demo / Synthetic" />
          </Panel>
        </div>
      </div>

      {/* Bottom notice */}
      <div
        style={{
          marginTop: 18,
          padding: "12px 15px",
          borderRadius: 13,
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        <strong>LandSync demo notice:</strong> Profile and system information
        shown here comes from the authenticated application session. Demo data
        must not be treated as official government records.
      </div>
    </div>
  );
}
