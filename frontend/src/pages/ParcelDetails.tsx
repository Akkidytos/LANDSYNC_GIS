import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload, Download, Trash2 } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ParcelForm from "../components/ParcelForm";

function Row({ label, value }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

export default function ParcelDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const canEdit = user?.role === "ADMIN" || user?.role === "OFFICER";
  const canViewAudit = user?.role === "ADMIN" || user?.role === "OFFICER";

  function load() {
    client.get(`/api/parcels/${id}`).then((r) => setP(r.data.data)).catch(() => setP(null));
    loadDocs();
    if (canViewAudit) {
      client.get(`/api/audit?entity_id=${id}&page_size=20`).then((r) => setAuditEvents(r.data.data.items)).catch(() => {});
    }
  }
  function loadDocs() {
    client.get(`/api/parcels/${id}/documents`).then((r) => setDocs(r.data.data)).catch(() => {});
  }
  useEffect(load, [id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "OTHER");
    try {
      await client.post(`/api/parcels/${id}/documents`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      loadDocs();
    } catch (err: any) {
      setDocError(err.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function downloadDoc(docId: string, filename: string) {
    const res = await client.get(`/api/documents/${docId}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    await client.delete(`/api/documents/${docId}`);
    loadDocs();
  }

  async function download(fmt: string) {
    const res = await client.get(`/api/reports/parcel/${id}?fmt=${fmt}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `parcel_${p.ulpin}.${fmt}`;
    a.click();
  }

  async function handleDelete() {
    if (!confirm(t("registry.deleteConfirm"))) return;
    await client.delete(`/api/parcels/${id}?reason=Removed from details page`);
    navigate("/registry");
  }

  if (!p) return <div className="card">{t("common.loading")}</div>;

  return (
    <div>
      <div className="demo-note">Demo / Synthetic Data — Not an Official Land Record</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{p.ulpin}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.village}, {p.district}, {p.state}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={() => navigate("/map")}>{t("parcel.viewOnMap")}</button>
          <button className="btn secondary" onClick={() => download("pdf")}>{t("parcel.generatePdf")}</button>
          <button className="btn secondary" onClick={() => download("json")}>{t("parcel.exportJson")}</button>
          <button className="btn secondary" onClick={() => download("csv")}>{t("parcel.exportCsv")}</button>
          {canEdit && <button className="btn" onClick={() => setEditing(true)}>{t("parcel.editRecord")}</button>}
          {user?.role === "ADMIN" && <button className="btn danger" onClick={handleDelete}>{t("parcel.deleteRecord")}</button>}
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="section-title">{t("parcel.identity")}</div>
          <Row label="ULPIN" value={p.ulpin} /><Row label="Survey No." value={p.survey_number} /><Row label="Khasra No." value={p.khasra_number} />
          <div className="section-title">{t("parcel.ownership")}</div>
          <Row label="Owner" value={p.owner_name} /><Row label="Guardian" value={p.guardian_name} /><Row label="Share" value={p.ownership_share} />
        </div>
        <div className="card">
          <div className="section-title">{t("parcel.location")}</div>
          <Row label="State" value={p.state} /><Row label="District" value={p.district} /><Row label="Tehsil" value={p.tehsil} />
          <Row label="Village" value={p.village} /><Row label="PIN" value={p.pin_code} />
          <div className="section-title">{t("parcel.land")}</div>
          <Row label="Area" value={`${p.area} ${p.area_unit}`} /><Row label="Land Use" value={p.land_use} />
        </div>
        <div className="card">
          <div className="section-title">{t("parcel.registration")}</div>
          <Row label="RoR Status" value={p.ror_status} /><Row label="Registration Status" value={p.registration_status} />
          <div className="section-title">{t("parcel.encumbrance")}</div>
          <Row label="Encumbrance" value={p.encumbrance_status} /><Row label="Mortgage" value={p.mortgage_status} />
          <div className="section-title">{t("parcel.tax")}</div>
          <Row label="Tax Status" value={p.tax_status} /><Row label="Tax Amount" value={p.tax_amount} />
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", marginTop: 0 }}>
            <span>Documents / Evidence</span>
            <label className="btn secondary" style={{ cursor: "pointer", fontSize: 12 }}>
              <Upload size={14} /> {uploading ? "Uploading..." : "Upload"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          {docError && <div className="error-text">{docError}</div>}
          {docs.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>No documents uploaded.</div>}
          {docs.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.filename}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{d.category} · {(d.size_bytes / 1024).toFixed(1)} KB · {new Date(d.uploaded_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Download size={16} style={{ cursor: "pointer" }} onClick={() => downloadDoc(d.id, d.filename)} />
                {canEdit && <Trash2 size={16} style={{ cursor: "pointer", color: "var(--danger)" }} onClick={() => deleteDoc(d.id)} />}
              </div>
            </div>
          ))}
        </div>

        {canViewAudit && (
          <div className="card">
            <div className="section-title" style={{ border: "none", marginTop: 0 }}>{t("parcel.audit")}</div>
            {auditEvents.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("common.noData")}</div>}
            {auditEvents.map((e) => (
              <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                <span className="badge gray">{e.action}</span> by {e.user_email} — {new Date(e.timestamp).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ParcelForm
          initial={p}
          onCancel={() => setEditing(false)}
          onSave={async (data: any) => {
            await client.put(`/api/parcels/${id}`, data);
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
