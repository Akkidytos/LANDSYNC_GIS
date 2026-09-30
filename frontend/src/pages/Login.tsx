import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RegisterAccess from "./RegisterAccess";
import { ShieldCheck, Landmark, UsersRound, UserRound, LockKeyhole, Eye, EyeOff, UserPlus, ArrowRight } from "lucide-react";

type IconName =
  | "shield"
  | "admin"
  | "officer"
  | "citizen"
  | "user"
  | "lock"
  | "eye"
  | "eyeOff"
  | "arrow";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3z" />
        <path d="M9.5 12l1.7 1.7 3.6-3.8" />
      </svg>
    );

  if (name === "admin")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.7-4 2.7-6 6.5-6s5.8 2 6.5 6" />
      </svg>
    );

  if (name === "officer")
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="12" rx="2" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
        <path d="M4 11h16M10 13h4" />
      </svg>
    );

  if (name === "citizen")
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3.8 19c.6-3.6 2.4-5.4 5.2-5.4s4.6 1.8 5.2 5.4" />
        <path d="M14 15c2.7.1 4.4 1.5 5 4" />
      </svg>
    );

  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.7-4 2.7-6 6.5-6s5.8 2 6.5 6" />
      </svg>
    );

  if (name === "lock")
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v2" />
      </svg>
    );

  if (name === "eye")
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );

  if (name === "eyeOff")
    return (
      <svg {...common}>
        <path d="M3 3l18 18" />
        <path d="M10.6 6.3A8.7 8.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.5" />
        <path d="M6.2 6.8C3.7 8.2 2.5 12 2.5 12s3.5 6 9.5 6a8.8 8.8 0 0 0 3-.5" />
      </svg>
    );

  return (
    <svg {...common}>
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [lang, setLang] = useState<"en" | "hi">("en");
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState(() => localStorage.getItem("landsync_prefill_username") || "admin@landsync.demo");
  const [password, setPassword] = useState(() => localStorage.getItem("landsync_prefill_password") || "Demo@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createAccountInfo, setCreateAccountInfo] = useState("");

  const hi = lang === "hi";

  const t = {
    secure: hi ? "सुरक्षित लॉगिन" : "SECURE LOGIN",
    secureSub: hi ? "आपका डेटा सुरक्षित है" : "Your data is protected",

    choose: hi ? "अपनी भूमिका चुनें" : "Choose your role",
    continue: hi
      ? "जारी रखने के लिए अपनी भूमिका चुनें"
      : "Select your role to continue",

    admin: hi ? "प्रशासक" : "Administrator",
    officer: hi ? "अधिकारी" : "Officer",
    citizen: hi ? "नागरिक" : "Citizen",

    adminSub: hi ? "सिस्टम प्रबंधन और नियंत्रण" : "System management and control",
    officerSub: hi
      ? "भूमि रिकॉर्ड का प्रबंधन और सत्यापन"
      : "Land record management and verification",
    citizenSub: hi
      ? "अपनी भूमि जानकारी और सेवाएँ देखें"
      : "View land information and services",

    selected: hi ? "चयनित भूमिका" : "Selected role",

    username: hi ? "उपयोगकर्ता नाम" : "Username",
    password: hi ? "पासवर्ड" : "Password",

    usernamePlaceholder: hi
      ? "अपना उपयोगकर्ता नाम दर्ज करें"
      : "Enter your username",

    passwordPlaceholder: hi
      ? "अपना पासवर्ड दर्ज करें"
      : "Enter your password",

    login: hi ? "लॉगिन करें" : "Sign in securely",

    demoTitle: hi ? "डेमो क्रेडेंशियल्स" : "DEMO CREDENTIALS",
    demoText: hi
      ? "प्रशासक: admin  •  अधिकारी: officer  •  नागरिक: citizen"
      : "Administrator: admin  •  Officer: officer  •  Citizen: citizen",

    passwordText: hi ? "पासवर्ड: password" : "Password: password",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.includes("@") ? email : `${email}@landsync.local`, password);
      navigate("/dashboard");
    } catch {
      setError(
        hi
          ? "लॉगिन विवरण सही नहीं हैं। कृपया दोबारा प्रयास करें।"
          : "Invalid login details. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    {
      id: "admin",
      title: t.admin,
      subtitle: t.adminSub,
      icon: "admin" as IconName,
    },
    {
      id: "officer",
      title: t.officer,
      subtitle: t.officerSub,
      icon: "officer" as IconName,
    },
    {
      id: "citizen",
      title: t.citizen,
      subtitle: t.citizenSub,
      icon: "citizen" as IconName,
    },
  ];

  function selectRole(id: string) {
    setRole(id);
                    localStorage.removeItem("landsync_prefill_username");
                    localStorage.removeItem("landsync_prefill_password");

    if (id === "admin") setEmail("admin@landsync.demo");
    if (id === "officer") setEmail("officer@landsync.demo");
    if (id === "citizen") setEmail("citizen@landsync.demo");
  }

  return (
    <div className="ls-login">
      <div className="ls-tricolor">
        <span />
        <span />
        <span />
      </div>

      <div className="ls-login-bg">
        <div className="ls-grid" />
      </div>

      <main className="ls-login-content">

        {/* LEFT */}
        <section className="ls-brand-panel">

          <div className="ls-emblem-wrap">
            <img
              src="/tig5.png"
              alt="Government emblem"
              className="ls-emblem"
            />
            <div className="ls-satyamev">सत्यमेव जयते</div>
          </div>

          <div className="ls-brand-line">
            <i />
            <span>GOVERNMENT OF INDIA</span>
            <i />
          </div>

          <h1>
            LAND<span>SYNC</span>
          </h1>

          <p className="ls-brand-subtitle">
            {hi
              ? "पारदर्शी भूमि शासन के लिए डिजिटल इंडिया"
              : "Digital India for Transparent Land Governance"}
          </p>

          <div className="ls-brand-features">
            <div>
              <b className="ls-field-icon"><LockKeyhole size={19} strokeWidth={2.1} /></b>
              <span>
                <strong>{hi ? "सुरक्षित रिकॉर्ड" : "Secure Records"}</strong>
                {hi
                  ? "पारदर्शी और छेड़छाड़-रोधी भूमि रिकॉर्ड"
                  : "Tamper-proof and transparent land records"}
              </span>
            </div>

            <div>
              <b>◉</b>
              <span>
                <strong>{hi ? "नागरिक केंद्रित" : "Citizen Centric"}</strong>
                {hi
                  ? "सभी हितधारकों के लिए आसान पहुँच"
                  : "Easy access for all stakeholders"}
              </span>
            </div>

            <div>
              <b>▰</b>
              <span>
                <strong>{hi ? "डिजिटल शासन" : "Digital Governance"}</strong>
                {hi
                  ? "कुशल, पारदर्शी और जवाबदेह"
                  : "Efficient, transparent and accountable"}
              </span>
            </div>
          </div>

          <div className="ls-demo-badge">
            <span className="ls-live-dot" />
            {hi ? "लाइव डेमो वातावरण" : "LIVE DEMO ENVIRONMENT"}
            <i />
            {hi ? "डिजिटल भारत के लिए" : "BUILDING A DIGITAL INDIA"}
          </div>

        </section>

        {/* RIGHT */}
        <section className="ls-login-panel">
          <div className="ls-login-card">

            <div className="ls-card-top">

              <div className="ls-secure">
                <span>
                  <Icon name="shield" />
                </span>

                <div>
                  <b>{t.secure}</b>
                  <small>{t.secureSub}</small>
                </div>
              </div>

              <button
                type="button"
                className="ls-language"
                onClick={() => setLang(lang === "en" ? "hi" : "en")}
              >
                ◎ {hi ? "हिंदी" : "English"}⌄
              </button>

            </div>

            <div className="ls-mini-tricolor">
              <span />
              <span />
              <span />
            </div>

            <div className="ls-heading">
              <span>LANDSYNC PORTAL</span>

              <h2>
                {hi ? "अपनी" : "Choose "}
                <strong>{hi ? "भूमिका चुनें" : "your role"}</strong>
              </h2>

              <p>{t.continue}</p>
            </div>

            <div className="ls-role-grid">

              {roles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`ls-role ${
                    role === item.id ? "selected" : ""
                  }`}
                  onClick={() => selectRole(item.id)}
                >

                  <span className="ls-role-radio">
                    {role === item.id ? "●" : ""}
                  </span>

                  <span className="ls-role-icon">
                    <Icon name={item.icon} />
                  </span>

                  <span className="ls-role-text">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>

                </button>
              ))}

            </div>

            <div className="ls-selected-role">
              <span>{t.selected}</span>

              <strong>
                {role === "admin"
                  ? t.admin
                  : role === "officer"
                  ? t.officer
                  : t.citizen}
              </strong>
            </div>

            <form className="ls-form" onSubmit={submit}>

              <label>
                <span>{t.username}</span>

                <div className="ls-input">
                  <span className="ls-input-icon">
                    <Icon name="user" />
                  </span>

                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.usernamePlaceholder}
                    type="text"
                    autoComplete="username"
                  />
                </div>
              </label>

              <label>
                <span>{t.password}</span>

                <div className="ls-input">
                  <span className="ls-input-icon">
                    <Icon name="lock" />
                  </span>

                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="ls-password-toggle"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                  >
                    <Icon
                      name={
                        showPassword
                          ? "eyeOff"
                          : "eye"
                      }
                    />
                  </button>
                </div>
              </label>

              {error && (
                <div className="ls-error">
                  <b>!</b>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="ls-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? hi
                      ? "लॉगिन हो रहा है..."
                      : "Signing in..."
                    : t.login}
                </span>

                <b>
                  <Icon name="arrow" />
                </b>
              </button>

            </form>{createAccountInfo && (
              <div className="ls-create-info">
                {createAccountInfo}
                <button
                  type="button"
                  onClick={() => setCreateAccountInfo("")}
                >
                  ×
                </button>
              </div>
            )}
<RegisterAccess />

            <div className="ls-demo">
              <div>
                <span className="ls-demo-icon">i</span>
                <strong>{t.demoTitle}</strong>
              </div>

              <p>
                {t.demoText}
                <span className="ls-demo-divider">|</span>
                <b>{t.passwordText}</b>
              </p>
            </div>

            <div className="ls-footer">
              <span>{hi ? "भारत सरकार" : "Government of India"}</span>
              <i />
              <span>
                {hi
                  ? "भूमि अभिलेख आधुनिकीकरण"
                  : "Land Records Modernization"}
              </span>
              <i />
              <span>{hi ? "डिजिटल भारत" : "Digital India"}</span>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}






