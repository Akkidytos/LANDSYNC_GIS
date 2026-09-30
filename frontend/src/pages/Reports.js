import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ChevronRight, Download, FileJson, FileSpreadsheet, FileText, Filter, Loader2, MapPinned, Search, ShieldCheck, Sparkles, XCircle, } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
function payload(value) {
    return value?.data?.data ?? value?.data ?? value ?? {};
}
function downloadBlob(blob, filename) {
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
    const [parcels, setParcels] = useState([]);
    const [query, setQuery] = useState("");
    const [landUse, setLandUse] = useState("ALL");
    const [selectedId, setSelectedId] = useState("");
    const [reportType, setReportType] = useState("Detailed Land Parcel Report");
    const [format, setFormat] = useState("pdf");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [users, setUsers] = useState([]);
    const [reportUserId, setReportUserId] = useState("");
    async function load() {
        try {
            setLoading(true);
            const res = await client.get("/api/parcels?page=1&page_size=1000");
            const data = payload(res);
            const rows = data?.items ??
                data?.data ??
                (Array.isArray(data) ? data : []);
            setParcels(Array.isArray(rows) ? rows : []);
            if (user?.role === "ADMIN" || user?.role === "OFFICER") {
                const userRes = await client.get("/api/users");
                const userData = payload(userRes);
                const userRows = userData?.items ??
                    userData?.data ??
                    (Array.isArray(userData) ? userData : []);
                setUsers(Array.isArray(userRows) ? userRows : []);
            }
            if (user?.id && !reportUserId) {
                setReportUserId(String(user.id));
            }
        }
        catch (err) {
            setError(err?.response?.data?.detail ||
                "Report data could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (user)
            load();
    }, [user]);
    const landUses = useMemo(() => {
        const values = parcels
            .map((p) => p.land_use)
            .filter(Boolean);
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
            const matchesLandUse = landUse === "ALL" || p.land_use === landUse;
            return matchesSearch && matchesLandUse;
        });
    }, [parcels, query, landUse]);
    const selected = filtered.find((p) => String(p.id) === selectedId) ||
        parcels.find((p) => String(p.id) === selectedId) ||
        null;
    async function generate(scope) {
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
            const response = await client.get(`/api/reports-premium/${format}?${params.toString()}`, {
                responseType: "blob",
            });
            let filename = "LandSync_Report";
            if (scope === "selected") {
                filename = "LandSync_Parcel_Dossier";
            }
            const ext = format === "pdf" ? "pdf" : format;
            filename += `.${ext}`;
            downloadBlob(response.data, filename);
            setMessage(scope === "selected"
                ? "Detailed parcel report generated successfully."
                : scope === "user"
                    ? "Single-user report generated successfully."
                    : "Accessible-record report generated successfully.");
        }
        catch (err) {
            setError("Report generation failed. Please check the backend and try again.");
        }
        finally {
            setGenerating(null);
        }
    }
    return (_jsxs("section", { className: "report-studio", children: [_jsx("div", { className: "report-top-strip" }), _jsxs("div", { className: "report-hero", children: [_jsxs("div", { children: [_jsxs("div", { className: "report-eyebrow", children: [_jsx(ShieldCheck, { size: 15 }), "LANDSYNC REPORT CENTRE"] }), _jsxs("h1", { children: ["Detailed reports,", _jsx("span", { children: " professionally generated." })] }), _jsx("p", { children: "Generate parcel-specific or accessible-record reports with connected land governance information in PDF, JSON or CSV." }), _jsxs("div", { className: "report-hero-pills", children: [_jsxs("span", { children: [_jsx(CheckCircle2, { size: 14 }), "RBAC-aware"] }), _jsxs("span", { children: [_jsx(FileText, { size: 14 }), "Detailed PDF"] }), _jsxs("span", { children: [_jsx(MapPinned, { size: 14 }), "Parcel-centric"] })] })] }), _jsxs("div", { className: "report-hero-art", children: [_jsx(FileText, { size: 72, strokeWidth: 1.15 }), _jsx(BarChart3, { size: 31 })] })] }), message && (_jsxs("div", { className: "report-alert success", children: [_jsx(CheckCircle2, { size: 18 }), message] })), error && (_jsxs("div", { className: "report-alert error", children: [_jsx(XCircle, { size: 18 }), error] })), _jsxs("div", { className: "report-layout", children: [_jsxs("div", { className: "report-config", children: [_jsx("div", { className: "report-section-title", children: _jsxs("div", { children: [_jsx("span", { children: "1 \u2022 REPORT TEMPLATE" }), _jsx("h2", { children: "Choose what to generate" })] }) }), _jsxs("div", { className: "report-template-grid", children: [_jsxs("button", { type: "button", className: reportType === "Detailed Land Parcel Report"
                                            ? "selected"
                                            : "", onClick: () => setReportType("Detailed Land Parcel Report"), children: [_jsx("div", { children: _jsx(FileText, { size: 22 }) }), _jsx("strong", { children: "Detailed Land Parcel" }), _jsx("span", { children: "Identity, ownership, location, RoR, registration, encumbrance, planning, building and taxation." })] }), _jsxs("button", { type: "button", className: reportType === "Land Registry Summary"
                                            ? "selected"
                                            : "", onClick: () => setReportType("Land Registry Summary"), children: [_jsx("div", { children: _jsx(FileSpreadsheet, { size: 22 }) }), _jsx("strong", { children: "Land Registry Summary" }), _jsx("span", { children: "Structured overview of accessible parcel records." })] })] }), _jsx("div", { className: "report-section-title second", children: _jsxs("div", { children: [_jsx("span", { children: "2 \u2022 FORMAT" }), _jsx("h2", { children: "Output format" })] }) }), _jsx("div", { className: "report-format-row", children: [
                                    ["pdf", "PDF", FileText],
                                    ["json", "JSON", FileJson],
                                    ["csv", "CSV", FileSpreadsheet],
                                ].map(([id, label, Icon]) => (_jsxs("button", { type: "button", className: format === id ? "selected" : "", onClick: () => setFormat(id), children: [_jsx(Icon, { size: 19 }), _jsx("strong", { children: label }), _jsx("span", { children: id === "pdf"
                                                ? "Designed dossier"
                                                : id === "json"
                                                    ? "Structured data"
                                                    : "Spreadsheet export" })] }, id))) }), _jsx("div", { className: "report-section-title second", children: _jsxs("div", { children: [_jsx("span", { children: "3 \u2022 DATA FILTERS" }), _jsx("h2", { children: "Choose the records" })] }) }), _jsxs("div", { className: "report-filter-grid", children: [_jsxs("div", { className: "report-input", children: [_jsx(Search, { size: 17 }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search ULPIN, owner, village..." })] }), _jsxs("div", { className: "report-select", children: [_jsx(Filter, { size: 16 }), _jsx("select", { value: landUse, onChange: (e) => setLandUse(e.target.value), children: landUses.map((value) => (_jsx("option", { value: value, children: value === "ALL" ? "All land uses" : value }, value))) })] }), (user?.role === "ADMIN" || user?.role === "OFFICER") && (_jsxs("div", { className: "report-select", children: [_jsx(ShieldCheck, { size: 16 }), _jsxs("select", { value: reportUserId, onChange: (e) => setReportUserId(e.target.value), children: [_jsx("option", { value: "", children: "Select user for single-user report" }), users.map((u) => (_jsxs("option", { value: String(u.id), children: [u.name || u.email || `User ${u.id}`, " ? ", u.role || "USER"] }, u.id)))] })] }))] }), _jsx("div", { className: "report-user-hint", children: reportUserId
                                    ? "Single-user mode: only parcel associations belonging to the selected user will be included."
                                    : "Select a user to generate an individual user report." }), _jsxs("div", { className: "report-record-list", children: [_jsxs("div", { className: "report-record-list-head", children: [_jsxs("span", { children: [filtered.length, " accessible records"] }), _jsx("small", { children: "Select one for a parcel dossier" })] }), _jsx("div", { className: "report-record-scroll", children: loading ? (_jsxs("div", { className: "report-loading", children: [_jsx(Loader2, { className: "report-spin", size: 23 }), "Loading parcel records..."] })) : (filtered.slice(0, 80).map((parcel) => {
                                            const active = String(parcel.id) === selectedId;
                                            return (_jsxs("button", { type: "button", className: `report-record ${active ? "active" : ""}`, onClick: () => setSelectedId(String(parcel.id)), children: [_jsx("div", { className: "report-record-icon", children: _jsx(MapPinned, { size: 17 }) }), _jsxs("div", { children: [_jsx("strong", { children: parcel.ulpin || `Parcel ${parcel.id}` }), _jsx("span", { children: parcel.owner_name ||
                                                                    parcel.owner ||
                                                                    "Owner not available" })] }), _jsx("small", { children: parcel.village || parcel.district || "—" }), _jsx(ChevronRight, { size: 16 })] }, parcel.id));
                                        })) })] }), _jsxs("div", { className: "report-actions", children: [_jsxs("button", { type: "button", className: "report-secondary", onClick: () => generate("all"), disabled: generating !== null, children: [generating === "all" ? (_jsx(Loader2, { className: "report-spin", size: 17 })) : (_jsx(Download, { size: 17 })), "Generate All Accessible"] }), _jsxs("button", { type: "button", className: "report-primary", onClick: () => generate("user"), disabled: generating !== null || !reportUserId, children: [generating === "all" ? (_jsx(Loader2, { className: "report-spin", size: 17 })) : (_jsx(ShieldCheck, { size: 17 })), "Generate Single-User Report"] }), _jsxs("button", { type: "button", className: "report-primary", onClick: () => generate("selected"), disabled: generating !== null || !selected, children: [generating === "all" ? (_jsx(Loader2, { className: "report-spin", size: 17 })) : (_jsx(Sparkles, { size: 17 })), "Generate Selected Parcel"] })] })] }), _jsxs("div", { className: "report-preview", children: [_jsxs("div", { className: "report-preview-head", children: [_jsxs("div", { children: [_jsx("span", { children: "LIVE PREVIEW" }), _jsx("h2", { children: "Report contents" })] }), selected && (_jsxs("button", { type: "button", className: "report-clear", onClick: () => setSelectedId(""), children: [_jsx(XCircle, { size: 15 }), "Clear selection"] }))] }), selected ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "report-preview-cover", children: [_jsx("div", { className: "report-preview-logo", children: "LANDSYNC" }), _jsx("span", { children: reportType }), _jsx("strong", { children: selected.ulpin ||
                                                    `Parcel ${selected.id}` }), _jsxs("small", { children: [selected.village, ", ", selected.district, ",", " ", selected.state] })] }), _jsxs("div", { className: "report-preview-kpis", children: [_jsxs("div", { children: [_jsx("span", { children: "AREA" }), _jsxs("strong", { children: [selected.area || "—", " ", selected.area_unit || ""] })] }), _jsxs("div", { children: [_jsx("span", { children: "LAND USE" }), _jsx("strong", { children: selected.land_use || "—" })] }), _jsxs("div", { children: [_jsx("span", { children: "ROR" }), _jsx("strong", { children: selected.ror_status || "—" })] }), _jsxs("div", { children: [_jsx("span", { children: "REGISTRATION" }), _jsx("strong", { children: selected.registration_status || "—" })] })] }), _jsx("div", { className: "report-preview-sections", children: [
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
                                        ].map(([title, detail]) => (_jsxs("div", { children: [_jsx(CheckCircle2, { size: 16 }), _jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("span", { children: detail })] })] }, title))) }), _jsxs("div", { className: "report-preview-note", children: [_jsx(ShieldCheck, { size: 17 }), _jsxs("div", { children: [_jsx("strong", { children: "Prototype data protection" }), _jsx("span", { children: "Report output is generated only from records accessible to the authenticated user." })] })] })] })) : (_jsxs("div", { className: "report-preview-empty", children: [_jsx(FileText, { size: 39 }), _jsx("strong", { children: "Select a parcel to preview" }), _jsx("span", { children: "The preview will show the sections that will appear in the generated report." })] }))] })] })] }));
}
