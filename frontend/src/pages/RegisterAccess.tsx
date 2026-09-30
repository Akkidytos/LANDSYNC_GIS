type Role = "ADMIN" | "OFFICER" | "CITIZEN";

import { useState } from "react";
import {
  ShieldCheck,
  Landmark,
  UsersRound,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  UserPlus
} from "lucide-react";
import "./create-account.css";

const roles = {
  ADMIN: {
    title: "Administrator",
    subtitle: "System management & control",
    icon: ShieldCheck,
    accent: "admin"
  },
  OFFICER: {
    title: "Officer",
    subtitle: "Land records & verification",
    icon: Landmark,
    accent: "officer"
  },
  CITIZEN: {
    title: "Citizen",
    subtitle: "Land information & services",
    icon: UsersRound,
    accent: "citizen"
  }
};

export default function RegisterAccess() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"role" | "form">("role");

  const [role, setRole] = useState<Role>("CITIZEN");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedRole = roles[role];
  const SelectedIcon = selectedRole.icon;

  function reset() {
    setStep("role");
    setRole("CITIZEN");
    setName("");
    setUsername("");
    setPassword("");
    setConfirm("");
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowConfirm(false);
    setLoading(false);
  }

  function close() {
    if (loading) return;
    setOpen(false);
    reset();
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(cleanUsername)) {
      setError(
        "Username must be 3–30 characters and may contain letters, numbers, dot, underscore or hyphen."
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: cleanName,
            username: cleanUsername,
            password,
            role
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
          data?.detail ||
          "Unable to create account."
        );
      }

      /*
       * Keep the new username/password ready for the existing
       * login screen. Username stays a real username in the UI;
       * the Login component converts it to the internal email
       * identity when authenticating.
       */
      localStorage.setItem(
        "landsync_prefill_username",
        cleanUsername
      );

      localStorage.setItem(
        "landsync_prefill_password",
        password
      );

      localStorage.setItem(
        "landsync_prefill_role",
        role
      );

      setSuccess(
        `Account created successfully as ${selectedRole.title}.`
      );

      setTimeout(() => {
        setOpen(false);
        reset();
        window.location.reload();
      }, 900);

    } catch (err: any) {
      setError(
        err?.message ||
        "Unable to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* CREATE ACCOUNT ENTRY */}
      <button
        type="button"
        className="ls-register-entry"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <span className="ls-register-entry-icon">
          <UserPlus size={19} strokeWidth={2.1} />
        </span>

        <span className="ls-register-entry-copy">
          <strong>New to LandSync?</strong>
          <small>Create your account and choose your role</small>
        </span>

        <span className="ls-register-entry-arrow">
          <ArrowRight size={16} />
        </span>
      </button>

      {/* REGISTER MODAL */}
      {open && (
        <div
          className="ls-register-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="ls-register-modal">

            <div className="ls-register-modal-top">

              <div className="ls-register-brand">
                <span>LANDSYNC ACCOUNT</span>
                <h2>Create Account</h2>
                <p>
                  {step === "role"
                    ? "Choose how you will use the LandSync portal."
                    : `Create your ${selectedRole.title} account.`}
                </p>
              </div>

              <button
                type="button"
                className="ls-register-close"
                onClick={close}
              >
                <X size={19} />
              </button>

            </div>

            <div className="ls-register-progress">
              <span className="active" />
              <span className={step === "form" ? "active" : ""} />
            </div>

            {step === "role" ? (
              <div className="ls-register-role-screen">

                <div className="ls-register-section-title">
                  <div className="ls-register-number">01</div>

                  <div>
                    <strong>Choose your role</strong>
                    <small>Select one role to continue</small>
                  </div>
                </div>

                <div className="ls-register-role-grid">

                  {Object.keys(roles).map((id) => {
                    const item = roles[id];
                    const Icon = item.icon;

                    return (
                      <button
                        type="button"
                        key={id}
                        className={`ls-register-role-card ${item.accent} ${
                          role === id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setRole(id as Role);
                          setError("");
                        }}
                      >

                        <div className="ls-register-role-icon">
                          <Icon
                            size={25}
                            strokeWidth={2.1}
                          />
                        </div>

                        <strong>{item.title}</strong>

                        <small>{item.subtitle}</small>

                        <span className="ls-register-selected-check">
                          {role === id && (
                            <CheckCircle2 size={18} />
                          )}
                        </span>

                      </button>
                    );
                  })}

                </div>

                <button
                  type="button"
                  className="ls-register-continue"
                  onClick={() => {
                    setError("");
                    setStep("form");
                  }}
                >
                  Continue as {selectedRole.title}
                  <ArrowRight size={18} />
                </button>

              </div>
            ) : (
              <form
                className="ls-register-form"
                onSubmit={createAccount}
              >

                <div className={`ls-register-role-summary ${selectedRole.accent}`}>

                  <div className="ls-register-summary-icon">
                    <SelectedIcon size={19} />
                  </div>

                  <div>
                    <small>Creating account as</small>
                    <strong>{selectedRole.title}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("role")}
                  >
                    Change
                  </button>

                </div>

                <label>
                  Full Name

                  <div className="ls-register-input">
                    <UserRound size={18} />

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder="Enter your full name"
                      autoFocus
                    />
                  </div>
                </label>

                <label>
                  Username

                  <div className="ls-register-input">
                    <UserPlus size={18} />

                    <input
                      value={username}
                      onChange={(e) =>
                        setUsername(
                          e.target.value
                        )
                      }
                      placeholder="Choose a username"
                      autoComplete="username"
                    />
                  </div>

                  <small className="ls-register-hint">
                    Example: aakarshit123
                  </small>
                </label>

                <label>
                  Password

                  <div className="ls-register-input">
                    <LockKeyhole size={18} />

                    <input
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Create your password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="ls-register-eye"
                      onClick={() =>
                        setShowPassword(
                          (v) => !v
                        )
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  Confirm Password

                  <div className="ls-register-input">
                    <LockKeyhole size={18} />

                    <input
                      value={confirm}
                      onChange={(e) =>
                        setConfirm(
                          e.target.value
                        )
                      }
                      type={
                        showConfirm
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="ls-register-eye"
                      onClick={() =>
                        setShowConfirm(
                          (v) => !v
                        )
                      }
                    >
                      {showConfirm ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="ls-register-error">
                    <span>!</span>
                    <div>{error}</div>
                  </div>
                )}

                {success && (
                  <div className="ls-register-success">
                    <CheckCircle2 size={17} />
                    {success}
                  </div>
                )}

                <div className="ls-register-actions">

                  <button
                    type="button"
                    className="ls-register-back"
                    onClick={() =>
                      setStep("role")
                    }
                    disabled={loading}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    type="submit"
                    className="ls-register-submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Creating account..."
                      : "Create Account"}

                    {!loading && (
                      <ArrowRight size={17} />
                    )}
                  </button>

                </div>

              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}






