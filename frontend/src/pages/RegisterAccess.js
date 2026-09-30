import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { ShieldCheck, Landmark, UsersRound, UserRound, LockKeyhole, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, X, UserPlus } from "lucide-react";
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
    const [step, setStep] = useState("role");
    const [role, setRole] = useState("CITIZEN");
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
        if (loading)
            return;
        setOpen(false);
        reset();
    }
    async function createAccount(e) {
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
            setError("Username must be 3â€“30 characters and may contain letters, numbers, dot, underscore or hyphen.");
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/auth/register`, {
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
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.detail?.message ||
                    data?.detail ||
                    "Unable to create account.");
            }
            /*
             * Keep the new username/password ready for the existing
             * login screen. Username stays a real username in the UI;
             * the Login component converts it to the internal email
             * identity when authenticating.
             */
            localStorage.setItem("landsync_prefill_username", cleanUsername);
            localStorage.setItem("landsync_prefill_password", password);
            localStorage.setItem("landsync_prefill_role", role);
            setSuccess(`Account created successfully as ${selectedRole.title}.`);
            setTimeout(() => {
                setOpen(false);
                reset();
                window.location.reload();
            }, 900);
        }
        catch (err) {
            setError(err?.message ||
                "Unable to create account. Please try again.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "ls-register-entry", onClick: () => {
                    reset();
                    setOpen(true);
                }, children: [_jsx("span", { className: "ls-register-entry-icon", children: _jsx(UserPlus, { size: 19, strokeWidth: 2.1 }) }), _jsxs("span", { className: "ls-register-entry-copy", children: [_jsx("strong", { children: "New to LandSync?" }), _jsx("small", { children: "Create your account and choose your role" })] }), _jsx("span", { className: "ls-register-entry-arrow", children: _jsx(ArrowRight, { size: 16 }) })] }), open && (_jsx("div", { className: "ls-register-overlay", onMouseDown: (e) => {
                    if (e.target === e.currentTarget)
                        close();
                }, children: _jsxs("div", { className: "ls-register-modal", children: [_jsxs("div", { className: "ls-register-modal-top", children: [_jsxs("div", { className: "ls-register-brand", children: [_jsx("span", { children: "LANDSYNC ACCOUNT" }), _jsx("h2", { children: "Create Account" }), _jsx("p", { children: step === "role"
                                                ? "Choose how you will use the LandSync portal."
                                                : `Create your ${selectedRole.title} account.` })] }), _jsx("button", { type: "button", className: "ls-register-close", onClick: close, children: _jsx(X, { size: 19 }) })] }), _jsxs("div", { className: "ls-register-progress", children: [_jsx("span", { className: "active" }), _jsx("span", { className: step === "form" ? "active" : "" })] }), step === "role" ? (_jsxs("div", { className: "ls-register-role-screen", children: [_jsxs("div", { className: "ls-register-section-title", children: [_jsx("div", { className: "ls-register-number", children: "01" }), _jsxs("div", { children: [_jsx("strong", { children: "Choose your role" }), _jsx("small", { children: "Select one role to continue" })] })] }), _jsx("div", { className: "ls-register-role-grid", children: Object.keys(roles).map((id) => {
                                        const item = roles[id];
                                        const Icon = item.icon;
                                        return (_jsxs("button", { type: "button", className: `ls-register-role-card ${item.accent} ${role === id ? "selected" : ""}`, onClick: () => {
                                                setRole(id);
                                                setError("");
                                            }, children: [_jsx("div", { className: "ls-register-role-icon", children: _jsx(Icon, { size: 25, strokeWidth: 2.1 }) }), _jsx("strong", { children: item.title }), _jsx("small", { children: item.subtitle }), _jsx("span", { className: "ls-register-selected-check", children: role === id && (_jsx(CheckCircle2, { size: 18 })) })] }, id));
                                    }) }), _jsxs("button", { type: "button", className: "ls-register-continue", onClick: () => {
                                        setError("");
                                        setStep("form");
                                    }, children: ["Continue as ", selectedRole.title, _jsx(ArrowRight, { size: 18 })] })] })) : (_jsxs("form", { className: "ls-register-form", onSubmit: createAccount, children: [_jsxs("div", { className: `ls-register-role-summary ${selectedRole.accent}`, children: [_jsx("div", { className: "ls-register-summary-icon", children: _jsx(SelectedIcon, { size: 19 }) }), _jsxs("div", { children: [_jsx("small", { children: "Creating account as" }), _jsx("strong", { children: selectedRole.title })] }), _jsx("button", { type: "button", onClick: () => setStep("role"), children: "Change" })] }), _jsxs("label", { children: ["Full Name", _jsxs("div", { className: "ls-register-input", children: [_jsx(UserRound, { size: 18 }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "Enter your full name", autoFocus: true })] })] }), _jsxs("label", { children: ["Username", _jsxs("div", { className: "ls-register-input", children: [_jsx(UserPlus, { size: 18 }), _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Choose a username", autoComplete: "username" })] }), _jsx("small", { className: "ls-register-hint", children: "Example: aakarshit123" })] }), _jsxs("label", { children: ["Password", _jsxs("div", { className: "ls-register-input", children: [_jsx(LockKeyhole, { size: 18 }), _jsx("input", { value: password, onChange: (e) => setPassword(e.target.value), type: showPassword
                                                        ? "text"
                                                        : "password", placeholder: "Create your password", autoComplete: "new-password" }), _jsx("button", { type: "button", className: "ls-register-eye", onClick: () => setShowPassword((v) => !v), children: showPassword ? (_jsx(EyeOff, { size: 17 })) : (_jsx(Eye, { size: 17 })) })] })] }), _jsxs("label", { children: ["Confirm Password", _jsxs("div", { className: "ls-register-input", children: [_jsx(LockKeyhole, { size: 18 }), _jsx("input", { value: confirm, onChange: (e) => setConfirm(e.target.value), type: showConfirm
                                                        ? "text"
                                                        : "password", placeholder: "Confirm your password", autoComplete: "new-password" }), _jsx("button", { type: "button", className: "ls-register-eye", onClick: () => setShowConfirm((v) => !v), children: showConfirm ? (_jsx(EyeOff, { size: 17 })) : (_jsx(Eye, { size: 17 })) })] })] }), error && (_jsxs("div", { className: "ls-register-error", children: [_jsx("span", { children: "!" }), _jsx("div", { children: error })] })), success && (_jsxs("div", { className: "ls-register-success", children: [_jsx(CheckCircle2, { size: 17 }), success] })), _jsxs("div", { className: "ls-register-actions", children: [_jsxs("button", { type: "button", className: "ls-register-back", onClick: () => setStep("role"), disabled: loading, children: [_jsx(ArrowLeft, { size: 16 }), "Back"] }), _jsxs("button", { type: "submit", className: "ls-register-submit", disabled: loading, children: [loading
                                                    ? "Creating account..."
                                                    : "Create Account", !loading && (_jsx(ArrowRight, { size: 17 }))] })] })] }))] }) }))] }));
}

