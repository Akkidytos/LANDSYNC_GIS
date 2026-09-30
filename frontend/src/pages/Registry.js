import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ChevronDown, FileText, Landmark, MapPinned, Plus, Search, ShieldCheck, UserRound, X, Eye, Save, Info, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
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
const emptyForm = {
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
function payload(value) {
    return value?.data?.data ?? value?.data ?? value ?? {};
}
function rowsFrom(value) {
    const x = payload(value);
    if (Array.isArray(x))
        return x;
    return Array.isArray(x?.items)
        ? x.items
        : Array.isArray(x?.data)
            ? x.data
            : [];
}
function Field({ label, hint, required, children, }) {
    return (_jsxs("label", { className: "ls-reg-field", children: [_jsxs("span", { className: "ls-reg-label", children: [label, required && _jsx("b", { children: "*" })] }), children, hint && (_jsx("small", { className: "ls-reg-hint", children: hint }))] }));
}
function SelectField({ label, value, onChange, options, hint, required, }) {
    return (_jsx(Field, { label: label, hint: hint, required: required, children: _jsxs("div", { className: "ls-reg-select-wrap", children: [_jsx("select", { value: value, onChange: (e) => onChange(e.target.value), children: options.map((option) => (_jsx("option", { value: option, children: option }, option))) }), _jsx(ChevronDown, { size: 16 })] }) }));
}
function Section({ icon, number, title, subtitle, children, }) {
    return (_jsxs("section", { className: "ls-reg-section", children: [_jsxs("div", { className: "ls-reg-section-head", children: [_jsx("div", { className: "ls-reg-section-number", children: number }), _jsx("div", { className: "ls-reg-section-icon", children: icon }), _jsxs("div", { className: "ls-reg-section-copy", children: [_jsx("h3", { children: title }), _jsx("p", { children: subtitle })] })] }), _jsx("div", { className: "ls-reg-form-grid", children: children })] }));
}
function StatusPill({ value, }) {
    const normalized = String(value || "Pending")
        .toLowerCase()
        .replace(/ /g, "-");
    const label = value || "Pending";
    return (_jsxs("span", { className: `ls-reg-status ${normalized}`, children: [_jsx("i", {}), label] }));
}
export default function Registry() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [form, setForm] = useState({ ...emptyForm });
    const [step, setStep] = useState(0);
    async function loadRegistry() {
        try {
            setLoading(true);
            setError("");
            const response = await client.get("/api/parcels");
            setParcels(rowsFrom(response));
        }
        catch (err) {
            console.error("Registry loading error:", err);
            setError(err?.response?.data?.detail ||
                err?.response?.data?.message ||
                "Unable to load land records.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadRegistry();
    }, []);
    function setField(key, value) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }
    const filtered = useMemo(() => {
        const q = search
            .trim()
            .toLowerCase();
        if (!q)
            return parcels;
        return parcels.filter((p) => [
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
            .includes(q));
    }, [parcels, search]);
    function openForm() {
        setSaveError("");
        setStep(0);
        setForm({ ...emptyForm });
        setOpen(true);
    }
    function closeForm() {
        if (saving)
            return;
        setOpen(false);
        setSaveError("");
    }
    async function submit(e) {
        e.preventDefault();
        setSaveError("");
        if (!form.ulpin.trim() ||
            !form.owner_name.trim() ||
            !form.state ||
            !form.district.trim() ||
            !form.village.trim() ||
            !form.area ||
            !form.latitude ||
            !form.longitude) {
            setSaveError("Please complete all required fields: ULPIN, owner, state, district, village, area, latitude and longitude.");
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
            await client.post("/api/parcels", body);
            setOpen(false);
            setForm({ ...emptyForm });
            await loadRegistry();
        }
        catch (err) {
            console.error("Save registry error:", err);
            setSaveError(err?.response?.data?.detail ||
                err?.response?.data?.message ||
                "The record could not be saved. Please check the entered values.");
        }
        finally {
            setSaving(false);
        }
    }
    const total = parcels.length;
    const verified = parcels.filter((p) => ["verified", "approved", "active"].includes(String(p.status || p.ror_status || "").toLowerCase())).length;
    const states = new Set(parcels
        .map((p) => p.state)
        .filter(Boolean)).size;
    return (_jsxs("div", { className: "ls-reg-page", children: [_jsxs("div", { className: "ls-reg-top", children: [_jsxs("div", { children: [_jsx("div", { className: "ls-reg-eyebrow", children: "CONNECTED LAND GOVERNANCE" }), _jsxs("h1", { children: ["Land Registry", _jsx("span", { children: " & Parcel Records" })] }), _jsx("p", { children: "Create, search and manage parcel-centric land information from one unified registry." })] }), user?.role !== "CITIZEN" && (_jsxs("button", { className: "ls-reg-add-btn", onClick: openForm, children: [_jsx(Plus, { size: 18 }), "Add Land Record"] }))] }), _jsxs("div", { className: "ls-reg-summary", children: [_jsxs("div", { className: "ls-reg-summary-card blue", children: [_jsx("span", { children: _jsx(Landmark, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { children: total }), _jsx("small", { children: "Total records" })] })] }), _jsxs("div", { className: "ls-reg-summary-card green", children: [_jsx("span", { children: _jsx(BadgeCheck, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { children: verified }), _jsx("small", { children: "Verified / approved" })] })] }), _jsxs("div", { className: "ls-reg-summary-card orange", children: [_jsx("span", { children: _jsx(MapPinned, { size: 19 }) }), _jsxs("div", { children: [_jsx("strong", { children: states }), _jsx("small", { children: "States represented" })] })] }), _jsxs("div", { className: "ls-reg-summary-note", children: [_jsx(Info, { size: 18 }), _jsxs("div", { children: [_jsx("strong", { children: "Demo / Synthetic Dataset" }), _jsx("span", { children: "These records are for prototype demonstration and are not official land records." })] })] })] }), _jsxs("section", { className: "ls-reg-table-card", children: [_jsxs("div", { className: "ls-reg-table-head", children: [_jsxs("div", { children: [_jsx("span", { children: "PARCEL DATABASE" }), _jsx("h2", { children: "Land Records" }), _jsx("p", { children: "Search by ULPIN, owner, survey number, village or district." })] }), _jsxs("div", { className: "ls-reg-search", children: [_jsx(Search, { size: 17 }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search records..." })] })] }), error ? (_jsxs("div", { className: "ls-reg-empty", children: [_jsx(FileText, { size: 30 }), _jsx("strong", { children: "Unable to load records" }), _jsx("span", { children: error }), _jsx("button", { onClick: loadRegistry, children: "Retry" })] })) : loading ? (_jsxs("div", { className: "ls-reg-loading", children: [_jsx("div", {}), _jsx("div", {}), _jsx("div", {}), _jsx("div", {}), _jsx("div", {})] })) : filtered.length === 0 ? (_jsxs("div", { className: "ls-reg-empty", children: [_jsx(Search, { size: 29 }), _jsx("strong", { children: "No matching records" }), _jsx("span", { children: "Try a different ULPIN, owner, village or district." })] })) : (_jsx("div", { className: "ls-reg-table-wrap", children: _jsxs("table", { className: "ls-reg-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ULPIN" }), _jsx("th", { children: "OWNER" }), _jsx("th", { children: "LOCATION" }), _jsx("th", { children: "AREA" }), _jsx("th", { children: "LAND USE" }), _jsx("th", { children: "STATUS" }), _jsx("th", { children: "ACTION" })] }) }), _jsx("tbody", { children: filtered.map((parcel, index) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { className: "ls-reg-ulpin", children: parcel.ulpin || "—" }) }), _jsx("td", { children: _jsxs("div", { className: "ls-reg-owner", children: [_jsx("span", { children: _jsx(UserRound, { size: 14 }) }), _jsx("strong", { children: parcel.owner_name ||
                                                                parcel.owner ||
                                                                "—" })] }) }), _jsx("td", { children: _jsxs("div", { className: "ls-reg-location", children: [_jsx("strong", { children: parcel.village || "—" }), _jsx("small", { children: parcel.district ||
                                                                parcel.state ||
                                                                "—" })] }) }), _jsx("td", { children: parcel.area != null
                                                    ? `${parcel.area} ${parcel.area_unit || ""}`
                                                    : "—" }), _jsx("td", { children: _jsx("span", { className: "ls-reg-land-use", children: parcel.land_use || "Other" }) }), _jsx("td", { children: _jsx(StatusPill, { value: parcel.status ||
                                                        parcel.ror_status }) }), _jsx("td", { children: _jsx("button", { className: "ls-reg-view", title: "View parcel", onClick: () => {
                                                        if (parcel.id) {
                                                            navigate(`/parcels/${parcel.id}`);
                                                        }
                                                    }, children: _jsx(Eye, { size: 15 }) }) })] }, parcel.id ??
                                        parcel.ulpin ??
                                        index))) })] }) }))] }), open && (_jsx("div", { className: "ls-reg-modal-backdrop", onMouseDown: (e) => {
                    if (e.currentTarget === e.target) {
                        closeForm();
                    }
                }, children: _jsxs("div", { className: "ls-reg-modal", children: [_jsxs("div", { className: "ls-reg-modal-head", children: [_jsxs("div", { children: [_jsx("div", { className: "ls-reg-modal-kicker", children: "NEW PARCEL RECORD" }), _jsx("h2", { children: "Add Land Record" }), _jsxs("p", { children: ["Enter the parcel information step by step. Required fields are marked with ", _jsx("b", { children: "*" }), "."] })] }), _jsx("button", { className: "ls-reg-close", onClick: closeForm, disabled: saving, children: _jsx(X, { size: 19 }) })] }), _jsx("div", { className: "ls-reg-progress", children: [
                                ["01", "Identity"],
                                ["02", "Location & Land"],
                                ["03", "Governance"],
                                ["04", "Supporting"],
                            ].map(([num, label], index) => (_jsxs("button", { type: "button", className: step === index
                                    ? "active"
                                    : index < step
                                        ? "done"
                                        : "", onClick: () => setStep(index), children: [_jsx("span", { children: num }), _jsx("small", { children: label })] }, num))) }), _jsxs("form", { className: "ls-reg-form", onSubmit: submit, children: [step === 0 && (_jsxs(_Fragment, { children: [_jsxs(Section, { number: "01", title: "Parcel Identity", subtitle: "Unique references used to identify the land parcel.", icon: _jsx(Landmark, { size: 19 }), children: [_jsx(Field, { label: "ULPIN / Parcel ID", required: true, hint: "Enter the unique parcel identifier used by your dataset.", children: _jsx("input", { value: form.ulpin, onChange: (e) => setField("ulpin", e.target.value), placeholder: "e.g. ULPINHP1001" }) }), _jsx(Field, { label: "Survey Number", hint: "Survey or plot reference from the source record.", children: _jsx("input", { value: form.survey_number, onChange: (e) => setField("survey_number", e.target.value), placeholder: "e.g. SY-104" }) }), _jsx(Field, { label: "Khasra Number", hint: "Khasra / parcel reference, where applicable.", children: _jsx("input", { value: form.khasra_number, onChange: (e) => setField("khasra_number", e.target.value), placeholder: "e.g. KH-208" }) }), _jsx(Field, { label: "Owner Name", required: true, hint: "Name exactly as represented in the source/dataset.", children: _jsx("input", { value: form.owner_name, onChange: (e) => setField("owner_name", e.target.value), placeholder: "Enter owner name" }) }), _jsx(Field, { label: "Guardian / Father's Name", hint: "Optional parent or guardian reference.", children: _jsx("input", { value: form.guardian_name, onChange: (e) => setField("guardian_name", e.target.value), placeholder: "Enter guardian name" }) }), _jsx(SelectField, { label: "Ownership Type", value: form.ownership_type, onChange: (v) => setField("ownership_type", v), options: OWNERSHIP_TYPES, hint: "Choose how the parcel is held." }), _jsx(Field, { label: "Ownership Share", hint: "Example: 100%, 50%, 1/2.", children: _jsx("input", { value: form.ownership_share, onChange: (e) => setField("ownership_share", e.target.value), placeholder: "100%" }) }), _jsx(SelectField, { label: "Property Type", value: form.property_type, onChange: (v) => setField("property_type", v), options: PROPERTY_TYPES })] }), _jsx("div", { className: "ls-reg-next-row", children: _jsxs("button", { type: "button", className: "ls-reg-next", onClick: () => setStep(1), children: ["Continue to Location", _jsx(MapPinned, { size: 16 })] }) })] })), step === 1 && (_jsxs(_Fragment, { children: [_jsxs(Section, { number: "02", title: "Location & Land", subtitle: "Describe where the parcel is and what type of land it is.", icon: _jsx(MapPinned, { size: 19 }), children: [_jsx(SelectField, { label: "State", required: true, value: form.state, onChange: (v) => setField("state", v), options: STATES, hint: "Select the state from the list." }), _jsx(Field, { label: "District", required: true, hint: "Enter the district name.", children: _jsx("input", { value: form.district, onChange: (e) => setField("district", e.target.value), placeholder: "e.g. Kangra" }) }), _jsx(Field, { label: "Tehsil", hint: "Administrative tehsil/subdivision.", children: _jsx("input", { value: form.tehsil, onChange: (e) => setField("tehsil", e.target.value), placeholder: "e.g. Palampur" }) }), _jsx(Field, { label: "Village", required: true, hint: "Village or local revenue settlement.", children: _jsx("input", { value: form.village, onChange: (e) => setField("village", e.target.value), placeholder: "e.g. Rajpur" }) }), _jsx(Field, { label: "Locality", hint: "Street, sector, ward or local area.", children: _jsx("input", { value: form.locality, onChange: (e) => setField("locality", e.target.value), placeholder: "Optional locality" }) }), _jsx(Field, { label: "PIN Code", hint: "6-digit Indian PIN code.", children: _jsx("input", { inputMode: "numeric", maxLength: 6, value: form.pin_code, onChange: (e) => setField("pin_code", e.target.value.replace(/\D/g, "")), placeholder: "e.g. 176061" }) }), _jsx(Field, { label: "Area", required: true, hint: "Numeric land area.", children: _jsx("input", { type: "number", min: "0", step: "0.01", value: form.area, onChange: (e) => setField("area", e.target.value), placeholder: "e.g. 1250" }) }), _jsx(SelectField, { label: "Area Unit", value: form.area_unit, onChange: (v) => setField("area_unit", v), options: AREA_UNITS }), _jsx(SelectField, { label: "Land Use", value: form.land_use, onChange: (v) => setField("land_use", v), options: LAND_USES, hint: "Select the current/planned land-use category." }), _jsx(Field, { label: "Latitude", required: true, hint: "Decimal latitude, e.g. 32.1100.", children: _jsx("input", { type: "number", step: "0.000001", value: form.latitude, onChange: (e) => setField("latitude", e.target.value), placeholder: "32.110000" }) }), _jsx(Field, { label: "Longitude", required: true, hint: "Decimal longitude, e.g. 76.5300.", children: _jsx("input", { type: "number", step: "0.000001", value: form.longitude, onChange: (e) => setField("longitude", e.target.value), placeholder: "76.530000" }) })] }), _jsxs("div", { className: "ls-reg-form-nav", children: [_jsx("button", { type: "button", className: "ls-reg-back", onClick: () => setStep(0), children: "Back" }), _jsxs("button", { type: "button", className: "ls-reg-next", onClick: () => setStep(2), children: ["Continue to Governance", _jsx(ShieldCheck, { size: 16 })] })] })] })), step === 2 && (_jsxs(_Fragment, { children: [_jsxs(Section, { number: "03", title: "Governance & Verification", subtitle: "Record status, registration, encumbrance, planning and approval information.", icon: _jsx(ShieldCheck, { size: 19 }), children: [_jsx(Field, { label: "RoR Number", hint: "Record of Rights reference, if available.", children: _jsx("input", { value: form.ror_number, onChange: (e) => setField("ror_number", e.target.value), placeholder: "e.g. ROR-1042" }) }), _jsx(SelectField, { label: "RoR Status", value: form.ror_status, onChange: (v) => setField("ror_status", v), options: ROR_STATUS }), _jsx(Field, { label: "Registration Number", hint: "Registration/document reference.", children: _jsx("input", { value: form.registration_number, onChange: (e) => setField("registration_number", e.target.value), placeholder: "e.g. REG-1042" }) }), _jsx(Field, { label: "Registration Date", hint: "Date of registration, if available.", children: _jsx("input", { type: "date", value: form.registration_date, onChange: (e) => setField("registration_date", e.target.value) }) }), _jsx(SelectField, { label: "Registration Status", value: form.registration_status, onChange: (v) => setField("registration_status", v), options: REGISTRATION_STATUS }), _jsx(SelectField, { label: "Encumbrance Status", value: form.encumbrance_status, onChange: (v) => setField("encumbrance_status", v), options: ENCUMBRANCE_STATUS, hint: "Choose Clear when no recorded encumbrance exists in the dataset." }), _jsx(SelectField, { label: "Mortgage Status", value: form.mortgage_status, onChange: (v) => setField("mortgage_status", v), options: MORTGAGE_STATUS }), _jsx(Field, { label: "Encumbrance Details", hint: "Optional notes about the restriction/mortgage.", children: _jsx("input", { value: form.encumbrance_details, onChange: (e) => setField("encumbrance_details", e.target.value), placeholder: "Add details if applicable" }) }), _jsx(Field, { label: "Master Plan Zone", hint: "Planning zone/reference.", children: _jsx("input", { value: form.master_plan_zone, onChange: (e) => setField("master_plan_zone", e.target.value), placeholder: "e.g. Zone A" }) }), _jsx(Field, { label: "Zoning", hint: "Optional zoning designation.", children: _jsx("input", { value: form.zoning, onChange: (e) => setField("zoning", e.target.value), placeholder: "e.g. Residential" }) }), _jsx(SelectField, { label: "Planning Status", value: form.development_restriction, onChange: (v) => setField("development_restriction", v), options: [
                                                        "None",
                                                        "Restricted",
                                                        "Review",
                                                    ], hint: "Development restriction status." }), _jsx(SelectField, { label: "Building Permission", value: form.building_permission_status, onChange: (v) => setField("building_permission_status", v), options: BUILDING_STATUS })] }), _jsxs("div", { className: "ls-reg-form-nav", children: [_jsx("button", { type: "button", className: "ls-reg-back", onClick: () => setStep(1), children: "Back" }), _jsxs("button", { type: "button", className: "ls-reg-next", onClick: () => setStep(3), children: ["Continue to Supporting Info", _jsx(FileText, { size: 16 })] })] })] })), step === 3 && (_jsxs(_Fragment, { children: [_jsxs(Section, { number: "04", title: "Tax, Utilities & Notes", subtitle: "Add fiscal, infrastructure and supporting information.", icon: _jsx(FileText, { size: 19 }), children: [_jsx(Field, { label: "Approval Number", hint: "Building approval reference, if applicable.", children: _jsx("input", { value: form.approval_number, onChange: (e) => setField("approval_number", e.target.value), placeholder: "e.g. BP-1042" }) }), _jsx(Field, { label: "Approval Date", hint: "Building approval date.", children: _jsx("input", { type: "date", value: form.approval_date, onChange: (e) => setField("approval_date", e.target.value) }) }), _jsx(Field, { label: "Property Tax ID", hint: "Parcel-linked tax reference.", children: _jsx("input", { value: form.property_tax_id, onChange: (e) => setField("property_tax_id", e.target.value), placeholder: "e.g. TAX-1042" }) }), _jsx(SelectField, { label: "Tax Status", value: form.tax_status, onChange: (v) => setField("tax_status", v), options: TAX_STATUS }), _jsx(Field, { label: "Tax Amount", hint: "Numeric tax amount, if known.", children: _jsx("input", { type: "number", min: "0", step: "0.01", value: form.tax_amount, onChange: (e) => setField("tax_amount", e.target.value), placeholder: "0" }) }), _jsx(Field, { label: "Last Payment Date", hint: "Latest tax payment date.", children: _jsx("input", { type: "date", value: form.last_payment_date, onChange: (e) => setField("last_payment_date", e.target.value) }) }), _jsx(Field, { label: "Utilities", hint: "Example: Water, Electricity, Sewerage.", children: _jsx("input", { value: form.utilities, onChange: (e) => setField("utilities", e.target.value), placeholder: "Water, Electricity" }) }), _jsx(Field, { label: "Infrastructure", hint: "Nearby or parcel-linked infrastructure.", children: _jsx("input", { value: form.infrastructure, onChange: (e) => setField("infrastructure", e.target.value), placeholder: "Road access" }) }), _jsx(Field, { label: "Environmental Restrictions", hint: "Optional environmental constraints.", children: _jsx("input", { value: form.environmental_restrictions, onChange: (e) => setField("environmental_restrictions", e.target.value), placeholder: "None" }) }), _jsx(Field, { label: "Valuation Reference", hint: "Optional valuation/reference number.", children: _jsx("input", { value: form.valuation_reference, onChange: (e) => setField("valuation_reference", e.target.value), placeholder: "e.g. VAL-1042" }) }), _jsx(Field, { label: "Address", hint: "Full address for the parcel.", children: _jsx("input", { value: form.locality, onChange: (e) => setField("locality", e.target.value), placeholder: "Enter address / locality" }) }), _jsx(Field, { label: "Notes / Evidence", hint: "Use this for source references or additional remarks.", children: _jsx("textarea", { value: form.notes, onChange: (e) => setField("notes", e.target.value), placeholder: "Add notes or evidence reference...", rows: 4 }) })] }), saveError && (_jsxs("div", { className: "ls-reg-form-error", children: [_jsx(Info, { size: 17 }), _jsx("span", { children: saveError })] })), _jsxs("div", { className: "ls-reg-form-nav", children: [_jsx("button", { type: "button", className: "ls-reg-back", onClick: () => setStep(2), disabled: saving, children: "Back" }), _jsx("button", { type: "submit", className: "ls-reg-save", disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "ls-reg-spinner" }), "Saving record..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { size: 17 }), "Save Land Record"] })) })] })] }))] })] }) }))] }));
}
