import { useState } from "react";
import { useTranslation } from "react-i18next";

const LAND_USE = ["RESIDENTIAL", "AGRICULTURAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "INSTITUTIONAL"];
const STATUS_OPTS = ["PENDING", "VERIFIED", "APPROVED", "REJECTED"];

const defaultState = {
  ulpin: "", survey_number: "", khasra_number: "", owner_name: "", guardian_name: "",
  ownership_type: "SOLE", ownership_share: "100%", state: "", district: "", tehsil: "",
  village: "", locality: "", pin_code: "", area: "", area_unit: "sq m", land_use: "RESIDENTIAL",
  property_type: "INDIVIDUAL", latitude: "", longitude: "",
  ror_number: "", ror_status: "PENDING", registration_number: "", registration_date: "", registration_status: "PENDING",
  encumbrance_status: "NONE", mortgage_status: "NONE", encumbrance_details: "",
  master_plan_zone: "", zoning: "", development_restriction: "NONE",
  building_permission_status: "NOT_APPLIED", approval_number: "", approval_date: "",
  property_tax_id: "", tax_status: "PENDING", tax_amount: "", last_payment_date: "",
  utilities: "", environmental_restrictions: "", infrastructure: "", valuation_reference: "", notes: "",
};

function Field({ label, children }: any) {
  return <div><label>{label}</label>{children}</div>;
}

export default function ParcelForm({ initial, onCancel, onSave }: any) {
  const { t } = useTranslation();
  const [form, setForm] = useState<any>(initial ? { ...defaultState, ...initial } : defaultState);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.ulpin || !form.owner_name || !form.state || !form.district || !form.village || !form.area || !form.latitude || !form.longitude) {
      setError(t("common.required") + ": ULPIN, Owner, State, District, Village, Area, Latitude, Longitude");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, area: parseFloat(form.area), tax_amount: parseFloat(form.tax_amount) || 0,
        latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{initial ? t("registry.editRecord") : t("registry.addRecord")}</div>
        <form onSubmit={submit}>
          <div className="section-title">{t("parcel.identity")}</div>
          <div className="form-grid">
            <Field label="ULPIN *"><input value={form.ulpin} onChange={(e) => set("ulpin", e.target.value)} /></Field>
            <Field label="Survey Number"><input value={form.survey_number} onChange={(e) => set("survey_number", e.target.value)} /></Field>
            <Field label="Khasra Number"><input value={form.khasra_number} onChange={(e) => set("khasra_number", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.ownership")}</div>
          <div className="form-grid">
            <Field label="Owner Name *"><input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></Field>
            <Field label="Guardian Name"><input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} /></Field>
            <Field label="Ownership Type"><input value={form.ownership_type} onChange={(e) => set("ownership_type", e.target.value)} /></Field>
            <Field label="Ownership Share"><input value={form.ownership_share} onChange={(e) => set("ownership_share", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.location")}</div>
          <div className="form-grid">
            <Field label="State *"><input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="District *"><input value={form.district} onChange={(e) => set("district", e.target.value)} /></Field>
            <Field label="Tehsil"><input value={form.tehsil} onChange={(e) => set("tehsil", e.target.value)} /></Field>
            <Field label="Village *"><input value={form.village} onChange={(e) => set("village", e.target.value)} /></Field>
            <Field label="Locality"><input value={form.locality} onChange={(e) => set("locality", e.target.value)} /></Field>
            <Field label="PIN Code"><input value={form.pin_code} onChange={(e) => set("pin_code", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.land")}</div>
          <div className="form-grid">
            <Field label="Area *"><input type="number" value={form.area} onChange={(e) => set("area", e.target.value)} /></Field>
            <Field label="Area Unit"><input value={form.area_unit} onChange={(e) => set("area_unit", e.target.value)} /></Field>
            <Field label="Land Use">
              <select value={form.land_use} onChange={(e) => set("land_use", e.target.value)}>
                {LAND_USE.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Property Type"><input value={form.property_type} onChange={(e) => set("property_type", e.target.value)} /></Field>
            <Field label="Latitude *"><input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} /></Field>
            <Field label="Longitude *"><input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.registration")}</div>
          <div className="form-grid">
            <Field label="RoR Number"><input value={form.ror_number} onChange={(e) => set("ror_number", e.target.value)} /></Field>
            <Field label="RoR Status">
              <select value={form.ror_status} onChange={(e) => set("ror_status", e.target.value)}>{STATUS_OPTS.map((o) => <option key={o}>{o}</option>)}</select>
            </Field>
            <Field label="Registration Number"><input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></Field>
            <Field label="Registration Date"><input type="date" value={form.registration_date} onChange={(e) => set("registration_date", e.target.value)} /></Field>
            <Field label="Registration Status">
              <select value={form.registration_status} onChange={(e) => set("registration_status", e.target.value)}>{STATUS_OPTS.map((o) => <option key={o}>{o}</option>)}</select>
            </Field>
          </div>

          <div className="section-title">{t("parcel.encumbrance")}</div>
          <div className="form-grid">
            <Field label="Encumbrance Status"><input value={form.encumbrance_status} onChange={(e) => set("encumbrance_status", e.target.value)} /></Field>
            <Field label="Mortgage Status"><input value={form.mortgage_status} onChange={(e) => set("mortgage_status", e.target.value)} /></Field>
            <Field label="Encumbrance Details"><input value={form.encumbrance_details} onChange={(e) => set("encumbrance_details", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.planning")}</div>
          <div className="form-grid">
            <Field label="Master Plan Zone"><input value={form.master_plan_zone} onChange={(e) => set("master_plan_zone", e.target.value)} /></Field>
            <Field label="Zoning"><input value={form.zoning} onChange={(e) => set("zoning", e.target.value)} /></Field>
            <Field label="Development Restriction"><input value={form.development_restriction} onChange={(e) => set("development_restriction", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.building")}</div>
          <div className="form-grid">
            <Field label="Building Permission Status"><input value={form.building_permission_status} onChange={(e) => set("building_permission_status", e.target.value)} /></Field>
            <Field label="Approval Number"><input value={form.approval_number} onChange={(e) => set("approval_number", e.target.value)} /></Field>
            <Field label="Approval Date"><input type="date" value={form.approval_date} onChange={(e) => set("approval_date", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.tax")}</div>
          <div className="form-grid">
            <Field label="Property Tax ID"><input value={form.property_tax_id} onChange={(e) => set("property_tax_id", e.target.value)} /></Field>
            <Field label="Tax Status"><input value={form.tax_status} onChange={(e) => set("tax_status", e.target.value)} /></Field>
            <Field label="Tax Amount"><input type="number" value={form.tax_amount} onChange={(e) => set("tax_amount", e.target.value)} /></Field>
            <Field label="Last Payment Date"><input type="date" value={form.last_payment_date} onChange={(e) => set("last_payment_date", e.target.value)} /></Field>
          </div>

          <div className="section-title">{t("parcel.utilities")}</div>
          <div className="form-grid">
            <Field label="Utilities"><input value={form.utilities} onChange={(e) => set("utilities", e.target.value)} /></Field>
            <Field label="Environmental Restrictions"><input value={form.environmental_restrictions} onChange={(e) => set("environmental_restrictions", e.target.value)} /></Field>
            <Field label="Infrastructure"><input value={form.infrastructure} onChange={(e) => set("infrastructure", e.target.value)} /></Field>
            <Field label="Valuation Reference"><input value={form.valuation_reference} onChange={(e) => set("valuation_reference", e.target.value)} /></Field>
          </div>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" className="btn secondary" onClick={onCancel}>{t("registry.cancel")}</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? t("common.loading") : t("registry.save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
