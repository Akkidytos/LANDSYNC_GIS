import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Clock3, FileCheck2, FileText, HelpCircle, Info, Landmark, Loader2, MapPinned, RefreshCw, Search, ShieldCheck, Sparkles, UserRoundCheck, X, } from "lucide-react";
import client from "../api/client";
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
const SERVICE_META = {
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
const normalizeService = (service) => {
    const exact = SERVICE_META[service];
    if (exact)
        return exact;
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
function prettyDate(value) {
    if (!value)
        return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function prettyStatus(status) {
    return String(status || "SUBMITTED")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
function statusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "COMPLETED" || value === "APPROVED")
        return "done";
    if (value === "REJECTED")
        return "rejected";
    if (value === "IN_PROGRESS" || value === "UNDER_REVIEW")
        return "progress";
    return "submitted";
}
function getTimeline(status) {
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
    const [types, setTypes] = useState([]);
    const [requests, setRequests] = useState([]);
    const [serviceType, setServiceType] = useState("");
    const [description, setDescription] = useState("");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [selectedRequest, setSelectedRequest] = useState(null);
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
            const available = Array.isArray(serviceData) && serviceData.length
                ? serviceData
                : DEFAULT_SERVICES;
            setTypes(available);
            setServiceType((current) => current || available[0] || "");
            setRequests(Array.isArray(requestData) ? requestData : []);
        }
        catch (err) {
            setError(err?.response?.data?.detail ||
                "Citizen service data could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    async function submit(e) {
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
        }
        catch (err) {
            setError(err?.response?.data?.detail ||
                "The service request could not be submitted.");
        }
        finally {
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
            const matchesCategory = category === "All" || meta.category === category;
            const matchesSearch = !query ||
                type.toLowerCase().includes(query) ||
                meta.category.toLowerCase().includes(query) ||
                meta.description.toLowerCase().includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [types, search, category]);
    const stats = useMemo(() => {
        const submitted = requests.filter((r) => String(r.status).toUpperCase() === "SUBMITTED").length;
        const active = requests.filter((r) => ["UNDER_REVIEW", "IN_PROGRESS"].includes(String(r.status).toUpperCase())).length;
        const completed = requests.filter((r) => ["COMPLETED", "APPROVED"].includes(String(r.status).toUpperCase())).length;
        return {
            total: requests.length,
            submitted,
            active,
            completed,
        };
    }, [requests]);
    async function selectRequest(request) {
        setSelectedRequest(request);
        try {
            const res = await client.get(`/api/services/requests/${request.id}`);
            const detail = res.data?.data ?? res.data;
            if (detail && typeof detail === "object") {
                setSelectedRequest({
                    ...request,
                    ...detail,
                });
            }
        }
        catch (err) {
            console.warn("Could not load latest request details.", err);
        }
    }
    function chooseService(service) {
        setServiceType(service);
        document
            .getElementById("citizen-request-form")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return (_jsxs("section", { className: "citizen-services", children: [_jsx("div", { className: "cs-topline" }), _jsxs("div", { className: "cs-hero", children: [_jsxs("div", { children: [_jsxs("div", { className: "cs-eyebrow", children: [_jsx(ShieldCheck, { size: 15 }), "CITIZEN DIGITAL SERVICES"] }), _jsxs("h1", { children: ["Land Services,", _jsx("span", { children: " simplified." })] }), _jsx("p", { children: "Submit land-related service requests, receive a request ID and track workflow progress from one place." }), _jsxs("div", { className: "cs-hero-pills", children: [_jsxs("span", { children: [_jsx(CheckCircle2, { size: 14 }), "Digital workflow"] }), _jsxs("span", { children: [_jsx(Clock3, { size: 14 }), "Status tracking"] }), _jsxs("span", { children: [_jsx(ShieldCheck, { size: 14 }), "Secure access"] })] })] }), _jsxs("div", { className: "cs-hero-art", children: [_jsx("div", { className: "cs-art-circle cs-art-circle-one" }), _jsx("div", { className: "cs-art-circle cs-art-circle-two" }), _jsx(Landmark, { size: 80, strokeWidth: 1.15 }), _jsx("small", { children: "LANDSYNC" })] })] }), _jsxs("div", { className: "cs-demo-note", children: [_jsx(Info, { size: 17 }), _jsxs("div", { children: [_jsx("strong", { children: "Prototype service environment" }), _jsx("span", { children: "Request workflows shown here are part of the LandSync prototype and use demo/synthetic records." })] })] }), _jsxs("div", { className: "cs-stat-grid", children: [_jsxs("div", { className: "cs-stat-card", children: [_jsx("div", { className: "cs-stat-icon blue", children: _jsx(FileText, { size: 19 }) }), _jsxs("div", { children: [_jsx("small", { children: "Total Requests" }), _jsx("strong", { children: stats.total })] })] }), _jsxs("div", { className: "cs-stat-card", children: [_jsx("div", { className: "cs-stat-icon amber", children: _jsx(Clock3, { size: 19 }) }), _jsxs("div", { children: [_jsx("small", { children: "Submitted" }), _jsx("strong", { children: stats.submitted })] })] }), _jsxs("div", { className: "cs-stat-card", children: [_jsx("div", { className: "cs-stat-icon violet", children: _jsx(RefreshCw, { size: 19 }) }), _jsxs("div", { children: [_jsx("small", { children: "In Progress" }), _jsx("strong", { children: stats.active })] })] }), _jsxs("div", { className: "cs-stat-card", children: [_jsx("div", { className: "cs-stat-icon green", children: _jsx(CheckCircle2, { size: 19 }) }), _jsxs("div", { children: [_jsx("small", { children: "Completed" }), _jsx("strong", { children: stats.completed })] })] })] }), message && (_jsxs("div", { className: "cs-alert success", children: [_jsx(CheckCircle2, { size: 18 }), _jsx("span", { children: message }), _jsx("button", { onClick: () => setMessage(""), "aria-label": "Close", children: _jsx(X, { size: 16 }) })] })), error && (_jsxs("div", { className: "cs-alert error", children: [_jsx(AlertCircle, { size: 18 }), _jsx("span", { children: error }), _jsx("button", { onClick: () => setError(""), "aria-label": "Close", children: _jsx(X, { size: 16 }) })] })), _jsxs("div", { className: "cs-section-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "cs-mini-label", children: "SERVICE CATALOGUE" }), _jsx("h2", { children: "Choose a land service" }), _jsx("p", { children: "Find the service that matches your requirement." })] }), _jsxs("div", { className: "cs-search", children: [_jsx(Search, { size: 18 }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search services..." })] })] }), _jsx("div", { className: "cs-category-row", children: categories.map((item) => (_jsx("button", { className: category === item ? "active" : "", onClick: () => setCategory(item), children: item }, item))) }), _jsxs("div", { className: "cs-service-grid", children: [loading &&
                        Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "cs-service-skeleton" }, i))), !loading &&
                        filteredServices.map((service) => {
                            const meta = normalizeService(service);
                            const Icon = meta.icon;
                            return (_jsxs("article", { className: `cs-service-card ${service === serviceType ? "selected" : ""}`, onClick: () => setServiceType(service), style: {
                                    "--service-color": meta.color,
                                    "--service-soft": meta.soft,
                                }, children: [_jsxs("div", { className: "cs-service-top", children: [_jsx("div", { className: "cs-service-icon", children: _jsx(Icon, { size: 22 }) }), _jsx("span", { className: "cs-service-category", children: meta.category })] }), _jsx("h3", { children: service }), _jsx("p", { children: meta.description }), _jsxs("button", { type: "button", onClick: (e) => {
                                            e.stopPropagation();
                                            chooseService(service);
                                        }, children: ["Apply for service", _jsx(ArrowRight, { size: 16 })] })] }, service));
                        })] }), !loading && filteredServices.length === 0 && (_jsxs("div", { className: "cs-empty", children: [_jsx(Search, { size: 30 }), _jsx("strong", { children: "No services found" }), _jsx("span", { children: "Try another search or category." })] })), _jsxs("div", { className: "cs-main-grid", children: [_jsxs("div", { className: "cs-form-card", id: "citizen-request-form", children: [_jsxs("div", { className: "cs-card-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "cs-mini-label", children: "NEW REQUEST" }), _jsx("h2", { children: "Submit a service request" }), _jsx("p", { children: "Select a service and describe what you need assistance with." })] }), _jsx("div", { className: "cs-card-icon", children: _jsx(Sparkles, { size: 20 }) })] }), _jsxs("form", { onSubmit: submit, children: [_jsxs("label", { children: ["Service type", _jsx("select", { value: serviceType, onChange: (e) => setServiceType(e.target.value), required: true, children: types.map((type) => (_jsx("option", { value: type, children: type }, type))) })] }), _jsxs("label", { children: ["Request description", _jsx("textarea", { rows: 6, value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Describe your request, parcel reference, record issue or information you need...", required: true }), _jsxs("small", { children: [description.length, "/1000 characters"] })] }), _jsxs("div", { className: "cs-form-footer", children: [_jsxs("span", { children: [_jsx(ShieldCheck, { size: 15 }), "Your request will receive a unique request ID."] }), _jsx("button", { className: "cs-submit", type: "submit", disabled: submitting, children: submitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "spin", size: 17 }), "Submitting..."] })) : (_jsxs(_Fragment, { children: ["Submit Request", _jsx(ArrowRight, { size: 17 })] })) })] })] })] }), _jsxs("div", { className: "cs-info-card", children: [_jsxs("div", { className: "cs-info-head", children: [_jsx("div", { className: "cs-info-icon", children: _jsx(UserRoundCheck, { size: 21 }) }), _jsxs("div", { children: [_jsx("strong", { children: "How it works" }), _jsx("span", { children: "Simple digital workflow" })] })] }), _jsxs("div", { className: "cs-step", children: [_jsx("span", { children: "01" }), _jsxs("div", { children: [_jsx("strong", { children: "Select a service" }), _jsx("p", { children: "Choose the service from the catalogue above." })] })] }), _jsxs("div", { className: "cs-step", children: [_jsx("span", { children: "02" }), _jsxs("div", { children: [_jsx("strong", { children: "Submit your request" }), _jsx("p", { children: "Add a clear description of your requirement." })] })] }), _jsxs("div", { className: "cs-step", children: [_jsx("span", { children: "03" }), _jsxs("div", { children: [_jsx("strong", { children: "Receive a request ID" }), _jsx("p", { children: "Use the generated code to identify your request." })] })] }), _jsxs("div", { className: "cs-step", children: [_jsx("span", { children: "04" }), _jsxs("div", { children: [_jsx("strong", { children: "Track progress" }), _jsx("p", { children: "Monitor review and completion status below." })] })] })] })] }), _jsxs("div", { className: "cs-request-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "cs-mini-label", children: "MY REQUESTS" }), _jsx("h2", { children: "Request tracking" }), _jsx("p", { children: "Select any request to view its current workflow stage." })] }), _jsxs("button", { className: "cs-refresh", onClick: () => load(), title: "Refresh requests", children: [_jsx(RefreshCw, { size: 17 }), "Refresh"] })] }), _jsxs("div", { className: "cs-request-grid", children: [_jsx("div", { className: "cs-request-list", children: loading ? (_jsxs("div", { className: "cs-request-loading", children: [_jsx(Loader2, { className: "spin", size: 24 }), "Loading requests..."] })) : requests.length === 0 ? (_jsxs("div", { className: "cs-empty request", children: [_jsx(FileText, { size: 30 }), _jsx("strong", { children: "No requests yet" }), _jsx("span", { children: "Your submitted service requests will appear here." })] })) : (requests.map((request) => {
                            const meta = normalizeService(request.service_type || "Land Service");
                            const Icon = meta.icon;
                            const active = selectedRequest?.id === request.id;
                            return (_jsxs("button", { className: `cs-request-row ${active ? "active" : ""}`, onClick: () => selectRequest(request), children: [_jsx("div", { className: "cs-request-icon", style: {
                                            "--request-color": meta.color,
                                            "--request-soft": meta.soft,
                                        }, children: _jsx(Icon, { size: 19 }) }), _jsxs("div", { className: "cs-request-content", children: [_jsx("strong", { children: request.service_type || "Land Service" }), _jsx("span", { children: request.request_code || `Request #${request.id}` })] }), _jsxs("div", { className: "cs-request-date", children: [_jsx("small", { children: prettyDate(request.created_at) }), _jsx("span", { className: `cs-status ${statusClass(request.status)}`, children: prettyStatus(request.status) })] }), _jsx(ArrowRight, { size: 17 })] }, request.id));
                        })) }), _jsx("div", { className: "cs-detail-card", children: !selectedRequest ? (_jsxs("div", { className: "cs-detail-empty", children: [_jsx("div", { children: _jsx(FileText, { size: 29 }) }), _jsx("strong", { children: "Select a request" }), _jsx("span", { children: "Click a request on the left to view its details and workflow." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cs-detail-head", children: [_jsxs("div", { children: [_jsx("span", { className: "cs-mini-label", children: "REQUEST DETAILS" }), _jsx("h3", { children: selectedRequest.request_code ||
                                                        `Request #${selectedRequest.id}` })] }), _jsx("button", { onClick: () => setSelectedRequest(null), "aria-label": "Close request", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "cs-detail-service", children: [_jsx("div", { className: "cs-detail-service-icon", children: _jsx(FileText, { size: 20 }) }), _jsxs("div", { children: [_jsx("strong", { children: selectedRequest.service_type || "Land Service" }), _jsxs("span", { children: ["Submitted ", prettyDate(selectedRequest.created_at)] })] }), _jsx("span", { className: `cs-status large ${statusClass(selectedRequest.status)}`, children: prettyStatus(selectedRequest.status) })] }), _jsx("div", { className: "cs-timeline", children: getTimeline(selectedRequest.status).map((item, index) => (_jsxs("div", { className: `cs-timeline-item ${item.done ? "done" : ""} ${item.current ? "current" : ""}`, children: [_jsx("div", { className: "cs-timeline-dot", children: item.done ? (_jsx(CheckCircle2, { size: 16 })) : item.current ? (_jsx(Clock3, { size: 16 })) : (_jsx("span", { children: index + 1 })) }), _jsxs("div", { children: [_jsx("strong", { children: prettyStatus(item.stage) }), _jsx("small", { children: item.done
                                                            ? "Completed"
                                                            : item.current
                                                                ? "Current stage"
                                                                : "Upcoming" })] })] }, item.stage))) }), _jsxs("div", { className: "cs-detail-block", children: [_jsx("span", { children: "Description" }), _jsx("p", { children: selectedRequest.description ||
                                                "No description was provided for this request." })] }), (selectedRequest.assigned_officer ||
                                    selectedRequest.remarks) && (_jsxs("div", { className: "cs-detail-meta", children: [selectedRequest.assigned_officer && (_jsxs("div", { children: [_jsx("small", { children: "Assigned officer" }), _jsx("strong", { children: selectedRequest.assigned_officer })] })), selectedRequest.remarks && (_jsxs("div", { children: [_jsx("small", { children: "Latest remarks" }), _jsx("strong", { children: selectedRequest.remarks })] }))] }))] })) })] })] }));
}
