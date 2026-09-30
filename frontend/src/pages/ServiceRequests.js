import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileText, Filter, Loader2, MessageSquareText, RefreshCw, Search, ShieldCheck, UserCheck, X, } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
const STATUS_FLOW = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "IN_PROGRESS",
    "APPROVED",
    "COMPLETED",
];
function statusLabel(value) {
    return String(value || "SUBMITTED")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function statusTone(value) {
    const s = String(value || "").toUpperCase();
    if (s === "COMPLETED" || s === "APPROVED")
        return "done";
    if (s === "REJECTED")
        return "rejected";
    if (s === "UNDER_REVIEW" || s === "IN_PROGRESS")
        return "progress";
    return "submitted";
}
function dateText(value) {
    if (!value)
        return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return value;
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function getPayload(value) {
    return value?.data?.data ?? value?.data ?? value ?? {};
}
export default function ServiceRequests() {
    const { user } = useAuth();
    const isStaff = user?.role === "ADMIN" || user?.role === "OFFICER";
    const [requests, setRequests] = useState([]);
    const [selected, setSelected] = useState(null);
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
        }
        catch (err) {
            setError(err?.response?.data?.detail ||
                "Service requests could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadRequests();
    }, []);
    async function openRequest(request) {
        setSelected(request);
        setEditStatus(request.status || "SUBMITTED");
        setRemarks(request.remarks || "");
        setOfficerId(request.assigned_officer_id || "");
        try {
            setDetailLoading(true);
            const res = await client.get(`/api/services/requests/${request.id}`);
            const detail = getPayload(res);
            if (detail && typeof detail === "object") {
                const merged = { ...request, ...detail };
                setSelected(merged);
                setEditStatus(merged.status || "SUBMITTED");
                setRemarks(merged.remarks || "");
                setOfficerId(merged.assigned_officer_id || "");
            }
        }
        catch (err) {
            console.warn("Request detail could not be loaded.", err);
        }
        finally {
            setDetailLoading(false);
        }
    }
    async function saveUpdate() {
        if (!selected)
            return;
        try {
            setSaving(true);
            setError("");
            setMessage("");
            const body = {
                status: editStatus,
                remarks: remarks.trim(),
            };
            if (officerId.trim()) {
                body.assigned_officer_id = officerId.trim();
            }
            else {
                body.assigned_officer_id = null;
            }
            const res = await client.put(`/api/services/requests/${selected.id}`, body);
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
            const refreshed = await client.get(`/api/services/requests/${selected.id}`);
            const detail = getPayload(refreshed);
            if (detail && typeof detail === "object") {
                setSelected(detail);
                setEditStatus(detail.status || editStatus);
                setRemarks(detail.remarks || "");
                setOfficerId(detail.assigned_officer_id || "");
            }
        }
        catch (err) {
            setError(err?.response?.data?.detail ||
                "Request could not be updated.");
        }
        finally {
            setSaving(false);
        }
    }
    function assignToMe() {
        if (!user?.id)
            return;
        setOfficerId(String(user.id));
        setMessage("Your user ID has been selected for assignment.");
        window.setTimeout(() => setMessage(""), 2500);
    }
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return requests.filter((request) => {
            const matchesStatus = statusFilter === "ALL" ||
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
            if (s === "SUBMITTED")
                value.submitted++;
            else if (s === "UNDER_REVIEW")
                value.review++;
            else if (s === "IN_PROGRESS")
                value.progress++;
            else if (s === "COMPLETED" || s === "APPROVED")
                value.completed++;
            else if (s === "REJECTED")
                value.rejected++;
        });
        return value;
    }, [requests]);
    const currentStatusIndex = Math.max(STATUS_FLOW.indexOf(editStatus), 0);
    const history = selected?.history ||
        selected?.request_history ||
        [];
    return (_jsxs("section", { className: "sr-page", children: [_jsx("div", { className: "sr-accent" }), _jsxs("div", { className: "sr-hero", children: [_jsxs("div", { children: [_jsxs("div", { className: "sr-eyebrow", children: [_jsx(ShieldCheck, { size: 15 }), "SERVICE REQUEST MANAGEMENT"] }), _jsx("h1", { children: isStaff ? "Citizen Request Desk" : "My Service Requests" }), _jsx("p", { children: isStaff
                                    ? "Review citizen requests, assign responsibility, update workflow status and record remarks."
                                    : "Track the progress of your submitted land-service requests." })] }), _jsx("div", { className: "sr-hero-icon", children: _jsx(MessageSquareText, { size: 48, strokeWidth: 1.3 }) })] }), message && (_jsxs("div", { className: "sr-alert success", children: [_jsx(CheckCircle2, { size: 17 }), _jsx("span", { children: message }), _jsx("button", { onClick: () => setMessage(""), children: _jsx(X, { size: 15 }) })] })), error && (_jsxs("div", { className: "sr-alert error", children: [_jsx(AlertCircle, { size: 17 }), _jsx("span", { children: error }), _jsx("button", { onClick: () => setError(""), children: _jsx(X, { size: 15 }) })] })), _jsxs("div", { className: "sr-stats", children: [_jsxs("div", { className: "sr-stat", children: [_jsx("div", { className: "sr-stat-icon blue", children: _jsx(FileText, { size: 18 }) }), _jsx("span", { children: "Total Requests" }), _jsx("strong", { children: counts.all })] }), _jsxs("div", { className: "sr-stat", children: [_jsx("div", { className: "sr-stat-icon amber", children: _jsx(Clock3, { size: 18 }) }), _jsx("span", { children: "Submitted" }), _jsx("strong", { children: counts.submitted })] }), _jsxs("div", { className: "sr-stat", children: [_jsx("div", { className: "sr-stat-icon violet", children: _jsx(RefreshCw, { size: 18 }) }), _jsx("span", { children: "In Progress" }), _jsx("strong", { children: counts.progress + counts.review })] }), _jsxs("div", { className: "sr-stat", children: [_jsx("div", { className: "sr-stat-icon green", children: _jsx(CheckCircle2, { size: 18 }) }), _jsx("span", { children: "Completed" }), _jsx("strong", { children: counts.completed })] }), _jsxs("div", { className: "sr-stat", children: [_jsx("div", { className: "sr-stat-icon red", children: _jsx(AlertCircle, { size: 18 }) }), _jsx("span", { children: "Rejected" }), _jsx("strong", { children: counts.rejected })] })] }), _jsxs("div", { className: "sr-toolbar", children: [_jsxs("div", { className: "sr-search", children: [_jsx(Search, { size: 17 }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search request ID, service or description..." })] }), _jsxs("div", { className: "sr-filter", children: [_jsx(Filter, { size: 16 }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), children: [_jsx("option", { value: "ALL", children: "All Statuses" }), _jsx("option", { value: "SUBMITTED", children: "Submitted" }), _jsx("option", { value: "UNDER_REVIEW", children: "Under Review" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "APPROVED", children: "Approved" }), _jsx("option", { value: "COMPLETED", children: "Completed" }), _jsx("option", { value: "REJECTED", children: "Rejected" })] })] }), _jsxs("button", { className: "sr-refresh", onClick: () => loadRequests(), title: "Refresh", children: [_jsx(RefreshCw, { size: 16 }), "Refresh"] })] }), _jsxs("div", { className: "sr-layout", children: [_jsxs("div", { className: "sr-list-card", children: [_jsxs("div", { className: "sr-list-head", children: [_jsxs("div", { children: [_jsx("span", { children: "REQUEST INBOX" }), _jsxs("strong", { children: [filtered.length, " requests"] })] }), _jsxs("div", { className: "sr-live", children: [_jsx("i", {}), "Live data"] })] }), loading ? (_jsxs("div", { className: "sr-loading", children: [_jsx(Loader2, { className: "sr-spin", size: 25 }), "Loading requests..."] })) : filtered.length === 0 ? (_jsxs("div", { className: "sr-empty", children: [_jsx(FileText, { size: 30 }), _jsx("strong", { children: "No requests found" }), _jsx("span", { children: "Try changing your search or status filter." })] })) : (_jsx("div", { className: "sr-list", children: filtered.map((request) => {
                                    const active = selected?.id === request.id;
                                    return (_jsxs("button", { className: `sr-row ${active ? "active" : ""}`, onClick: () => openRequest(request), children: [_jsx("div", { className: "sr-row-icon", children: _jsx(FileText, { size: 18 }) }), _jsxs("div", { className: "sr-row-main", children: [_jsx("strong", { children: request.service_type || "Land Service" }), _jsx("span", { children: request.request_code ||
                                                            `Request #${request.id}` }), _jsxs("small", { children: ["Submitted ", dateText(request.created_at)] })] }), _jsx("span", { className: `sr-status ${statusTone(request.status)}`, children: statusLabel(request.status) }), _jsx(ArrowRight, { size: 16 })] }, request.id));
                                }) }))] }), _jsx("div", { className: "sr-detail-card", children: !selected ? (_jsxs("div", { className: "sr-select-empty", children: [_jsx("div", { children: _jsx(MessageSquareText, { size: 30 }) }), _jsx("strong", { children: "Select a request" }), _jsx("span", { children: "Choose a request from the inbox to inspect its complete workflow." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "sr-detail-head", children: [_jsxs("div", { children: [_jsx("span", { children: "REQUEST DETAILS" }), _jsx("h2", { children: selected.request_code ||
                                                        `Request #${selected.id}` })] }), _jsx("button", { onClick: () => setSelected(null), children: _jsx(X, { size: 17 }) })] }), detailLoading ? (_jsxs("div", { className: "sr-detail-loading", children: [_jsx(Loader2, { className: "sr-spin", size: 22 }), "Loading details..."] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "sr-summary", children: [_jsx("div", { className: "sr-summary-icon", children: _jsx(FileText, { size: 20 }) }), _jsxs("div", { children: [_jsx("strong", { children: selected.service_type || "Land Service" }), _jsxs("span", { children: ["Submitted ", dateText(selected.created_at)] })] }), _jsx("span", { className: `sr-status large ${statusTone(selected.status)}`, children: statusLabel(selected.status) })] }), _jsx("div", { className: "sr-timeline", children: STATUS_FLOW.map((stage, index) => {
                                                const done = index < currentStatusIndex ||
                                                    editStatus === "COMPLETED" ||
                                                    editStatus === "APPROVED";
                                                const current = stage === editStatus;
                                                return (_jsxs("div", { className: `sr-time ${done ? "done" : ""} ${current ? "current" : ""}`, children: [_jsx("div", { className: "sr-time-dot", children: done ? (_jsx(CheckCircle2, { size: 14 })) : (index + 1) }), _jsx("span", { children: statusLabel(stage) })] }, stage));
                                            }) }), _jsxs("div", { className: "sr-info-box", children: [_jsx("span", { children: "Description" }), _jsx("p", { children: selected.description ||
                                                        "No description provided." })] }), isStaff ? (_jsxs("div", { className: "sr-admin-panel", children: [_jsxs("div", { className: "sr-panel-title", children: [_jsxs("div", { children: [_jsx("span", { children: "OFFICER WORKFLOW" }), _jsx("strong", { children: "Process this request" })] }), _jsx(ShieldCheck, { size: 19 })] }), _jsxs("label", { children: ["Status", _jsxs("select", { value: editStatus, onChange: (e) => setEditStatus(e.target.value), children: [_jsx("option", { value: "SUBMITTED", children: "Submitted" }), _jsx("option", { value: "UNDER_REVIEW", children: "Under Review" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "APPROVED", children: "Approved" }), _jsx("option", { value: "REJECTED", children: "Rejected" }), _jsx("option", { value: "COMPLETED", children: "Completed" })] })] }), _jsxs("label", { children: ["Assigned Officer ID", _jsxs("div", { className: "sr-assignment", children: [_jsx("input", { value: officerId, onChange: (e) => setOfficerId(e.target.value), placeholder: "Officer user ID" }), _jsxs("button", { type: "button", onClick: assignToMe, children: [_jsx(UserCheck, { size: 15 }), "Assign to me"] })] })] }), _jsxs("label", { children: ["Remarks", _jsx("textarea", { rows: 4, value: remarks, onChange: (e) => setRemarks(e.target.value), placeholder: "Add review notes, action taken, missing documents or next steps..." })] }), _jsx("button", { className: "sr-save", onClick: saveUpdate, disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 17, className: "sr-spin" }), "Saving..."] })) : (_jsxs(_Fragment, { children: ["Update Request", _jsx(ArrowRight, { size: 17 })] })) })] })) : (_jsxs("div", { className: "sr-citizen-note", children: [_jsx(ShieldCheck, { size: 18 }), _jsxs("div", { children: [_jsx("strong", { children: "Request under LandSync workflow" }), _jsx("span", { children: "Status shown above reflects the latest available backend record." })] })] })), _jsxs("div", { className: "sr-meta-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Created" }), _jsx("strong", { children: dateText(selected.created_at) })] }), _jsxs("div", { children: [_jsx("span", { children: "Last Updated" }), _jsx("strong", { children: dateText(selected.updated_at) })] }), _jsxs("div", { children: [_jsx("span", { children: "Assigned Officer" }), _jsx("strong", { children: selected.assigned_officer ||
                                                                selected.assigned_officer_id ||
                                                                "Not assigned" })] })] }), history.length > 0 && (_jsxs("div", { className: "sr-history", children: [_jsxs("div", { className: "sr-history-title", children: [_jsx(Clock3, { size: 17 }), "Request History"] }), history.map((item, index) => (_jsxs("div", { className: "sr-history-row", children: [_jsx("span", { children: item.created_at ||
                                                                item.timestamp ||
                                                                item.ts ||
                                                                "—" }), _jsx("strong", { children: item.status ||
                                                                item.action ||
                                                                "Updated" }), _jsx("p", { children: item.remarks ||
                                                                item.details ||
                                                                "" })] }, item.id || index)))] }))] }))] })) })] })] }));
}
