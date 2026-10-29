import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus, Phone, Briefcase, Building, FileText, Banknote, Clock, CalendarCheck, Shield, Star, ArrowLeft, Save, Camera, Upload,
  Eye, EyeOff, Trash2, Plus, X, GraduationCap, RefreshCw, CheckCircle, ExternalLink, Info, ChevronLeft, ChevronRight, KeyRound,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { staffService, Staff, StaffCertification } from "../../utils/supabase/staff-service";
import { AssignableRole } from "../../utils/supabase/roles-service";
import { shiftsService, Shift } from "../../utils/supabase/workforce-service";
import { useCurrency } from "../../utils/currency";
import { Badge, Field, Line, Note, Tone, cx, wf as s, toISODate, errorMessage, minutesLabel } from "./ui";

/** Full-page Add / Edit Employee form (Staffs & Trainers). */

type SectionId = "personal" | "contact" | "employment" | "department" | "documents" | "payroll" | "shifts" | "leave" | "emergency" | "additional";

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof UserPlus }> = [
  { id: "personal", label: "Personal Details", icon: UserPlus },
  { id: "contact", label: "Contact Details", icon: Phone },
  { id: "employment", label: "Employment & Role", icon: Briefcase },
  { id: "department", label: "Department & Reporting", icon: Building },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payroll", label: "Payroll & Benefits", icon: Banknote },
  { id: "shifts", label: "Shifts & Schedule", icon: Clock },
  { id: "leave", label: "Leave Policy", icon: CalendarCheck },
  { id: "emergency", label: "Emergency Contacts", icon: Shield },
  { id: "additional", label: "Additional & Access", icon: Star },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["Morning (6am–12pm)", "Afternoon (12pm–5pm)", "Evening (5pm–10pm)"];
const FALLBACK_ROLES = ["Receptionist", "Trainer", "Accountant", "Manager"];
/** Red focus-style ring for a field with a validation error (fields here are borderless). */
const ERROR_RING: React.CSSProperties = { boxShadow: "0 0 0 2px rgb(220 38 38 / 0.55)" };
// BG_120: residential address lines are capped (the profile JSON column itself is unbounded).
const MAX_ADDRESS_LINE_LENGTH = 255;

const DOC_TYPES = ["Emirates ID", "Passport", "Visa / Residency", "Work Permit", "Labour Card", "Employment Contract", "Other"];

interface Allowance { name: string; type: "fixed" | "pct"; value: string; }
interface DocItem { type: string; number: string; issue_date: string; expiry_date: string; url?: string; }
interface Contact { name: string; relationship: string; phone: string; email: string; }

export interface EmployeeProfile {
  personal: { first_name: string; middle_name: string; last_name: string; gender: string; marital_status: string; nationality: string; dob: string; national_id: string; passport_no: string; personal_email: string };
  contact: { address_line1: string; address_line2: string; city: string; state: string; country: string; postal_code: string; permanent_same: boolean; permanent_address: string };
  employment: { employment_type: string; designation: string; contract_start: string; contract_end: string; probation_end: string };
  department: { team: string; reporting_manager: string; supervisor: string; cost_center: string };
  documents: DocItem[];
  payroll: { pay_frequency: string; payment_method: string; bank_name: string; iban: string; effective_from: string; allowances: Allowance[] };
  leave: { policy: string; approver: string; annual_days: string; sick_days: string; accrual: string; carry_forward: string };
  emergency: Contact[];
  additional: { skills: string; notes: string };
}

const emptyProfile = (): EmployeeProfile => ({
  personal: { first_name: "", middle_name: "", last_name: "", gender: "", marital_status: "", nationality: "", dob: "", national_id: "", passport_no: "", personal_email: "" },
  contact: { address_line1: "", address_line2: "", city: "", state: "", country: "", postal_code: "", permanent_same: true, permanent_address: "" },
  employment: { employment_type: "Full-Time", designation: "", contract_start: "", contract_end: "", probation_end: "" },
  department: { team: "", reporting_manager: "", supervisor: "", cost_center: "" },
  documents: [],
  payroll: { pay_frequency: "Monthly", payment_method: "Bank Transfer", bank_name: "", iban: "", effective_from: "", allowances: [] },
  leave: { policy: "Standard", approver: "", annual_days: "30", sick_days: "15", accrual: "Monthly", carry_forward: "Up to 15 days" },
  emergency: [{ name: "", relationship: "", phone: "", email: "" }],
  additional: { skills: "", notes: "" },
});

/** Reads a stored profile, filling anything missing (older staff have none). */
export function parseProfile(json?: string | null, staff?: Partial<Staff>): EmployeeProfile {
  const base = emptyProfile();
  let p: Partial<EmployeeProfile> = {};
  try { p = json ? JSON.parse(json) : {}; } catch { p = {}; }
  const merged: EmployeeProfile = {
    personal: { ...base.personal, ...(p.personal ?? {}) },
    contact: { ...base.contact, ...(p.contact ?? {}) },
    employment: { ...base.employment, ...(p.employment ?? {}) },
    department: { ...base.department, ...(p.department ?? {}) },
    documents: Array.isArray(p.documents) ? p.documents : [],
    payroll: { ...base.payroll, ...(p.payroll ?? {}), allowances: Array.isArray(p.payroll?.allowances) ? p.payroll!.allowances : [] },
    leave: { ...base.leave, ...(p.leave ?? {}) },
    emergency: Array.isArray(p.emergency) && p.emergency.length ? p.emergency : base.emergency,
    additional: { ...base.additional, ...(p.additional ?? {}) },
  };
  if (!merged.personal.first_name && staff?.name) {
    const parts = staff.name.trim().split(/\s+/);
    merged.personal.first_name = parts[0] ?? "";
    merged.personal.last_name = parts.length > 1 ? parts[parts.length - 1] : "";
    merged.personal.middle_name = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
  }
  if (!merged.contact.address_line1 && staff?.address) merged.contact.address_line1 = staff.address;
  return merged;
}

const docStatus = (d: DocItem): { label: string; tone: Tone } => {
  if (!d.expiry_date) return d.url ? { label: "On file", tone: "green" } : { label: "Pending upload", tone: "blue" };
  const days = Math.round((new Date(`${d.expiry_date}T00:00:00`).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 60) return { label: `Expires in ${days}d`, tone: "amber" };
  return { label: "Valid", tone: "green" };
};

/** Center-crops an image file to a 300px square JPEG data URL. */
function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image"));
      img.onload = () => {
        const size = 300;
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface Props {
  mode: "add" | "edit";
  employee?: Staff | null;
  assignableRoles: AssignableRole[];
  branches: Array<{ id: number; branchName: string }>;
  departments: string[];
  staffList: Staff[];
  onCancel: () => void;
  onSaved: () => void;
  onNavigate?: (section: string) => void;
}

const roleLabel = (name: string) =>
  name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[_\s])(\w)/g, (_m, sep, c) => sep + c.toUpperCase()) : name;

export function EmployeeForm({ mode, employee, assignableRoles, branches, departments, staffList, onCancel, onSaved, onNavigate }: Props) {
  const { currencyCode, formatCurrency, currencySymbol } = useCurrency();
  const money = (n: number) => formatCurrency(n, { maximumFractionDigits: 2 });
  const isEdit = mode === "edit" && !!employee;

  const [section, setSection] = useState<SectionId>("personal");
  const [profile, setProfile] = useState<EmployeeProfile>(() => parseProfile(employee?.profile_json, employee ?? undefined));
  const [core, setCore] = useState(() => ({
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    role: employee?.role ?? "",
    department: employee?.department ?? "",
    branch: employee?.branch ?? (branches.length === 1 ? branches[0].branchName : ""),
    status: (employee?.status as string) ?? "active",
    join_date: employee?.join_date ? employee.join_date.slice(0, 10) : toISODate(new Date()),
    base_salary: employee?.base_salary ? String(employee.base_salary) : "",
    monthly_target: employee?.monthly_target ? String(employee.monthly_target) : "",
    photo_url: employee?.photo_url ?? "",
  }));
  const [certs, setCerts] = useState<StaffCertification[]>(employee?.certifications ?? []);
  const [schedule, setSchedule] = useState<Record<string, string[]>>(employee?.schedule ?? {});
  const [login, setLogin] = useState({ username: "", password: "", show: false });
  const [access, setAccess] = useState({ enabled: !!employee?.app_access_enabled, userId: employee?.user_id, username: employee?.app_username });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<{ id: number | null; from: string | null }>({ id: null, from: null });
  const [shiftChoice, setShiftChoice] = useState<string>("none");
  const [shiftFrom, setShiftFrom] = useState(toISODate(new Date()));
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    shiftsService.list().then(setShifts).catch(() => setShifts([]));
    if (isEdit) {
      shiftsService.schedules().then(list => {
        const me = list.find(x => String(x.staff_id) === String(employee!.id));
        if (me?.shift_id) {
          setCurrentShift({ id: me.shift_id, from: me.effective_from });
          setShiftChoice(String(me.shift_id));
        }
      }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof EmployeeProfile>(group: K, patch: Partial<EmployeeProfile[K]>) =>
    setProfile(p => ({ ...p, [group]: Array.isArray(p[group]) ? patch : { ...(p[group] as object), ...patch } }) as EmployeeProfile);

  const fullName = [profile.personal.first_name, profile.personal.middle_name, profile.personal.last_name].map(x => x.trim()).filter(Boolean).join(" ");
  const roleOptions = useMemo(() => {
    const opts = assignableRoles.length ? assignableRoles.map(r => roleLabel(r.role_name)) : [...FALLBACK_ROLES];
    if (core.role && !opts.some(o => o.toLowerCase() === core.role.toLowerCase())) opts.push(core.role);
    return opts;
  }, [assignableRoles, core.role]);
  const roleValue = roleOptions.find(o => o.toLowerCase() === core.role.toLowerCase()) ?? core.role;
  const managers = staffList.filter(x => String(x.id) !== String(employee?.id ?? ""));

  const basic = Number(core.base_salary) || 0;
  const allowanceAmount = (a: Allowance) => a.type === "pct" ? Math.round(basic * (Number(a.value) || 0)) / 100 : Number(a.value) || 0;
  const totalAllowances = profile.payroll.allowances.reduce((t, a) => t + allowanceAmount(a), 0);
  const selectedShift = shifts.find(x => String(x.id) === shiftChoice);

  // ── Validation ────────────────────────────────────────────────────────────
  const FIELD_SECTION: Record<string, SectionId> = {
    first_name: "personal", email: "contact", address_line1: "contact", address_line2: "contact",
    role: "employment", branch: "employment", username: "additional", password: "additional",
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!profile.personal.first_name.trim()) e.first_name = "First name is required";
    if (!core.email.trim()) e.email = "Work email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(core.email.trim())) e.email = "Enter a valid email address";
    // maxLength stops typing past the cap, but older records may already exceed it.
    if (profile.contact.address_line1.length > MAX_ADDRESS_LINE_LENGTH) e.address_line1 = `Address line 1 must be at most ${MAX_ADDRESS_LINE_LENGTH} characters`;
    if (profile.contact.address_line2.length > MAX_ADDRESS_LINE_LENGTH) e.address_line2 = `Address line 2 must be at most ${MAX_ADDRESS_LINE_LENGTH} characters`;
    if (!core.role) e.role = "Select a role";
    if (!core.branch) e.branch = "Select a branch";
    if (!isEdit) {
      const u = login.username.trim();
      if (u && !login.password) e.password = "Enter a password, or clear the username to skip app access";
      else if (login.password && !u) e.username = "Enter a username, or clear the password to skip app access";
      else if (login.password && login.password.length < 6) e.password = "Password must be at least 6 characters";
    }
    return e;
  };
  const sectionErrors = (id: SectionId) => Object.keys(errors).some(k => FIELD_SECTION[k] === id);
  const clearError = (k: string) => setErrors(p => { if (!p[k]) return p; const { [k]: _x, ...rest } = p; return rest; });

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = SECTIONS.find(sec => Object.keys(e).some(k => FIELD_SECTION[k] === sec.id));
      if (first) setSection(first.id);
      toast.error("Please complete the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const addressParts = [profile.contact.address_line1, profile.contact.address_line2, profile.contact.city, profile.contact.state, profile.contact.country, profile.contact.postal_code]
        .map(x => x.trim()).filter(Boolean);
      const payload = {
        name: fullName,
        email: core.email.trim(),
        phone: core.phone,
        role: core.role,
        department: core.department.trim(),
        branch: core.branch,
        status: core.status,
        join_date: core.join_date,
        base_salary: basic,
        monthly_target: Number(core.monthly_target) || 0,
        address: addressParts.join(", "),
        photo_url: core.photo_url || undefined,
        certifications: certs.filter(c => c.cert_name?.trim()),
        schedule,
        profile_json: JSON.stringify({ ...profile, documents: profile.documents.filter(d => d.type || d.number || d.url) }),
      };
      let saved: Staff;
      if (isEdit) {
        saved = await staffService.updateStaff(employee!.id, payload);
      } else {
        saved = await staffService.createStaff({
          ...payload,
          ...(login.username.trim() && login.password ? { app_username: login.username.trim(), app_password: login.password, app_role: core.role } : {}),
        } as any);
      }
      // Shift assignment
      const staffId = Number(saved?.id ?? employee?.id);
      if (staffId) {
        try {
          if (shiftChoice !== "none" && Number(shiftChoice) !== currentShift.id) {
            await shiftsService.assign({ shift_id: Number(shiftChoice), staff_ids: [staffId], effective_from: shiftFrom });
          } else if (shiftChoice === "none" && currentShift.id) {
            await shiftsService.unassign({ staff_ids: [staffId], effective_from: shiftFrom });
          }
        } catch (err) {
          toast.error(errorMessage(err, "Employee saved, but the shift couldn't be assigned"));
        }
      }
      toast.success(isEdit ? "Employee updated" : "Employee created");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, isEdit ? "Failed to update employee" : "Failed to create employee"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (enabled: boolean) => {
    if (!employee) return;
    try {
      const updated = await staffService.toggleStaffAccess(employee.id, enabled);
      setAccess(a => ({ ...a, enabled: !!updated.app_access_enabled }));
      toast.success(enabled ? "App access enabled" : "App access disabled");
    } catch (err) { toast.error(errorMessage(err, "Failed to change app access")); }
  };

  const setCredentials = async () => {
    if (!employee) return;
    const username = access.userId ? access.username! : login.username.trim();
    if (!username || login.password.length < 6) { toast.error("Enter a username and a password of at least 6 characters"); return; }
    try {
      const updated = await staffService.setStaffCredentials(employee.id, username, login.password, core.role || undefined);
      setAccess({ enabled: !!updated.app_access_enabled, userId: updated.user_id, username: updated.app_username });
      setLogin({ username: "", password: "", show: false });
      toast.success(access.userId ? "Password updated" : "App access created");
    } catch (err) { toast.error(errorMessage(err, "Failed to set credentials")); }
  };

  const uploadDoc = async (i: number, file: File) => {
    setUploading(`doc${i}`);
    try {
      const url = await staffService.uploadCertificationDocument(file);
      setProfile(p => ({ ...p, documents: p.documents.map((d, idx) => idx === i ? { ...d, url } : d) }));
    } catch (err) { toast.error(errorMessage(err, "Failed to upload document")); }
    finally { setUploading(null); }
  };

  const uploadCert = async (i: number, file: File) => {
    setUploading(`cert${i}`);
    try {
      const url = await staffService.uploadCertificationDocument(file);
      setCerts(c => c.map((x, idx) => idx === i ? { ...x, document_url: url } : x));
    } catch (err) { toast.error(errorMessage(err, "Failed to upload document")); }
    finally { setUploading(null); }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { setCore(c => ({ ...c, photo_url: "" })); const url = await cropToSquare(file); setCore(c => ({ ...c, photo_url: url })); }
    catch (err) { toast.error(errorMessage(err, "Couldn't use that photo")); }
  };

  const idx = SECTIONS.findIndex(x => x.id === section);
  const current = SECTIONS[idx];

  // ── Section bodies ────────────────────────────────────────────────────────
  const sel = (value: string, onChange: (v: string) => void, opts: string[], placeholder = "Select") => (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );

  const body: Record<SectionId, React.ReactNode> = {
    personal: (
      <div className={s.stack}>
        <div className={s.photoBox}>
          <div className={s.photo}>{core.photo_url ? <img src={core.photo_url} alt="" /> : <Camera size={22} />}</div>
          <div className={s.stack} style={{ gap: "0.375rem" }}>
            <span className={s.strong}>Profile photo</span>
            <span className={cx(s.small, s.muted)}>JPG or PNG — cropped to a square</span>
            <div className={s.row}>
              <Button type="button" size="sm" variant="outline" onClick={() => photoInput.current?.click()}><Upload className="h-4 w-4 mr-1" />{core.photo_url ? "Change" : "Upload photo"}</Button>
              {core.photo_url && <Button type="button" size="sm" variant="ghost" onClick={() => setCore(c => ({ ...c, photo_url: "" }))}><X className="h-4 w-4" /></Button>}
            </div>
          </div>
          <input ref={photoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />
        </div>
        <div className={s.grid3}>
          <Field label="First name" required error={errors.first_name}>
            <Input value={profile.personal.first_name} placeholder="e.g. Ahmed" style={errors.first_name ? ERROR_RING : undefined}
              onChange={e => { clearError("first_name"); set("personal", { first_name: e.target.value }); }} />
          </Field>
          <Field label="Middle name"><Input value={profile.personal.middle_name} placeholder="Optional" onChange={e => set("personal", { middle_name: e.target.value })} /></Field>
          <Field label="Last name"><Input value={profile.personal.last_name} placeholder="e.g. Al-Rashid" onChange={e => set("personal", { last_name: e.target.value })} /></Field>
        </div>
        <div className={s.grid2}>
          <Field label="Gender">{sel(profile.personal.gender, v => set("personal", { gender: v }), ["Male", "Female", "Other"])}</Field>
          <Field label="Marital status">{sel(profile.personal.marital_status, v => set("personal", { marital_status: v }), ["Single", "Married", "Divorced", "Widowed"])}</Field>
          <Field label="Nationality"><Input value={profile.personal.nationality} placeholder="e.g. UAE" onChange={e => set("personal", { nationality: e.target.value })} /></Field>
          <Field label="Date of birth"><Input type="date" value={profile.personal.dob} max={toISODate(new Date())} onChange={e => set("personal", { dob: e.target.value })} /></Field>
          <Field label="Emirates ID / National ID"><Input value={profile.personal.national_id} placeholder="784-XXXX-XXXXXXX-X" onChange={e => set("personal", { national_id: e.target.value })} /></Field>
          <Field label="Passport number"><Input value={profile.personal.passport_no} placeholder="A12345678" onChange={e => set("personal", { passport_no: e.target.value })} /></Field>
        </div>
      </div>
    ),
    contact: (
      <div className={s.stack}>
        <div className={s.grid2}>
          <Field label="Work email" required error={errors.email} hint="Used for the staff record and notifications">
            <Input type="email" value={core.email} placeholder="name@yourgym.com" style={errors.email ? ERROR_RING : undefined}
              onChange={e => { clearError("email"); setCore(c => ({ ...c, email: e.target.value })); }} />
          </Field>
          <Field label="Mobile number">
            <Input value={core.phone} placeholder="+971 50 123 4567" onChange={e => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) setCore(c => ({ ...c, phone: v })); }} />
          </Field>
          <Field label="Personal email"><Input type="email" value={profile.personal.personal_email} placeholder="Optional" onChange={e => set("personal", { personal_email: e.target.value })} /></Field>
        </div>
        <hr className={s.divider} />
        <span className={s.sectionLabel}>Residential address</span>
        <div className={s.grid2}>
          <Field label="Address line 1" error={errors.address_line1} hint={`${profile.contact.address_line1.length}/${MAX_ADDRESS_LINE_LENGTH}`}>
            <Input value={profile.contact.address_line1} placeholder="Building / street" maxLength={MAX_ADDRESS_LINE_LENGTH} style={errors.address_line1 ? ERROR_RING : undefined}
              onChange={e => { clearError("address_line1"); set("contact", { address_line1: e.target.value }); }} />
          </Field>
          <Field label="Address line 2" error={errors.address_line2} hint={`${profile.contact.address_line2.length}/${MAX_ADDRESS_LINE_LENGTH}`}>
            <Input value={profile.contact.address_line2} placeholder="Area / landmark" maxLength={MAX_ADDRESS_LINE_LENGTH} style={errors.address_line2 ? ERROR_RING : undefined}
              onChange={e => { clearError("address_line2"); set("contact", { address_line2: e.target.value }); }} />
          </Field>
          <Field label="City"><Input value={profile.contact.city} placeholder="e.g. Dubai" onChange={e => set("contact", { city: e.target.value })} /></Field>
          <Field label="Emirate / State"><Input value={profile.contact.state} onChange={e => set("contact", { state: e.target.value })} /></Field>
          <Field label="Country"><Input value={profile.contact.country} placeholder="e.g. UAE" onChange={e => set("contact", { country: e.target.value })} /></Field>
          <Field label="Postal code"><Input value={profile.contact.postal_code} onChange={e => set("contact", { postal_code: e.target.value })} /></Field>
        </div>
        <label className={s.row} style={{ cursor: "pointer" }}>
          <Switch checked={profile.contact.permanent_same} onCheckedChange={v => set("contact", { permanent_same: v })} />
          <span className={s.small}>Permanent address is the same as residential</span>
        </label>
        {!profile.contact.permanent_same && (
          <Field label="Permanent address"><Textarea rows={2} value={profile.contact.permanent_address} onChange={e => set("contact", { permanent_address: e.target.value })} /></Field>
        )}
      </div>
    ),
    employment: (
      <div className={s.stack}>
        <div className={s.grid2}>
          <Field label="Employee ID" hint={isEdit ? undefined : "Assigned automatically when saved"}>
            <Input value={employee?.staff_id ?? "Auto-generated"} readOnly disabled />
          </Field>
          <Field label="Joining date"><Input type="date" value={core.join_date} onChange={e => setCore(c => ({ ...c, join_date: e.target.value }))} /></Field>
          <Field label="Role" required error={errors.role} hint="Also controls what they can do in the app">
            <Select value={roleValue || undefined} onValueChange={v => { clearError("role"); setCore(c => ({ ...c, role: v })); }}>
              <SelectTrigger style={errors.role ? ERROR_RING : undefined}><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Designation / job title"><Input value={profile.employment.designation} placeholder="e.g. Senior Fitness Trainer" onChange={e => set("employment", { designation: e.target.value })} /></Field>
          <Field label="Employment type">{sel(profile.employment.employment_type, v => set("employment", { employment_type: v }), ["Full-Time", "Part-Time", "Contract", "Temporary", "Freelance"])}</Field>
          <Field label="Branch" required error={errors.branch}>
            <Select value={core.branch || undefined} onValueChange={v => { clearError("branch"); setCore(c => ({ ...c, branch: v })); }}>
              <SelectTrigger style={errors.branch ? ERROR_RING : undefined}><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.branchName}>{b.branchName}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Contract start"><Input type="date" value={profile.employment.contract_start} onChange={e => set("employment", { contract_start: e.target.value })} /></Field>
          <Field label="Contract end"><Input type="date" value={profile.employment.contract_end} onChange={e => set("employment", { contract_end: e.target.value })} /></Field>
          <Field label="Probation ends"><Input type="date" value={profile.employment.probation_end} onChange={e => set("employment", { probation_end: e.target.value })} /></Field>
          <Field label={`Monthly sales target (${currencySymbol})`} hint="Fine-tune per month in Target & Commission">
            <Input type="number" min={0} value={core.monthly_target} placeholder="0" onChange={e => setCore(c => ({ ...c, monthly_target: e.target.value }))} />
          </Field>
        </div>
      </div>
    ),
    department: (
      <div className={s.grid2}>
        <Field label="Department" hint="Pick one or type a new one">
          <Input list="wf-departments" value={core.department} placeholder="e.g. Personal Training" onChange={e => setCore(c => ({ ...c, department: e.target.value }))} />
          <datalist id="wf-departments">{Array.from(new Set(["Personal Training", "Group Classes", "Customer Service", "Specialized Training", "Sales", "Management", ...departments])).map(d => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label="Team"><Input value={profile.department.team} placeholder="e.g. Morning team" onChange={e => set("department", { team: e.target.value })} /></Field>
        <Field label="Reporting manager">
          <Select value={profile.department.reporting_manager || "none"} onValueChange={v => set("department", { reporting_manager: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">None</SelectItem>{managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}{m.role ? ` (${m.role})` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Direct supervisor">
          <Select value={profile.department.supervisor || "same"} onValueChange={v => set("department", { supervisor: v === "same" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="same">Same as manager</SelectItem>{managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Cost center"><Input value={profile.department.cost_center} placeholder="e.g. PT Studio" onChange={e => set("department", { cost_center: e.target.value })} /></Field>
      </div>
    ),
    documents: (
      <div className={s.stack}>
        {profile.documents.length === 0 && <Note tone="blue">No documents yet — add IDs, visas, contracts and permits to track their expiry.</Note>}
        {profile.documents.map((d, i) => {
          const st = docStatus(d);
          const upd = (patch: Partial<DocItem>) => setProfile(p => ({ ...p, documents: p.documents.map((x, k) => k === i ? { ...x, ...patch } : x) }));
          return (
            <div key={i} className={s.docCard}>
              <div className={s.spread}>
                <div className={s.row}><FileText size={16} color="var(--primary)" /><span className={s.strong}>{d.type || "Document"}</span></div>
                <div className={s.row}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <button type="button" className={s.iconBtn} data-tone="red" title="Remove" onClick={() => setProfile(p => ({ ...p, documents: p.documents.filter((_, k) => k !== i) }))}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className={s.grid4}>
                <Field label="Type">{sel(d.type, v => upd({ type: v }), DOC_TYPES)}</Field>
                <Field label="Document number"><Input value={d.number} onChange={e => upd({ number: e.target.value })} /></Field>
                <Field label="Issue date"><Input type="date" value={d.issue_date} onChange={e => upd({ issue_date: e.target.value })} /></Field>
                <Field label="Expiry date"><Input type="date" value={d.expiry_date} onChange={e => upd({ expiry_date: e.target.value })} /></Field>
              </div>
              <div className={s.row}>
                <label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadDoc(i, f); }} />
                  <span className={cx(s.badge)} data-tone="teal" style={{ cursor: "pointer", padding: "0.3rem 0.65rem" }}>
                    {uploading === `doc${i}` ? <RefreshCw size={12} /> : <Upload size={12} />}{uploading === `doc${i}` ? "Uploading…" : d.url ? "Replace file" : "Upload file"}
                  </span>
                </label>
                {d.url && <a href={staffService.resolveDocumentUrl(d.url)} target="_blank" rel="noopener noreferrer" className={s.badge} data-tone="blue" style={{ padding: "0.3rem 0.65rem" }}><Eye size={12} />Preview</a>}
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" className={s.dashedBtn}
          onClick={() => setProfile(p => ({ ...p, documents: [...p.documents, { type: "", number: "", issue_date: "", expiry_date: "" }] }))}>
          <Plus className="h-4 w-4 mr-1" />Add document
        </Button>

        <hr className={s.divider} />
        <div className={s.spread}>
          <span className={s.sectionLabel}>Trainer certifications</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setCerts(c => [...c, { cert_name: "", issuer: "", issue_date: "", expiry_date: "" }])}><Plus className="h-4 w-4 mr-1" />Add certification</Button>
        </div>
        {certs.length === 0 && <span className={cx(s.small, s.muted)}>No certifications on file.</span>}
        {certs.map((c, i) => {
          const upd = (patch: Partial<StaffCertification>) => setCerts(list => list.map((x, k) => k === i ? { ...x, ...patch } : x));
          return (
            <div key={i} className={s.docCard}>
              <div className={s.spread}>
                <div className={s.row}><GraduationCap size={16} color="var(--primary)" /><span className={s.strong}>{c.cert_name || `Certification ${i + 1}`}</span></div>
                <button type="button" className={s.iconBtn} data-tone="red" title="Remove" onClick={() => setCerts(list => list.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
              </div>
              <div className={s.grid4}>
                <Field label="Certification"><Input value={c.cert_name} placeholder="e.g. NASM-CPT" onChange={e => upd({ cert_name: e.target.value })} /></Field>
                <Field label="Issuing body"><Input value={c.issuer} placeholder="e.g. NASM" onChange={e => upd({ issuer: e.target.value })} /></Field>
                <Field label="Issue date"><Input type="date" value={c.issue_date} onChange={e => upd({ issue_date: e.target.value })} /></Field>
                <Field label="Expiry date"><Input type="date" value={c.expiry_date} onChange={e => upd({ expiry_date: e.target.value })} /></Field>
              </div>
              <div className={s.row}>
                <label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadCert(i, f); }} />
                  <span className={s.badge} data-tone="teal" style={{ cursor: "pointer", padding: "0.3rem 0.65rem" }}>
                    {uploading === `cert${i}` ? <RefreshCw size={12} /> : <Upload size={12} />}{uploading === `cert${i}` ? "Uploading…" : c.document_url ? "Replace file" : "Upload certificate"}
                  </span>
                </label>
                {c.document_url && <a href={staffService.resolveDocumentUrl(c.document_url)} target="_blank" rel="noopener noreferrer" className={s.badge} data-tone="blue" style={{ padding: "0.3rem 0.65rem" }}><Eye size={12} />View</a>}
              </div>
            </div>
          );
        })}
      </div>
    ),
    payroll: (
      <div className={s.stack}>
        <span className={s.sectionLabel}>Salary</span>
        <div className={s.grid2}>
          <Field label={`Basic salary (${currencySymbol})`} hint="Monthly; payroll's per-day and overtime rates come from it">
            <Input type="number" min={0} value={core.base_salary} placeholder="e.g. 8000" onChange={e => setCore(c => ({ ...c, base_salary: e.target.value }))} />
          </Field>
          <Field label="Pay frequency">{sel(profile.payroll.pay_frequency, v => set("payroll", { pay_frequency: v }), ["Monthly"])}</Field>
          <Field label="Payment method">{sel(profile.payroll.payment_method, v => set("payroll", { payment_method: v }), ["Bank Transfer", "Cash", "Cheque", "WPS"])}</Field>
          <Field label="Effective from"><Input type="date" value={profile.payroll.effective_from} onChange={e => set("payroll", { effective_from: e.target.value })} /></Field>
          <Field label="Bank name"><Input value={profile.payroll.bank_name} placeholder="e.g. Emirates NBD" onChange={e => set("payroll", { bank_name: e.target.value })} /></Field>
          <Field label="Account / IBAN"><Input value={profile.payroll.iban} placeholder="AE07 0331 2345 6789 0123 456" onChange={e => set("payroll", { iban: e.target.value.toUpperCase() })} /></Field>
        </div>
        <hr className={s.divider} />
        <span className={s.sectionLabel}>Allowances</span>
        {profile.payroll.allowances.map((a, i) => {
          const upd = (patch: Partial<Allowance>) => set("payroll", { allowances: profile.payroll.allowances.map((x, k) => k === i ? { ...x, ...patch } : x) });
          return (
            <div key={i} className={s.itemRow} style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) auto auto" }}>
              <Input className="h-9" value={a.name} placeholder="e.g. Housing allowance" onChange={e => upd({ name: e.target.value })} />
              <Select value={a.type} onValueChange={v => upd({ type: v as Allowance["type"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fixed amount</SelectItem><SelectItem value="pct">% of basic</SelectItem></SelectContent>
              </Select>
              <Input className="h-9" type="number" min={0} value={a.value} placeholder="0" onChange={e => upd({ value: e.target.value })} />
              <span className={cx(s.small, s.num)} style={{ minWidth: "5rem", textAlign: "right" }}>{money(allowanceAmount(a))}</span>
              <button type="button" className={s.iconBtn} data-tone="red" title="Remove" onClick={() => set("payroll", { allowances: profile.payroll.allowances.filter((_, k) => k !== i) })}><X size={14} /></button>
            </div>
          );
        })}
        <div className={s.row}>
          <Button type="button" size="sm" variant="outline" className={s.dashedBtn} style={{ width: "auto" }}
            onClick={() => set("payroll", { allowances: [...profile.payroll.allowances, { name: "", type: "fixed", value: "" }] })}><Plus className="h-4 w-4 mr-1" />Add allowance</Button>
          {profile.payroll.allowances.length === 0 && ["Housing", "Transport", "Food", "Communication"].map(n => (
            <Button key={n} type="button" size="sm" variant="ghost" onClick={() => set("payroll", { allowances: [...profile.payroll.allowances, { name: `${n} allowance`, type: "fixed", value: "" }] })}>+ {n}</Button>
          ))}
        </div>
        <div className={s.section} data-tone="teal">
          <div className={s.sectionTitle}>Salary preview</div>
          <Line label="Basic salary" value={money(basic)} />
          <Line label="Total allowances" value={money(totalAllowances)} />
          <Line label="Gross fixed salary / month" value={money(basic + totalAllowances)} total tone="teal" />
          <div className={s.cellSub} style={{ marginTop: 6 }}>Payroll adds approved overtime and commission, then deducts absences, advances and other deductions.</div>
        </div>
      </div>
    ),
    shifts: (
      <div className={s.stack}>
        <div className={s.grid2}>
          <Field label="Assigned shift" hint={currentShift.id ? `Current shift since ${currentShift.from ?? "—"}` : "Attendance and overtime are tracked against this shift"}>
            <Select value={shiftChoice} onValueChange={setShiftChoice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No shift (fixed salary, no attendance tracking)</SelectItem>
                {shifts.filter(x => x.status !== "inactive").map(x => (
                  <SelectItem key={x.id} value={String(x.id)}>{x.name} ({x.check_in}–{x.check_out}){x.status === "draft" ? " · draft" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {(shiftChoice !== (currentShift.id ? String(currentShift.id) : "none")) && (
            <Field label="Effective from"><Input type="date" value={shiftFrom} onChange={e => setShiftFrom(e.target.value)} /></Field>
          )}
        </div>
        {selectedShift && (
          <div className={s.section} data-tone="teal">
            <div className={s.chips} style={{ marginBottom: 6 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <span key={d} data-tone="teal" className={cx(s.chip, !selectedShift.work_days.includes(d) && s.chipOff)}>{d}</span>
              ))}
            </div>
            <Line label="Hours" value={`${selectedShift.check_in} – ${selectedShift.check_out}${selectedShift.overnight ? " (overnight)" : ""}`} />
            <Line label="Break" value={selectedShift.break_start ? `${selectedShift.break_start} – ${selectedShift.break_end}` : "None"} />
            <Line label="Net working time" value={`${minutesLabel(selectedShift.net_minutes)} / day`} />
            <Line label="Grace" value={`+${selectedShift.grace_in_minutes}m in · −${selectedShift.grace_out_minutes}m out`} />
            <Line label="Overtime" value={selectedShift.overtime_policy === "eligible" ? "Paid automatically" : selectedShift.overtime_policy === "approval" ? "Needs manager approval" : "Not eligible"} />
          </div>
        )}
        {shifts.length === 0 && <Note tone="amber">No shifts exist yet. Create them in Shifts & Schedules first.</Note>}
        <button type="button" className={cx(s.row, s.small)} style={{ background: "none", border: 0, padding: 0, color: "var(--primary)", cursor: "pointer", width: "fit-content" }}
          onClick={() => onNavigate?.("shifts-schedules")}>
          <ExternalLink size={13} />Manage all shifts & schedules
        </button>
        <hr className={s.divider} />
        <span className={s.sectionLabel}>Availability for bookings</span>
        <span className={cx(s.small, s.muted)}>When members can book sessions with this trainer (used by bookings and the mobile app).</span>
        <div className={s.tableWrap} style={{ borderRadius: "0.75rem", background: "color-mix(in srgb, var(--muted) 35%, transparent)" }}>
          <table className={s.table}>
            <thead><tr><th>Day</th>{SLOTS.map(x => <th key={x} className={s.center}>{x}</th>)}</tr></thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className={s.strong}>{day}</td>
                  {SLOTS.map(slot => {
                    const on = (schedule[day] || []).includes(slot);
                    return (
                      <td key={slot} className={s.center}>
                        <button type="button" className={cx(s.dayToggle, on && s.dayToggleOn)} style={{ minWidth: "2.25rem" }}
                          onClick={() => setSchedule(sch => ({ ...sch, [day]: on ? (sch[day] || []).filter(x => x !== slot) : [...(sch[day] || []), slot] }))}>
                          {on ? <CheckCircle size={14} /> : " "}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
    leave: (
      <div className={s.stack}>
        <div className={s.grid2}>
          <Field label="Leave policy">{sel(profile.leave.policy, v => set("leave", { policy: v }), ["Standard", "Trainer", "Management", "Custom"])}</Field>
          <Field label="Leave approver">
            <Select value={profile.leave.approver || "manager"} onValueChange={v => set("leave", { approver: v === "manager" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="manager">Reporting manager</SelectItem>{managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Annual leave (days / year)"><Input type="number" min={0} value={profile.leave.annual_days} onChange={e => set("leave", { annual_days: e.target.value })} /></Field>
          <Field label="Sick leave (days / year)"><Input type="number" min={0} value={profile.leave.sick_days} onChange={e => set("leave", { sick_days: e.target.value })} /></Field>
          <Field label="Accrual">{sel(profile.leave.accrual, v => set("leave", { accrual: v }), ["Monthly", "Upfront", "Custom"])}</Field>
          <Field label="Carry forward">{sel(profile.leave.carry_forward, v => set("leave", { carry_forward: v }), ["No carry forward", "Up to 15 days", "Up to 30 days", "All unused"])}</Field>
        </div>
        <Note tone="amber" icon={Info}>Entitlements are recorded for reference. Mark leave days as Paid or Unpaid Leave on Staff Attendance — unpaid leave is deducted in payroll.</Note>
      </div>
    ),
    emergency: (
      <div className={s.stack}>
        <span className={cx(s.small, s.muted)}>Who to call in case of a workplace incident.</span>
        {profile.emergency.map((c, i) => {
          const upd = (patch: Partial<Contact>) => setProfile(p => ({ ...p, emergency: p.emergency.map((x, k) => k === i ? { ...x, ...patch } : x) }));
          return (
            <div key={i} className={s.docCard}>
              <div className={s.spread}>
                <span className={s.strong}>Contact {i + 1}</span>
                {profile.emergency.length > 1 && <button type="button" className={s.iconBtn} data-tone="red" title="Remove" onClick={() => setProfile(p => ({ ...p, emergency: p.emergency.filter((_, k) => k !== i) }))}><Trash2 size={14} /></button>}
              </div>
              <div className={s.grid2}>
                <Field label="Full name"><Input value={c.name} placeholder="e.g. Ali Hassan" onChange={e => upd({ name: e.target.value })} /></Field>
                <Field label="Relationship"><Input value={c.relationship} placeholder="e.g. Brother" onChange={e => upd({ relationship: e.target.value })} /></Field>
                <Field label="Phone"><Input value={c.phone} placeholder="+971 XX XXX XXXX" onChange={e => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) upd({ phone: v }); }} /></Field>
                <Field label="Email"><Input type="email" value={c.email} placeholder="Optional" onChange={e => upd({ email: e.target.value })} /></Field>
              </div>
            </div>
          );
        })}
        {profile.emergency.length < 3 && (
          <Button type="button" variant="outline" className={s.dashedBtn} onClick={() => setProfile(p => ({ ...p, emergency: [...p.emergency, { name: "", relationship: "", phone: "", email: "" }] }))}>
            <Plus className="h-4 w-4 mr-1" />Add another contact
          </Button>
        )}
      </div>
    ),
    additional: (
      <div className={s.stack}>
        <Field label="Skills / specialization"><Input value={profile.additional.skills} placeholder="e.g. Weight loss, HIIT, Yoga, Martial arts" onChange={e => set("additional", { skills: e.target.value })} /></Field>
        <Field label="Internal notes"><Textarea rows={3} value={profile.additional.notes} placeholder="Onboarding notes, manager comments…" onChange={e => set("additional", { notes: e.target.value })} /></Field>
        <hr className={s.divider} />
        <span className={s.sectionLabel}><KeyRound size={12} style={{ display: "inline", marginRight: 4 }} />App access</span>
        {!isEdit && (
          <>
            <span className={cx(s.small, s.muted)}>Optional — give them a login for the staff app and web portal. Their role decides what they can access.</span>
            <div className={s.grid2}>
              <Field label="Username" error={errors.username}>
                <Input value={login.username} autoComplete="off" placeholder="e.g. ahmed.trainer" onChange={e => { clearError("username"); clearError("password"); setLogin(l => ({ ...l, username: e.target.value })); }} />
              </Field>
              <Field label="Password" error={errors.password}>
                <div style={{ position: "relative" }}>
                  <Input type={login.show ? "text" : "password"} autoComplete="new-password" placeholder="At least 6 characters" value={login.password} style={{ paddingRight: "2.25rem" }}
                    onChange={e => { clearError("password"); clearError("username"); setLogin(l => ({ ...l, password: e.target.value })); }} />
                  <button type="button" className={s.iconBtn} style={{ position: "absolute", right: 2, top: 2 }} onClick={() => setLogin(l => ({ ...l, show: !l.show }))}>{login.show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </Field>
            </div>
          </>
        )}
        {isEdit && access.userId && (
          <div className={s.stack} style={{ gap: "0.75rem" }}>
            <div className={s.spread}>
              <span className={s.small}>Username <span className={s.mono}>{access.username}</span></span>
              <label className={s.row}><span className={s.small}>{access.enabled ? "Enabled" : "Disabled"}</span><Switch checked={access.enabled} onCheckedChange={toggleAccess} /></label>
            </div>
            <div className={s.grid2} style={{ alignItems: "end" }}>
              <Field label="New password" hint="Also applies the role selected above">
                <Input type="password" autoComplete="new-password" value={login.password} onChange={e => setLogin(l => ({ ...l, password: e.target.value }))} />
              </Field>
              <div><Button type="button" variant="outline" disabled={!login.password} onClick={setCredentials}>Update password</Button></div>
            </div>
          </div>
        )}
        {isEdit && !access.userId && (
          <div className={s.stack} style={{ gap: "0.5rem" }}>
            <span className={cx(s.small, s.muted)}>No app login yet.</span>
            <div className={s.grid2} style={{ alignItems: "end" }}>
              <Field label="Username"><Input value={login.username} autoComplete="off" onChange={e => setLogin(l => ({ ...l, username: e.target.value }))} /></Field>
              <Field label="Password"><Input type="password" autoComplete="new-password" value={login.password} onChange={e => setLogin(l => ({ ...l, password: e.target.value }))} /></Field>
            </div>
            <div><Button type="button" variant="outline" disabled={!login.username || !login.password} onClick={setCredentials}>Create app login</Button></div>
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className={s.formShell}>
      <div className={s.formTop}>
        <div className={s.formTopLeft}>
          <Button variant="ghost" size="sm" onClick={onCancel}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <div className={s.stack} style={{ gap: 2 }}>
            <nav className={s.crumbs}>
              <span>Payroll & Employees</span><ChevronRight size={12} /><button type="button" onClick={onCancel}>Staffs & Trainers</button><ChevronRight size={12} />
              <span className={s.crumbCurrent}>{isEdit ? "Edit employee" : "Add employee"}</span>
            </nav>
            <span className={s.strong} style={{ fontSize: "var(--text-lg)" }}>{fullName || (isEdit ? employee!.name : "New employee")}</span>
          </div>
        </div>
        <div className={s.actions}>
          {isEdit && <Badge plain>{employee!.staff_id}</Badge>}
          <Select value={core.status} onValueChange={v => setCore(c => ({ ...c, status: v }))}>
            <SelectTrigger className="h-9" style={{ width: "8.5rem" }}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_leave">On leave</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={saving} onClick={save}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : isEdit ? "Save changes" : "Save employee"}</Button>
        </div>
      </div>

      <div className={s.formLayout}>
        <nav className={s.sectionNav}>
          {SECTIONS.map(sec => (
            <button key={sec.id} type="button" className={cx(s.sectionBtn, section === sec.id && s.sectionBtnActive)} onClick={() => setSection(sec.id)}>
              <sec.icon size={16} />{sec.label}
              {sectionErrors(sec.id) && <span className={s.sectionDot} aria-label="Has errors" />}
            </button>
          ))}
          <div className={s.sectionProgress}>Section {idx + 1} of {SECTIONS.length} · fields marked * are required</div>
        </nav>

        <div className={s.formCard}>
          <h2 className={s.formCardTitle}><current.icon size={18} />{current.label}</h2>
          {body[section]}
          <div className={s.formNav}>
            <Button variant="outline" disabled={idx === 0} onClick={() => setSection(SECTIONS[idx - 1].id)}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
            {idx < SECTIONS.length - 1
              ? <Button variant="outline" onClick={() => setSection(SECTIONS[idx + 1].id)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              : <Button disabled={saving} onClick={save}><Save className="h-4 w-4 mr-1" />{isEdit ? "Save changes" : "Save employee"}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
