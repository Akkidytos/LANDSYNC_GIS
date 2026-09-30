import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload, Download, Trash2 } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ParcelForm from "../components/ParcelForm";
function Row({ label, value }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }, children: [_jsx("span", { style: { color: "var(--muted)" }, children: label }), _jsx("span", { style: { fontWeight: 600, textAlign: "right" }, children: value || "—" })] }));
}
export default function ParcelDetails() {
    const { id } = useParams();
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [p, setP] = useState(null);
    const [editing, setEditing] = useState(false);
    const [docs, setDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [docError, setDocError] = useState("");
    const [auditEvents, setAuditEvents] = useState([]);
    const canEdit = user?.role === "ADMIN" || user?.role === "OFFICER";
    const canViewAudit = user?.role === "ADMIN" || user?.role === "OFFICER";
    function load() {
        client.get(`/api/parcels/${id}`).then((r) => setP(r.data.data)).catch(() => setP(null));
        loadDocs();
        if (canViewAudit) {
            client.get(`/api/audit?entity_id=${id}&page_size=20`).then((r) => setAuditEvents(r.data.data.items)).catch(() => { });
        }
    }
    function loadDocs() {
        client.get(`/api/parcels/${id}/documents`).then((r) => setDocs(r.data.data)).catch(() => { });
    }
    useEffect(load, [id]);
    async function handleUpload(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setDocError("");
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "OTHER");
        try {
            await client.post(`/api/parcels/${id}/documents`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            loadDocs();
        }
        catch (err) {
            setDocError(err.response?.data?.error?.message || "Upload failed");
        }
        finally {
            setUploading(false);
            e.target.value = "";
        }
    }
    async function downloadDoc(docId, filename) {
        const res = await client.get(`/api/documents/${docId}/download`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
    }
    async function deleteDoc(docId) {
        if (!confirm("Delete this document?"))
            return;
        await client.delete(`/api/documents/${docId}`);
        loadDocs();
    }
    async function download(fmt) {
        const res = await client.get(`/api/reports/parcel/${id}?fmt=${fmt}`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parcel_${p.ulpin}.${fmt}`;
        a.click();
    }
    async function handleDelete() {
        if (!confirm(t("registry.deleteConfirm")))
            return;
        await client.delete(`/api/parcels/${id}?reason=Removed from details page`);
        navigate("/registry");
    }
    if (!p)
        return _jsx("div", { className: "card", children: t("common.loading") });
    return (_jsxs("div", { children: [_jsx("div", { className: "demo-note", children: "Demo / Synthetic Data \u2014 Not an Official Land Record" }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700, fontSize: 18 }, children: p.ulpin }), _jsxs("div", { style: { fontSize: 12, color: "var(--muted)" }, children: [p.village, ", ", p.district, ", ", p.state] })] }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("button", { className: "btn secondary", onClick: () => navigate("/map"), children: t("parcel.viewOnMap") }), _jsx("button", { className: "btn secondary", onClick: () => download("pdf"), children: t("parcel.generatePdf") }), _jsx("button", { className: "btn secondary", onClick: () => download("json"), children: t("parcel.exportJson") }), _jsx("button", { className: "btn secondary", onClick: () => download("csv"), children: t("parcel.exportCsv") }), canEdit && _jsx("button", { className: "btn", onClick: () => setEditing(true), children: t("parcel.editRecord") }), user?.role === "ADMIN" && _jsx("button", { className: "btn danger", onClick: handleDelete, children: t("parcel.deleteRecord") })] })] }), _jsxs("div", { className: "grid-3", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "section-title", children: t("parcel.identity") }), _jsx(Row, { label: "ULPIN", value: p.ulpin }), _jsx(Row, { label: "Survey No.", value: p.survey_number }), _jsx(Row, { label: "Khasra No.", value: p.khasra_number }), _jsx("div", { className: "section-title", children: t("parcel.ownership") }), _jsx(Row, { label: "Owner", value: p.owner_name }), _jsx(Row, { label: "Guardian", value: p.guardian_name }), _jsx(Row, { label: "Share", value: p.ownership_share })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "section-title", children: t("parcel.location") }), _jsx(Row, { label: "State", value: p.state }), _jsx(Row, { label: "District", value: p.district }), _jsx(Row, { label: "Tehsil", value: p.tehsil }), _jsx(Row, { label: "Village", value: p.village }), _jsx(Row, { label: "PIN", value: p.pin_code }), _jsx("div", { className: "section-title", children: t("parcel.land") }), _jsx(Row, { label: "Area", value: `${p.area} ${p.area_unit}` }), _jsx(Row, { label: "Land Use", value: p.land_use })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "section-title", children: t("parcel.registration") }), _jsx(Row, { label: "RoR Status", value: p.ror_status }), _jsx(Row, { label: "Registration Status", value: p.registration_status }), _jsx("div", { className: "section-title", children: t("parcel.encumbrance") }), _jsx(Row, { label: "Encumbrance", value: p.encumbrance_status }), _jsx(Row, { label: "Mortgage", value: p.mortgage_status }), _jsx("div", { className: "section-title", children: t("parcel.tax") }), _jsx(Row, { label: "Tax Status", value: p.tax_status }), _jsx(Row, { label: "Tax Amount", value: p.tax_amount })] })] }), _jsxs("div", { className: "grid-2", style: { marginTop: 16 }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "section-title", style: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", marginTop: 0 }, children: [_jsx("span", { children: "Documents / Evidence" }), _jsxs("label", { className: "btn secondary", style: { cursor: "pointer", fontSize: 12 }, children: [_jsx(Upload, { size: 14 }), " ", uploading ? "Uploading..." : "Upload", _jsx("input", { type: "file", accept: ".pdf,.jpg,.jpeg,.png", style: { display: "none" }, onChange: handleUpload, disabled: uploading })] })] }), docError && _jsx("div", { className: "error-text", children: docError }), docs.length === 0 && _jsx("div", { style: { fontSize: 13, color: "var(--muted)" }, children: "No documents uploaded." }), docs.map((d) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: d.filename }), _jsxs("div", { style: { fontSize: 11, color: "var(--muted)" }, children: [d.category, " \u00B7 ", (d.size_bytes / 1024).toFixed(1), " KB \u00B7 ", new Date(d.uploaded_at).toLocaleDateString()] })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx(Download, { size: 16, style: { cursor: "pointer" }, onClick: () => downloadDoc(d.id, d.filename) }), canEdit && _jsx(Trash2, { size: 16, style: { cursor: "pointer", color: "var(--danger)" }, onClick: () => deleteDoc(d.id) })] })] }, d.id)))] }), canViewAudit && (_jsxs("div", { className: "card", children: [_jsx("div", { className: "section-title", style: { border: "none", marginTop: 0 }, children: t("parcel.audit") }), auditEvents.length === 0 && _jsx("div", { style: { fontSize: 13, color: "var(--muted)" }, children: t("common.noData") }), auditEvents.map((e) => (_jsxs("div", { style: { padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }, children: [_jsx("span", { className: "badge gray", children: e.action }), " by ", e.user_email, " \u2014 ", new Date(e.timestamp).toLocaleString()] }, e.id)))] }))] }), editing && (_jsx(ParcelForm, { initial: p, onCancel: () => setEditing(false), onSave: async (data) => {
                    await client.put(`/api/parcels/${id}`, data);
                    setEditing(false);
                    load();
                } }))] }));
}
