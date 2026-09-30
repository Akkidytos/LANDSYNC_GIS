import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RegisterAccess from "./RegisterAccess";
import { LockKeyhole } from "lucide-react";
function Icon({ name }) {
    const common = {
        width: 21,
        height: 21,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.9,
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };
    if (name === "shield")
        return (_jsxs("svg", { ...common, children: [_jsx("path", { d: "M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3z" }), _jsx("path", { d: "M9.5 12l1.7 1.7 3.6-3.8" })] }));
    if (name === "admin")
        return (_jsxs("svg", { ...common, children: [_jsx("circle", { cx: "12", cy: "8", r: "3.2" }), _jsx("path", { d: "M5.5 20c.7-4 2.7-6 6.5-6s5.8 2 6.5 6" })] }));
    if (name === "officer")
        return (_jsxs("svg", { ...common, children: [_jsx("rect", { x: "4", y: "7", width: "16", height: "12", rx: "2" }), _jsx("path", { d: "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" }), _jsx("path", { d: "M4 11h16M10 13h4" })] }));
    if (name === "citizen")
        return (_jsxs("svg", { ...common, children: [_jsx("circle", { cx: "9", cy: "8", r: "3" }), _jsx("circle", { cx: "17", cy: "10", r: "2.5" }), _jsx("path", { d: "M3.8 19c.6-3.6 2.4-5.4 5.2-5.4s4.6 1.8 5.2 5.4" }), _jsx("path", { d: "M14 15c2.7.1 4.4 1.5 5 4" })] }));
    if (name === "user")
        return (_jsxs("svg", { ...common, children: [_jsx("circle", { cx: "12", cy: "8", r: "3.2" }), _jsx("path", { d: "M5.5 20c.7-4 2.7-6 6.5-6s5.8 2 6.5 6" })] }));
    if (name === "lock")
        return (_jsxs("svg", { ...common, children: [_jsx("rect", { x: "5", y: "10", width: "14", height: "10", rx: "2" }), _jsx("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" }), _jsx("path", { d: "M12 14v2" })] }));
    if (name === "eye")
        return (_jsxs("svg", { ...common, children: [_jsx("path", { d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" }), _jsx("circle", { cx: "12", cy: "12", r: "2.5" })] }));
    if (name === "eyeOff")
        return (_jsxs("svg", { ...common, children: [_jsx("path", { d: "M3 3l18 18" }), _jsx("path", { d: "M10.6 6.3A8.7 8.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.5" }), _jsx("path", { d: "M6.2 6.8C3.7 8.2 2.5 12 2.5 12s3.5 6 9.5 6a8.8 8.8 0 0 0 3-.5" })] }));
    return (_jsxs("svg", { ...common, children: [_jsx("path", { d: "M5 12h13" }), _jsx("path", { d: "M13 6l6 6-6 6" })] }));
}
export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [lang, setLang] = useState("en");
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
    async function submit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email.includes("@") ? email : `${email}@landsync.local`, password);
            navigate("/dashboard");
        }
        catch {
            setError(hi
                ? "लॉगिन विवरण सही नहीं हैं। कृपया दोबारा प्रयास करें।"
                : "Invalid login details. Please check your credentials.");
        }
        finally {
            setLoading(false);
        }
    }
    const roles = [
        {
            id: "admin",
            title: t.admin,
            subtitle: t.adminSub,
            icon: "admin",
        },
        {
            id: "officer",
            title: t.officer,
            subtitle: t.officerSub,
            icon: "officer",
        },
        {
            id: "citizen",
            title: t.citizen,
            subtitle: t.citizenSub,
            icon: "citizen",
        },
    ];
    function selectRole(id) {
        setRole(id);
        localStorage.removeItem("landsync_prefill_username");
        localStorage.removeItem("landsync_prefill_password");
        if (id === "admin")
            setEmail("admin@landsync.demo");
        if (id === "officer")
            setEmail("officer@landsync.demo");
        if (id === "citizen")
            setEmail("citizen@landsync.demo");
    }
    return (_jsxs("div", { className: "ls-login", children: [_jsxs("div", { className: "ls-tricolor", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsx("div", { className: "ls-login-bg", children: _jsx("div", { className: "ls-grid" }) }), _jsxs("main", { className: "ls-login-content", children: [_jsxs("section", { className: "ls-brand-panel", children: [_jsxs("div", { className: "ls-emblem-wrap", children: [_jsx("img", { src: "/tig5.png", alt: "Government emblem", className: "ls-emblem" }), _jsx("div", { className: "ls-satyamev", children: "\u0938\u0924\u094D\u092F\u092E\u0947\u0935 \u091C\u092F\u0924\u0947" })] }), _jsxs("div", { className: "ls-brand-line", children: [_jsx("i", {}), _jsx("span", { children: "GOVERNMENT OF INDIA" }), _jsx("i", {})] }), _jsxs("h1", { children: ["LAND", _jsx("span", { children: "SYNC" })] }), _jsx("p", { className: "ls-brand-subtitle", children: hi
                                    ? "पारदर्शी भूमि शासन के लिए डिजिटल इंडिया"
                                    : "Digital India for Transparent Land Governance" }), _jsxs("div", { className: "ls-brand-features", children: [_jsxs("div", { children: [_jsx("b", { className: "ls-field-icon", children: _jsx(LockKeyhole, { size: 19, strokeWidth: 2.1 }) }), _jsxs("span", { children: [_jsx("strong", { children: hi ? "सुरक्षित रिकॉर्ड" : "Secure Records" }), hi
                                                        ? "पारदर्शी और छेड़छाड़-रोधी भूमि रिकॉर्ड"
                                                        : "Tamper-proof and transparent land records"] })] }), _jsxs("div", { children: [_jsx("b", { children: "\u25C9" }), _jsxs("span", { children: [_jsx("strong", { children: hi ? "नागरिक केंद्रित" : "Citizen Centric" }), hi
                                                        ? "सभी हितधारकों के लिए आसान पहुँच"
                                                        : "Easy access for all stakeholders"] })] }), _jsxs("div", { children: [_jsx("b", { children: "\u25B0" }), _jsxs("span", { children: [_jsx("strong", { children: hi ? "डिजिटल शासन" : "Digital Governance" }), hi
                                                        ? "कुशल, पारदर्शी और जवाबदेह"
                                                        : "Efficient, transparent and accountable"] })] })] }), _jsxs("div", { className: "ls-demo-badge", children: [_jsx("span", { className: "ls-live-dot" }), hi ? "लाइव डेमो वातावरण" : "LIVE DEMO ENVIRONMENT", _jsx("i", {}), hi ? "डिजिटल भारत के लिए" : "BUILDING A DIGITAL INDIA"] })] }), _jsx("section", { className: "ls-login-panel", children: _jsxs("div", { className: "ls-login-card", children: [_jsxs("div", { className: "ls-card-top", children: [_jsxs("div", { className: "ls-secure", children: [_jsx("span", { children: _jsx(Icon, { name: "shield" }) }), _jsxs("div", { children: [_jsx("b", { children: t.secure }), _jsx("small", { children: t.secureSub })] })] }), _jsxs("button", { type: "button", className: "ls-language", onClick: () => setLang(lang === "en" ? "hi" : "en"), children: ["\u25CE ", hi ? "हिंदी" : "English", "\u2304"] })] }), _jsxs("div", { className: "ls-mini-tricolor", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsxs("div", { className: "ls-heading", children: [_jsx("span", { children: "LANDSYNC PORTAL" }), _jsxs("h2", { children: [hi ? "अपनी" : "Choose ", _jsx("strong", { children: hi ? "भूमिका चुनें" : "your role" })] }), _jsx("p", { children: t.continue })] }), _jsx("div", { className: "ls-role-grid", children: roles.map((item) => (_jsxs("button", { type: "button", className: `ls-role ${role === item.id ? "selected" : ""}`, onClick: () => selectRole(item.id), children: [_jsx("span", { className: "ls-role-radio", children: role === item.id ? "●" : "" }), _jsx("span", { className: "ls-role-icon", children: _jsx(Icon, { name: item.icon }) }), _jsxs("span", { className: "ls-role-text", children: [_jsx("strong", { children: item.title }), _jsx("small", { children: item.subtitle })] })] }, item.id))) }), _jsxs("div", { className: "ls-selected-role", children: [_jsx("span", { children: t.selected }), _jsx("strong", { children: role === "admin"
                                                ? t.admin
                                                : role === "officer"
                                                    ? t.officer
                                                    : t.citizen })] }), _jsxs("form", { className: "ls-form", onSubmit: submit, children: [_jsxs("label", { children: [_jsx("span", { children: t.username }), _jsxs("div", { className: "ls-input", children: [_jsx("span", { className: "ls-input-icon", children: _jsx(Icon, { name: "user" }) }), _jsx("input", { value: email, onChange: (e) => setEmail(e.target.value), placeholder: t.usernamePlaceholder, type: "text", autoComplete: "username" })] })] }), _jsxs("label", { children: [_jsx("span", { children: t.password }), _jsxs("div", { className: "ls-input", children: [_jsx("span", { className: "ls-input-icon", children: _jsx(Icon, { name: "lock" }) }), _jsx("input", { value: password, onChange: (e) => setPassword(e.target.value), placeholder: t.passwordPlaceholder, type: showPassword ? "text" : "password", autoComplete: "current-password" }), _jsx("button", { type: "button", className: "ls-password-toggle", "aria-label": showPassword
                                                                ? "Hide password"
                                                                : "Show password", onClick: () => setShowPassword((current) => !current), children: _jsx(Icon, { name: showPassword
                                                                    ? "eyeOff"
                                                                    : "eye" }) })] })] }), error && (_jsxs("div", { className: "ls-error", children: [_jsx("b", { children: "!" }), error] })), _jsxs("button", { type: "submit", className: "ls-submit", disabled: loading, children: [_jsx("span", { children: loading
                                                        ? hi
                                                            ? "लॉगिन हो रहा है..."
                                                            : "Signing in..."
                                                        : t.login }), _jsx("b", { children: _jsx(Icon, { name: "arrow" }) })] })] }), createAccountInfo && (_jsxs("div", { className: "ls-create-info", children: [createAccountInfo, _jsx("button", { type: "button", onClick: () => setCreateAccountInfo(""), children: "\u00D7" })] })), _jsx(RegisterAccess, {}), _jsxs("div", { className: "ls-demo", children: [_jsxs("div", { children: [_jsx("span", { className: "ls-demo-icon", children: "i" }), _jsx("strong", { children: t.demoTitle })] }), _jsxs("p", { children: [t.demoText, _jsx("span", { className: "ls-demo-divider", children: "|" }), _jsx("b", { children: t.passwordText })] })] }), _jsxs("div", { className: "ls-footer", children: [_jsx("span", { children: hi ? "भारत सरकार" : "Government of India" }), _jsx("i", {}), _jsx("span", { children: hi
                                                ? "भूमि अभिलेख आधुनिकीकरण"
                                                : "Land Records Modernization" }), _jsx("i", {}), _jsx("span", { children: hi ? "डिजिटल भारत" : "Digital India" })] })] }) })] })] }));
}
