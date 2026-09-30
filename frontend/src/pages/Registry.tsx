import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Landmark,
  MapPinned,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
  Eye,
  Map,
  Save,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

type Parcel = {
  id?: number | string;
  ulpin?: string;
  owner_name?: string;
  owner?: string;
  guardian_name?: string;
  father_name?: string;
  ownership_type?: string;
  ownership_share?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  locality?: string;
  pin_code?: string;
  survey_number?: string;
  khasra_number?: string;
  area?: number;
  area_unit?: string;
  land_use?: string;
  property_type?: string;
  latitude?: number;
  longitude?: number;
  ror_number?: string;
  ror_status?: string;
  registration_number?: string;
  registration_date?: string;
  registration_status?: string;
  encumbrance_status?: string;
  mortgage_status?: string;
  encumbrance_details?: string;
  master_plan_zone?: string;
  zoning?: string;
  development_restriction?: string;
  building_permission_status?: string;
  approval_number?: string;
  approval_date?: string;
  property_tax_id?: string;
  tax_status?: string;
  tax_amount?: number;
  last_payment_date?: string;
  utilities?: string;
  environmental_restrictions?: string;
  infrastructure?: string;
  valuation_reference?: string;
  notes?: string;
  status?: string;
};

type FormState = {
  ulpin: string;
  survey_number: string;
  khasra_number: string;

  owner_name: string;
  guardian_name: string;
  ownership_type: string;
  ownership_share: string;

  state: string;
  district: string;
  tehsil: string;
  village: string;
  locality: string;
  pin_code: string;

  area: string;
  area_unit: string;
  land_use: string;
  property_type: string;
  latitude: string;
  longitude: string;

  ror_number: string;
  ror_status: string;
  registration_number: string;
  registration_date: string;
  registration_status: string;

  encumbrance_status: string;
  mortgage_status: string;
  encumbrance_details: string;

  master_plan_zone: string;
  zoning: string;
  development_restriction: string;

  building_permission_status: string;
  approval_number: string;
  approval_date: string;

  property_tax_id: string;
  tax_status: string;
  tax_amount: string;
  last_payment_date: string;

  utilities: string;
  environmental_restrictions: string;
  infrastructure: string;
  valuation_reference: string;
  notes: string;
};

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
];

const LAND_USES = [
  "Residential",
  "Agricultural",
  "Commercial",
  "Industrial",
  "Institutional",
  "Mixed Use",
];

const AREA_UNITS = [
  "sq m",
  "sq ft",
  "acre",
  "hectare",
];

const PROPERTY_TYPES = [
  "Individual",
  "Joint",
  "Government",
  "Institutional",
  "Trust",
  "Society",
  "Company",
  "Other",
];

const OWNERSHIP_TYPES = [
  "Sole",
  "Joint",
  "Leasehold",
  "Government",
  "Institutional",
  "Other",
];

const ROR_STATUS = [
  "Pending",
  "Verified",
  "Mismatch",
  "Not Available",
];

const REGISTRATION_STATUS = [
  "Pending",
  "Registered",
  "In Progress",
  "Not Applicable",
];

const ENCUMBRANCE_STATUS = [
  "Clear",
  "Mortgage",
  "Disputed",
  "Restricted",
  "Unknown",
];

const MORTGAGE_STATUS = [
  "None",
  "Active",
  "Closed",
  "Unknown",
];

const PLANNING_STATUS = [
  "Review",
  "Approved",
  "Restricted",
  "Not Applicable",
];

const BUILDING_STATUS = [
  "Not Applied",
  "Pending",
  "Approved",
  "Rejected",
  "Not Applicable",
];

const TAX_STATUS = [
  "Due",
  "Paid",
  "Exempt",
  "Not Available",
];

const emptyForm: FormState = {
  ulpin: "",
  survey_number: "",
  khasra_number: "",

  owner_name: "",
  guardian_name: "",
  ownership_type: "Sole",
  ownership_share: "100%",

  state: "Himachal Pradesh",
  district: "",
  tehsil: "",
  village: "",
  locality: "",
  pin_code: "",

  area: "",
  area_unit: "sq m",
  land_use: "Residential",
  property_type: "Individual",
  latitude: "",
  longitude: "",

  ror_number: "",
  ror_status: "Pending",
  registration_number: "",
  registration_date: "",
  registration_status: "Pending",

  encumbrance_status: "Clear",
  mortgage_status: "None",
  encumbrance_details: "",

  master_plan_zone: "",
  zoning: "",
  development_restriction: "None",

  building_permission_status: "Not Applied",
  approval_number: "",
  approval_date: "",

  property_tax_id: "",
  tax_status: "Due",
  tax_amount: "",
  last_payment_date: "",

  utilities: "",
  environmental_restrictions: "",
  infrastructure: "",
  valuation_reference: "",
  notes: "",
};

function payload(value: any) {
  return value?.data?.data ?? value?.data ?? value ?? {};
}

function rowsFrom(value: any): Parcel[] {
  const x = payload(value);

  if (Array.isArray(x)) return x;

  return Array.isArray(x?.items)
    ? x.items
    : Array.isArray(x?.data)
    ? x.data
    : [];
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="ls-reg-field">
      <span className="ls-reg-label">
        {label}
        {required && <b>*</b>}
      </span>

      {children}

      {hint && (
        <small className="ls-reg-hint">
          {hint}
        </small>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  hint?: string;
  required?: boolean;
}) {
  return (
    <Field
      label={label}
      hint={hint}
      required={required}
    >
      <div className="ls-reg-select-wrap">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
    </Field>
  );
}

function Section({
  icon,
  number,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="ls-reg-section">

      <div className="ls-reg-section-head">

        <div className="ls-reg-section-number">
          {number}
        </div>

        <div className="ls-reg-section-icon">
          {icon}
        </div>

        <div className="ls-reg-section-copy">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

      </div>

      <div className="ls-reg-form-grid">
        {children}
      </div>

    </section>
  );
}

function StatusPill({
  value,
}: {
  value?: string;
}) {
  const normalized =
    String(value || "Pending")
      .toLowerCase()
      .replace(/ /g, "-");

  const label =
    value || "Pending";

  return (
    <span
      className={`ls-reg-status ${normalized}`}
    >
      <i />
      {label}
    </span>
  );
}

export default function Registry() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [parcels, setParcels] =
    useState<Parcel[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  const [form, setForm] =
    useState<FormState>({ ...emptyForm });

  const [step, setStep] =
    useState(0);

  async function loadRegistry() {
    try {
      setLoading(true);
      setError("");

      const response =
        await client.get("/api/parcels");

      setParcels(rowsFrom(response));

    } catch (err: any) {

      console.error(
        "Registry loading error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Unable to load land records."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegistry();
  }, []);

  function setField(
    key: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const filtered = useMemo(() => {

    const q = search
      .trim()
      .toLowerCase();

    if (!q) return parcels;

    return parcels.filter((p) =>
      [
        p.ulpin,
        p.owner_name,
        p.owner,
        p.village,
        p.district,
        p.state,
        p.survey_number,
        p.khasra_number,
        p.land_use,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );

  }, [parcels, search]);

  function openForm() {
    setSaveError("");
    setStep(0);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setOpen(false);
    setSaveError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");

    if (
      !form.ulpin.trim() ||
      !form.owner_name.trim() ||
      !form.state ||
      !form.district.trim() ||
      !form.village.trim() ||
      !form.area ||
      !form.latitude ||
      !form.longitude
    ) {
      setSaveError(
        "Please complete all required fields: ULPIN, owner, state, district, village, area, latitude and longitude."
      );

      setStep(0);
      return;
    }

    setSaving(true);

    try {

      const body = {
        ...form,
        area: Number(form.area),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        tax_amount: Number(form.tax_amount || 0),
      };

      await client.post(
        "/api/parcels",
        body
      );

      setOpen(false);
      setForm({ ...emptyForm });

      await loadRegistry();

    } catch (err: any) {

      console.error(
        "Save registry error:",
        err
      );

      setSaveError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "The record could not be saved. Please check the entered values."
      );

    } finally {
      setSaving(false);
    }
  }

  const total = parcels.length;

  const verified = parcels.filter((p) =>
    ["verified", "approved", "active"].includes(
      String(
        p.status || p.ror_status || ""
      ).toLowerCase()
    )
  ).length;

  const states = new Set(
    parcels
      .map((p) => p.state)
      .filter(Boolean)
  ).size;

  return (
    <div className="ls-reg-page">

      {/* PAGE HEADER */}

      <div className="ls-reg-top">

        <div>

          <div className="ls-reg-eyebrow">
            CONNECTED LAND GOVERNANCE
          </div>

          <h1>
            Land Registry
            <span> &amp; Parcel Records</span>
          </h1>

          <p>
            Create, search and manage parcel-centric land
            information from one unified registry.
          </p>

        </div>

        {user?.role !== "CITIZEN" && (
          <button
            className="ls-reg-add-btn"
            onClick={openForm}
          >
            <Plus size={18} />
            Add Land Record
          </button>
        )}

      </div>

      {/* SUMMARY */}

      <div className="ls-reg-summary">

        <div className="ls-reg-summary-card blue">
          <span><Landmark size={19}/></span>
          <div>
            <strong>{total}</strong>
            <small>Total records</small>
          </div>
        </div>

        <div className="ls-reg-summary-card green">
          <span><BadgeCheck size={19}/></span>
          <div>
            <strong>{verified}</strong>
            <small>Verified / approved</small>
          </div>
        </div>

        <div className="ls-reg-summary-card orange">
          <span><MapPinned size={19}/></span>
          <div>
            <strong>{states}</strong>
            <small>States represented</small>
          </div>
        </div>

        <div className="ls-reg-summary-note">
          <Info size={18}/>
          <div>
            <strong>Demo / Synthetic Dataset</strong>
            <span>
              These records are for prototype demonstration and
              are not official land records.
            </span>
          </div>
        </div>

      </div>

      {/* REGISTRY TABLE */}

      <section className="ls-reg-table-card">

        <div className="ls-reg-table-head">

          <div>
            <span>PARCEL DATABASE</span>
            <h2>Land Records</h2>
            <p>
              Search by ULPIN, owner, survey number,
              village or district.
            </p>
          </div>

          <div className="ls-reg-search">
            <Search size={17}/>
            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search records..."
            />
          </div>

        </div>

        {error ? (
          <div className="ls-reg-empty">
            <FileText size={30}/>
            <strong>Unable to load records</strong>
            <span>{error}</span>
            <button onClick={loadRegistry}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="ls-reg-loading">
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ls-reg-empty">
            <Search size={29}/>
            <strong>No matching records</strong>
            <span>
              Try a different ULPIN, owner, village or district.
            </span>
          </div>
        ) : (
          <div className="ls-reg-table-wrap">

            <table className="ls-reg-table">

              <thead>
                <tr>
                  <th>ULPIN</th>
                  <th>OWNER</th>
                  <th>LOCATION</th>
                  <th>AREA</th>
                  <th>LAND USE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((parcel, index) => (

                  <tr
                    key={
                      parcel.id ??
                      parcel.ulpin ??
                      index
                    }
                  >

                    <td>
                      <strong className="ls-reg-ulpin">
                        {parcel.ulpin || "—"}
                      </strong>
                    </td>

                    <td>
                      <div className="ls-reg-owner">
                        <span>
                          <UserRound size={14}/>
                        </span>
                        <strong>
                          {parcel.owner_name ||
                            parcel.owner ||
                            "—"}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="ls-reg-location">
                        <strong>
                          {parcel.village || "—"}
                        </strong>
                        <small>
                          {parcel.district ||
                            parcel.state ||
                            "—"}
                        </small>
                      </div>
                    </td>

                    <td>
                      {parcel.area != null
                        ? `${parcel.area} ${parcel.area_unit || ""}`
                        : "—"}
                    </td>

                    <td>
                      <span className="ls-reg-land-use">
                        {parcel.land_use || "Other"}
                      </span>
                    </td>

                    <td>
                      <StatusPill
                        value={
                          parcel.status ||
                          parcel.ror_status
                        }
                      />
                    </td>

                    <td>
                      <button
                        className="ls-reg-view"
                        title="View parcel"
                        onClick={() => {
                          if (parcel.id) {
                            navigate(
                              `/parcels/${parcel.id}`
                            );
                          }
                        }}
                      >
                        <Eye size={15}/>
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* ADD RECORD MODAL */}

      {open && (

        <div
          className="ls-reg-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.currentTarget === e.target
            ) {
              closeForm();
            }
          }}
        >

          <div className="ls-reg-modal">

            {/* MODAL HEADER */}

            <div className="ls-reg-modal-head">

              <div>

                <div className="ls-reg-modal-kicker">
                  NEW PARCEL RECORD
                </div>

                <h2>
                  Add Land Record
                </h2>

                <p>
                  Enter the parcel information step by step.
                  Required fields are marked with <b>*</b>.
                </p>

              </div>

              <button
                className="ls-reg-close"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={19}/>
              </button>

            </div>

            {/* PROGRESS */}

            <div className="ls-reg-progress">

              {[
                ["01", "Identity"],
                ["02", "Location & Land"],
                ["03", "Governance"],
                ["04", "Supporting"],
              ].map(([num, label], index) => (

                <button
                  type="button"
                  key={num}
                  className={
                    step === index
                      ? "active"
                      : index < step
                      ? "done"
                      : ""
                  }
                  onClick={() => setStep(index)}
                >
                  <span>{num}</span>
                  <small>{label}</small>
                </button>

              ))}

            </div>

            <form
              className="ls-reg-form"
              onSubmit={submit}
            >

              {/* STEP 1 */}

              {step === 0 && (
                <>
                  <Section
                    number="01"
                    title="Parcel Identity"
                    subtitle="Unique references used to identify the land parcel."
                    icon={<Landmark size={19}/>}
                  >

                    <Field
                      label="ULPIN / Parcel ID"
                      required
                      hint="Enter the unique parcel identifier used by your dataset."
                    >
                      <input
                        value={form.ulpin}
                        onChange={(e) =>
                          setField(
                            "ulpin",
                            e.target.value
                          )
                        }
                        placeholder="e.g. ULPINHP1001"
                      />
                    </Field>

                    <Field
                      label="Survey Number"
                      hint="Survey or plot reference from the source record."
                    >
                      <input
                        value={form.survey_number}
                        onChange={(e) =>
                          setField(
                            "survey_number",
                            e.target.value
                          )
                        }
                        placeholder="e.g. SY-104"
                      />
                    </Field>

                    <Field
                      label="Khasra Number"
                      hint="Khasra / parcel reference, where applicable."
                    >
                      <input
                        value={form.khasra_number}
                        onChange={(e) =>
                          setField(
                            "khasra_number",
                            e.target.value
                          )
                        }
                        placeholder="e.g. KH-208"
                      />
                    </Field>

                    <Field
                      label="Owner Name"
                      required
                      hint="Name exactly as represented in the source/dataset."
                    >
                      <input
                        value={form.owner_name}
                        onChange={(e) =>
                          setField(
                            "owner_name",
                            e.target.value
                          )
                        }
                        placeholder="Enter owner name"
                      />
                    </Field>

                    <Field
                      label="Guardian / Father's Name"
                      hint="Optional parent or guardian reference."
                    >
                      <input
                        value={form.guardian_name}
                        onChange={(e) =>
                          setField(
                            "guardian_name",
                            e.target.value
                          )
                        }
                        placeholder="Enter guardian name"
                      />
                    </Field>

                    <SelectField
                      label="Ownership Type"
                      value={form.ownership_type}
                      onChange={(v) =>
                        setField("ownership_type", v)
                      }
                      options={OWNERSHIP_TYPES}
                      hint="Choose how the parcel is held."
                    />

                    <Field
                      label="Ownership Share"
                      hint="Example: 100%, 50%, 1/2."
                    >
                      <input
                        value={form.ownership_share}
                        onChange={(e) =>
                          setField(
                            "ownership_share",
                            e.target.value
                          )
                        }
                        placeholder="100%"
                      />
                    </Field>

                    <SelectField
                      label="Property Type"
                      value={form.property_type}
                      onChange={(v) =>
                        setField("property_type", v)
                      }
                      options={PROPERTY_TYPES}
                    />

                  </Section>

                  <div className="ls-reg-next-row">
                    <button
                      type="button"
                      className="ls-reg-next"
                      onClick={() => setStep(1)}
                    >
                      Continue to Location
                      <MapPinned size={16}/>
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2 */}

              {step === 1 && (
                <>
                  <Section
                    number="02"
                    title="Location & Land"
                    subtitle="Describe where the parcel is and what type of land it is."
                    icon={<MapPinned size={19}/>}
                  >

                    <SelectField
                      label="State"
                      required
                      value={form.state}
                      onChange={(v) =>
                        setField("state", v)
                      }
                      options={STATES}
                      hint="Select the state from the list."
                    />

                    <Field
                      label="District"
                      required
                      hint="Enter the district name."
                    >
                      <input
                        value={form.district}
                        onChange={(e) =>
                          setField(
                            "district",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Kangra"
                      />
                    </Field>

                    <Field
                      label="Tehsil"
                      hint="Administrative tehsil/subdivision."
                    >
                      <input
                        value={form.tehsil}
                        onChange={(e) =>
                          setField(
                            "tehsil",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Palampur"
                      />
                    </Field>

                    <Field
                      label="Village"
                      required
                      hint="Village or local revenue settlement."
                    >
                      <input
                        value={form.village}
                        onChange={(e) =>
                          setField(
                            "village",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Rajpur"
                      />
                    </Field>

                    <Field
                      label="Locality"
                      hint="Street, sector, ward or local area."
                    >
                      <input
                        value={form.locality}
                        onChange={(e) =>
                          setField(
                            "locality",
                            e.target.value
                          )
                        }
                        placeholder="Optional locality"
                      />
                    </Field>

                    <Field
                      label="PIN Code"
                      hint="6-digit Indian PIN code."
                    >
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={form.pin_code}
                        onChange={(e) =>
                          setField(
                            "pin_code",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        placeholder="e.g. 176061"
                      />
                    </Field>

                    <Field
                      label="Area"
                      required
                      hint="Numeric land area."
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.area}
                        onChange={(e) =>
                          setField(
                            "area",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 1250"
                      />
                    </Field>

                    <SelectField
                      label="Area Unit"
                      value={form.area_unit}
                      onChange={(v) =>
                        setField("area_unit", v)
                      }
                      options={AREA_UNITS}
                    />

                    <SelectField
                      label="Land Use"
                      value={form.land_use}
                      onChange={(v) =>
                        setField("land_use", v)
                      }
                      options={LAND_USES}
                      hint="Select the current/planned land-use category."
                    />

                    <Field
                      label="Latitude"
                      required
                      hint="Decimal latitude, e.g. 32.1100."
                    >
                      <input
                        type="number"
                        step="0.000001"
                        value={form.latitude}
                        onChange={(e) =>
                          setField(
                            "latitude",
                            e.target.value
                          )
                        }
                        placeholder="32.110000"
                      />
                    </Field>

                    <Field
                      label="Longitude"
                      required
                      hint="Decimal longitude, e.g. 76.5300."
                    >
                      <input
                        type="number"
                        step="0.000001"
                        value={form.longitude}
                        onChange={(e) =>
                          setField(
                            "longitude",
                            e.target.value
                          )
                        }
                        placeholder="76.530000"
                      />
                    </Field>

                  </Section>

                  <div className="ls-reg-form-nav">
                    <button
                      type="button"
                      className="ls-reg-back"
                      onClick={() => setStep(0)}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="ls-reg-next"
                      onClick={() => setStep(2)}
                    >
                      Continue to Governance
                      <ShieldCheck size={16}/>
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 */}

              {step === 2 && (
                <>
                  <Section
                    number="03"
                    title="Governance & Verification"
                    subtitle="Record status, registration, encumbrance, planning and approval information."
                    icon={<ShieldCheck size={19}/>}
                  >

                    <Field
                      label="RoR Number"
                      hint="Record of Rights reference, if available."
                    >
                      <input
                        value={form.ror_number}
                        onChange={(e) =>
                          setField(
                            "ror_number",
                            e.target.value
                          )
                        }
                        placeholder="e.g. ROR-1042"
                      />
                    </Field>

                    <SelectField
                      label="RoR Status"
                      value={form.ror_status}
                      onChange={(v) =>
                        setField("ror_status", v)
                      }
                      options={ROR_STATUS}
                    />

                    <Field
                      label="Registration Number"
                      hint="Registration/document reference."
                    >
                      <input
                        value={form.registration_number}
                        onChange={(e) =>
                          setField(
                            "registration_number",
                            e.target.value
                          )
                        }
                        placeholder="e.g. REG-1042"
                      />
                    </Field>

                    <Field
                      label="Registration Date"
                      hint="Date of registration, if available."
                    >
                      <input
                        type="date"
                        value={form.registration_date}
                        onChange={(e) =>
                          setField(
                            "registration_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <SelectField
                      label="Registration Status"
                      value={form.registration_status}
                      onChange={(v) =>
                        setField(
                          "registration_status",
                          v
                        )
                      }
                      options={REGISTRATION_STATUS}
                    />

                    <SelectField
                      label="Encumbrance Status"
                      value={form.encumbrance_status}
                      onChange={(v) =>
                        setField(
                          "encumbrance_status",
                          v
                        )
                      }
                      options={ENCUMBRANCE_STATUS}
                      hint="Choose Clear when no recorded encumbrance exists in the dataset."
                    />

                    <SelectField
                      label="Mortgage Status"
                      value={form.mortgage_status}
                      onChange={(v) =>
                        setField(
                          "mortgage_status",
                          v
                        )
                      }
                      options={MORTGAGE_STATUS}
                    />

                    <Field
                      label="Encumbrance Details"
                      hint="Optional notes about the restriction/mortgage."
                    >
                      <input
                        value={form.encumbrance_details}
                        onChange={(e) =>
                          setField(
                            "encumbrance_details",
                            e.target.value
                          )
                        }
                        placeholder="Add details if applicable"
                      />
                    </Field>

                    <Field
                      label="Master Plan Zone"
                      hint="Planning zone/reference."
                    >
                      <input
                        value={form.master_plan_zone}
                        onChange={(e) =>
                          setField(
                            "master_plan_zone",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Zone A"
                      />
                    </Field>

                    <Field
                      label="Zoning"
                      hint="Optional zoning designation."
                    >
                      <input
                        value={form.zoning}
                        onChange={(e) =>
                          setField(
                            "zoning",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Residential"
                      />
                    </Field>

                    <SelectField
                      label="Planning Status"
                      value={form.development_restriction}
                      onChange={(v) =>
                        setField(
                          "development_restriction",
                          v
                        )
                      }
                      options={[
                        "None",
                        "Restricted",
                        "Review",
                      ]}
                      hint="Development restriction status."
                    />

                    <SelectField
                      label="Building Permission"
                      value={form.building_permission_status}
                      onChange={(v) =>
                        setField(
                          "building_permission_status",
                          v
                        )
                      }
                      options={BUILDING_STATUS}
                    />

                  </Section>

                  <div className="ls-reg-form-nav">

                    <button
                      type="button"
                      className="ls-reg-back"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="ls-reg-next"
                      onClick={() => setStep(3)}
                    >
                      Continue to Supporting Info
                      <FileText size={16}/>
                    </button>

                  </div>
                </>
              )}

              {/* STEP 4 */}

              {step === 3 && (
                <>
                  <Section
                    number="04"
                    title="Tax, Utilities & Notes"
                    subtitle="Add fiscal, infrastructure and supporting information."
                    icon={<FileText size={19}/>}
                  >

                    <Field
                      label="Approval Number"
                      hint="Building approval reference, if applicable."
                    >
                      <input
                        value={form.approval_number}
                        onChange={(e) =>
                          setField(
                            "approval_number",
                            e.target.value
                          )
                        }
                        placeholder="e.g. BP-1042"
                      />
                    </Field>

                    <Field
                      label="Approval Date"
                      hint="Building approval date."
                    >
                      <input
                        type="date"
                        value={form.approval_date}
                        onChange={(e) =>
                          setField(
                            "approval_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field
                      label="Property Tax ID"
                      hint="Parcel-linked tax reference."
                    >
                      <input
                        value={form.property_tax_id}
                        onChange={(e) =>
                          setField(
                            "property_tax_id",
                            e.target.value
                          )
                        }
                        placeholder="e.g. TAX-1042"
                      />
                    </Field>

                    <SelectField
                      label="Tax Status"
                      value={form.tax_status}
                      onChange={(v) =>
                        setField("tax_status", v)
                      }
                      options={TAX_STATUS}
                    />

                    <Field
                      label="Tax Amount"
                      hint="Numeric tax amount, if known."
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.tax_amount}
                        onChange={(e) =>
                          setField(
                            "tax_amount",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </Field>

                    <Field
                      label="Last Payment Date"
                      hint="Latest tax payment date."
                    >
                      <input
                        type="date"
                        value={form.last_payment_date}
                        onChange={(e) =>
                          setField(
                            "last_payment_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field
                      label="Utilities"
                      hint="Example: Water, Electricity, Sewerage."
                    >
                      <input
                        value={form.utilities}
                        onChange={(e) =>
                          setField(
                            "utilities",
                            e.target.value
                          )
                        }
                        placeholder="Water, Electricity"
                      />
                    </Field>

                    <Field
                      label="Infrastructure"
                      hint="Nearby or parcel-linked infrastructure."
                    >
                      <input
                        value={form.infrastructure}
                        onChange={(e) =>
                          setField(
                            "infrastructure",
                            e.target.value
                          )
                        }
                        placeholder="Road access"
                      />
                    </Field>

                    <Field
                      label="Environmental Restrictions"
                      hint="Optional environmental constraints."
                    >
                      <input
                        value={form.environmental_restrictions}
                        onChange={(e) =>
                          setField(
                            "environmental_restrictions",
                            e.target.value
                          )
                        }
                        placeholder="None"
                      />
                    </Field>

                    <Field
                      label="Valuation Reference"
                      hint="Optional valuation/reference number."
                    >
                      <input
                        value={form.valuation_reference}
                        onChange={(e) =>
                          setField(
                            "valuation_reference",
                            e.target.value
                          )
                        }
                        placeholder="e.g. VAL-1042"
                      />
                    </Field>

                    <Field
                      label="Address"
                      hint="Full address for the parcel."
                    >
                      <input
                        value={form.locality}
                        onChange={(e) =>
                          setField(
                            "locality",
                            e.target.value
                          )
                        }
                        placeholder="Enter address / locality"
                      />
                    </Field>

                    <Field
                      label="Notes / Evidence"
                      hint="Use this for source references or additional remarks."
                    >
                      <textarea
                        value={form.notes}
                        onChange={(e) =>
                          setField(
                            "notes",
                            e.target.value
                          )
                        }
                        placeholder="Add notes or evidence reference..."
                        rows={4}
                      />
                    </Field>

                  </Section>

                  {saveError && (
                    <div className="ls-reg-form-error">
                      <Info size={17}/>
                      <span>{saveError}</span>
                    </div>
                  )}

                  <div className="ls-reg-form-nav">

                    <button
                      type="button"
                      className="ls-reg-back"
                      onClick={() => setStep(2)}
                      disabled={saving}
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      className="ls-reg-save"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="ls-reg-spinner"/>
                          Saving record...
                        </>
                      ) : (
                        <>
                          <Save size={17}/>
                          Save Land Record
                        </>
                      )}
                    </button>

                  </div>
                </>
              )}

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

