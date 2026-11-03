import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, Calendar, Camera, CircleDollarSign, Clock, Download,
  Edit3, Eye, EyeOff, IdCard, Info, Loader2, Lock, LogOut, Mail, MapPin, Minus, Palette, Phone, Receipt as ReceiptIcon,
  RefreshCw, Save, Settings as SettingsIcon, ShieldCheck, ShoppingCart, Target, TrendingUp, Trophy, User, UserCheck, Users,
  Wallet, X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useCurrency } from "../utils/currency";
import { authService } from "../utils/supabase/auth-service";
import {
  staffService, Staff, StaffTarget, StaffPerformance, MyTransactions, MyAttendance,
} from "../utils/supabase/staff-service";
import { ThemeSettings } from "../components/settings/ThemeSettings";
import styles from "../components/analytics/community-analytics.module.css";
import rs from "../components/reports/reports-analytics.module.css";
import pf from "../components/profile/my-profile.module.css";

interface MyProfileProps {
  onNavigate?: (section: string) => void;
  /** Tab to open when the URL has no ?tab= (e.g. the sidebar's My Profile › Settings). */
  initialTab?: ProfileTab;
}

type ProfileTab = "personal" | "performance" | "targets" | "transactions" | "settings";
type IconT = React.ComponentType<{ size?: number; className?: string }>;

const TABS: { id: ProfileTab; label: string; icon: IconT }[] = [
  { id: "personal", label: "Personal", icon: User },
  { id: "performance", label: "Performance", icon: Activity },
  { id: "targets", label: "Targets", icon: Target },
  { id: "transactions", label: "Transactions", icon: Wallet },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_TONE: Record<string, string> = {
  Present: "green", Overtime: "blue", Late: "amber", "Early Departure": "amber", "Half Day": "orange", Absent: "red",
  "Incomplete Punch": "red", "Paid Leave": "violet", "Unpaid Leave": "gray", Holiday: "violet", "Weekly Off": "gray",
  Working: "blue", Scheduled: "gray", "No Shift": "gray",
};

function targetLabel(t: StaffTarget): string {
  const timeframe = t.timeframe ? t.timeframe.charAt(0).toUpperCase() + t.timeframe.slice(1) : "Revenue";
  const period = t.month ? `${MONTH_NAMES[t.month - 1]} ${t.year}` : `${t.year || ""}`;
  return `${t.scope === "institution" ? "Institution-wide" : timeframe} target${period ? ` — ${period}` : ""}`;
}

function targetStatus(t: StaffTarget): { label: string; tone: string } {
  if ((t.percentage ?? 0) >= 100) return { label: "Completed", tone: "green" };
  if (t.end_date && new Date(t.end_date) < new Date()) return { label: "Overdue", tone: "red" };
  return { label: "Active", tone: "blue" };
}

const fmtDate = (iso?: string | null, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, withTime ? "d MMM yyyy, HH:mm" : "d MMM yyyy");
};

function tenure(join: Date | null): string | null {
  if (!join) return null;
  const now = new Date();
  let months = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
  if (now.getDate() < join.getDate()) months -= 1;
  if (months < 1) return "Joined this month";
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ") + " with the gym";
}

function Delta({ pct }: { pct: number | null | undefined }) {
  if (pct == null || Number.isNaN(pct)) return null;
  if (Math.abs(pct) < 0.5) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0%</span>;
  const up = pct > 0;
  return (
    <span className={styles.delta} data-tone={up ? "good" : "bad"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(pct)}%
    </span>
  );
}

function Panel({ title, sub, icon: Icon, action, children }: {
  title: string; sub?: React.ReactNode; icon?: IconT; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icon && <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone="teal"><Icon size={14} /></span>}{title}
          </h3>
          {sub && <div className={styles.panelSub}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ icon: Icon, title, text, action }: { icon: IconT; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <Icon size={28} />
      <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
      <div style={{ maxWidth: "28rem", fontSize: "var(--text-xs)" }}>{text}</div>
      {action}
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value, hint, delta }: {
  icon: IconT; tone: string; label: string; value: string; hint?: React.ReactNode; delta?: React.ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={tone}><Icon size={14} /></span>
      </div>
      <div className={styles.kpiValueSm}>{value}</div>
      <div className={styles.kpiFoot}>{delta}{hint && <span>{hint}</span>}</div>
    </div>
  );
}

function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div className={pf.meter}>
      <div className={pf.meterFill} style={{ width: `${Math.max(0, Math.min(100, value))}%`, ["--fill" as any]: color }} />
    </div>
  );
}

function passwordStrength(p: string): number {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
  return s;
}

export function MyProfile({ onNavigate, initialTab = "personal" }: MyProfileProps) {
  const { formatCurrency } = useCurrency();
  const money = useCallback((n: number | null | undefined) => formatCurrency(Number(n) || 0, { maximumFractionDigits: 0 }), [formatCurrency]);
  const money2 = useCallback((n: number | null | undefined) => formatCurrency(Number(n) || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [formatCurrency]);
  const authUser = useMemo(() => authService.getCurrentUser(), []);

  // Active tab lives in the URL (?tab=performance) so tabs can be linked to and survive a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ProfileTab | null;
  const activeTab: ProfileTab = tabParam && TABS.some(t => t.id === tabParam) ? tabParam : initialTab;
  const openTab = (tab: ProfileTab) => setSearchParams(tab === initialTab ? {} : { tab }, { replace: true });

  // ── Profile ──
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [edited, setEdited] = useState({ name: "", email: "", phone: "", address: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const profile = await staffService.getMyProfile();
        if (!cancelled) setStaffProfile(profile);
      } catch (error) {
        console.error("Failed to load staff profile:", error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Photo (staff record, else saved on this device for the account) ──
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!authUser?.id) return;
    try {
      const saved = localStorage.getItem(`gymbios_photo_${authUser.id}`);
      if (saved) setLocalPhoto(saved);
    } catch { /* storage blocked */ }
  }, [authUser]);

  // ── Performance, attendance, targets, transactions ──
  const [performance, setPerformance] = useState<StaffPerformance | null>(null);
  const [perfState, setPerfState] = useState<"loading" | "ready" | "error">("loading");
  const loadPerformance = useCallback(async () => {
    setPerfState("loading");
    try {
      setPerformance(await staffService.getMyPerformance());
      setPerfState("ready");
    } catch (e) {
      console.error(e);
      setPerfState("error");
    }
  }, []);
  useEffect(() => { loadPerformance(); }, [loadPerformance]);

  const [attendance, setAttendance] = useState<MyAttendance | null>(null);
  useEffect(() => {
    staffService.getMyAttendance().then(setAttendance).catch(e => console.error("attendance", e));
  }, []);

  const [myTargets, setMyTargets] = useState<StaffTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  useEffect(() => {
    if (!staffProfile?.id) { setMyTargets([]); return; }
    let cancelled = false;
    setLoadingTargets(true);
    staffService.getTargets(undefined, undefined, undefined, Number(staffProfile.id))
      .then(t => { if (!cancelled) setMyTargets(t); })
      .catch(e => console.error("targets", e))
      .finally(() => { if (!cancelled) setLoadingTargets(false); });
    return () => { cancelled = true; };
  }, [staffProfile?.id]);

  const [txDays, setTxDays] = useState(90);
  const [txView, setTxView] = useState<"salary" | "advances" | "receipts" | "pos">("receipts");
  const [tx, setTx] = useState<MyTransactions | null>(null);
  const [txState, setTxState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const loadTransactions = useCallback(async (days: number) => {
    setTxState("loading");
    try {
      const data = await staffService.getMyTransactions(days);
      setTx(data);
      setTxState("ready");
    } catch (e) {
      console.error(e);
      setTxState("error");
    }
  }, []);
  // Loaded when the tab is first opened (and when the period changes).
  useEffect(() => { if (activeTab === "transactions") loadTransactions(txDays); }, [activeTab, txDays, loadTransactions]);
  useEffect(() => {
    if (tx?.linked && tx.salary_payments.length > 0 && txView === "receipts" && tx.receipts.length === 0) setTxView("salary");
  }, [tx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Password ──
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Derived identity ──
  const displayName = staffProfile?.name || authUser?.name || "User";
  const displayEmail = staffProfile?.email || authUser?.email || "";
  const displayPhone = staffProfile?.phone || "";
  const displayAddress = staffProfile?.address || "";
  const roleName = (authUser as any)?.roleName || authUser?.role || "";
  const displayRole = staffProfile?.role || (roleName ? String(roleName).replace(/^ROLE_/i, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()) : "");
  const joinDate = staffProfile?.join_date ? new Date(staffProfile.join_date) : null;
  const displayPhoto = staffProfile?.photo_url || localPhoto || "";
  const initials = displayName.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const targetsSummary = useMemo(() => {
    const total = myTargets.length;
    const completed = myTargets.filter(t => (t.percentage ?? 0) >= 100).length;
    return { total, completed, active: total - completed };
  }, [myTargets]);

  const attSummary = attendance?.summary;
  const attendanceRate = attSummary?.attendance_rate ?? null;
  const rev = performance?.revenue_target;
  const conv = performance?.conversion_target;

  // ── Actions ──
  const startEditing = () => {
    setEdited({ name: displayName, email: displayEmail, phone: displayPhone, address: displayAddress });
    setIsEditing(true);
  };

  const saveProfile = async () => {
    if (!staffProfile) return;
    if (!edited.name.trim() || !edited.email.trim()) { toast.error("Name and email are required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(edited.email.trim())) { toast.error("Enter a valid email address."); return; }
    setSavingProfile(true);
    try {
      const updated = await staffService.updateStaff(staffProfile.id, {
        name: edited.name.trim(), email: edited.email.trim(), phone: edited.phone.trim(), address: edited.address.trim(),
      });
      setStaffProfile(updated);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword) { toast.error("Enter your current password."); return; }
    if (newPassword.length < 8) { toast.error("The new password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("The new passwords don't match."); return; }
    if (newPassword === currentPassword) { toast.error("Choose a password different from the current one."); return; }
    setChangingPassword(true);
    const result = await authService.changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (result.success) {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Password changed");
    } else {
      toast.error(result.error || "Failed to change password.");
    }
  };

  const resizeImageToDataUrl = (file: File, size = 400): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load the selected image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas is not supported in this browser.")); return; }
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("The image must be under 5 MB."); return; }
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 400);
      if (staffProfile) {
        setStaffProfile(await staffService.updateStaff(staffProfile.id, { photo_url: dataUrl }));
      } else if (authUser?.id) {
        localStorage.setItem(`gymbios_photo_${authUser.id}`, dataUrl);
        setLocalPhoto(dataUrl);
        window.dispatchEvent(new Event("profile_photo_updated"));
      }
      setAvatarOpen(false);
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update the profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    window.location.href = "/";
  };

  const exportTransactions = () => {
    if (!tx) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    let header: string[] = [];
    let rows: unknown[][] = [];
    if (txView === "salary") {
      header = ["Month", "Year", "Net salary", "Gross", "Deductions", "Paid on", "Method", "Status"];
      rows = tx.salary_payments.map(p => [p.month, p.year, p.net_salary, p.gross ?? "", p.total_deductions ?? "", p.payment_date ?? "", p.method ?? "", p.status ?? ""]);
    } else if (txView === "advances") {
      header = ["Advance", "Type", "Requested", "Approved", "Recovered", "Balance", "Installments", "Status", "Requested on"];
      rows = tx.advances.map(a => [`ADV-${a.id}`, a.advance_type ?? "", a.requested_amount ?? "", a.approved_amount ?? "", a.total_deducted ?? "", a.balance ?? "", a.installment_count ?? "", a.status ?? "", a.request_date ?? ""]);
    } else if (txView === "receipts") {
      header = ["Receipt", "Date", "Member", "Plan / item", "Type", "Paid", "Billed", "Method", "Status"];
      rows = tx.receipts.map(r => [r.receipt_no ?? r.id, r.date ?? "", r.member_name ?? "", r.plan_name ?? "", r.transaction_type ?? "", r.paid_amount ?? "", r.amount ?? "", r.payment_method ?? "", r.status ?? ""]);
    } else {
      header = ["Sale", "Date", "Customer", "Method", "Total", "Refunded", "Net"];
      rows = tx.pos_sales.map(s => [s.transaction_number ?? s.id, s.date ?? "", s.member_name ?? "", s.payment_method ?? "", s.total, s.refunded, s.net]);
    }
    if (!rows.length) { toast.info("Nothing to export in this list."); return; }
    const csv = [header, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-${txView}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const strength = passwordStrength(newPassword);
  const strengthColor = ["#d03b3b", "#d03b3b", "#c98a00", "#0ca30c", "#0ca30c"][strength];
  const strengthText = ["Too short", "Weak", "Fair", "Good", "Strong"][strength];

  // ── Render ──
  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <div className={styles.subtitle}>Your details, performance, targets, pay and account settings in one place</div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.("notifications")}>
            <Bell className="h-4 w-4 mr-2" />Notifications
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />Sign Out
          </Button>
        </div>
      </div>

      {/* Identity + this month at a glance */}
      <div className={`${styles.card} ${pf.hero}`}>
        <div className={pf.who}>
          <div className={pf.avatarWrap}>
            <div className={pf.avatar}>
              {displayPhoto ? <img src={displayPhoto} alt={displayName} /> : initials}
            </div>
            <button type="button" className={pf.cameraBtn} onClick={() => setAvatarOpen(true)} title="Change profile picture" aria-label="Change profile picture">
              <Camera size={14} />
            </button>
          </div>
          <div style={{ minWidth: 0 }}>
            {loadingProfile ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
              <>
                <h2 className={pf.name}>{displayName}</h2>
                <div className={pf.roleRow}>
                  {displayRole && <span className={pf.pill}><BriefcaseBusiness size={12} />{displayRole}</span>}
                  {staffProfile?.department && <span className={pf.pill} style={{ ["--tone" as any]: "#6250d6" }}>{staffProfile.department}</span>}
                  {staffProfile
                    ? <span className={pf.pill} style={{ ["--tone" as any]: "#0ca30c" }}><UserCheck size={12} />Staff record linked</span>
                    : <span className={pf.pill} style={{ ["--tone" as any]: "#64748b" }}><ShieldCheck size={12} />Account only</span>}
                </div>
                <div className={pf.meta}>
                  {displayEmail && <span><Mail size={14} />{displayEmail}</span>}
                  {staffProfile?.staff_id && <span><IdCard size={14} />{staffProfile.staff_id}</span>}
                  {joinDate && <span><Calendar size={14} />{tenure(joinDate)}</span>}
                </div>
              </>
            )}
          </div>
        </div>
        <div className={pf.heroStats}>
          <div className={pf.heroStat}>
            <div className={pf.heroStatValue}>{perfState === "ready" && rev ? money(rev.achieved) : "—"}</div>
            <div className={pf.heroStatLabel}>Revenue · {performance?.period.label ?? "this month"}</div>
          </div>
          <div className={pf.heroStat}>
            <div className={pf.heroStatValue}>{perfState === "ready" && conv ? conv.achieved : "—"}</div>
            <div className={pf.heroStatLabel}>Conversions</div>
          </div>
          <div className={pf.heroStat}>
            <div className={pf.heroStatValue}>{staffProfile ? `${targetsSummary.completed}/${targetsSummary.total}` : "—"}</div>
            <div className={pf.heroStatLabel}>Targets met</div>
          </div>
          <div className={pf.heroStat}>
            <div className={pf.heroStatValue}>{attendanceRate != null ? `${attendanceRate}%` : "—"}</div>
            <div className={pf.heroStatLabel}>{attendance?.linked ? "Attendance this month" : "Attendance"}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${styles.card} ${rs.tabsBar}`} role="tablist" aria-label="Profile sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} data-active={activeTab === id} className={rs.tab} onClick={() => openTab(id)}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── Personal ── */}
      {activeTab === "personal" && (
        <div className={rs.tabBody} key="personal">
          <div className={pf.grid2}>
            <Panel
              title="Personal information" icon={User}
              sub={staffProfile ? "Your contact details on the staff record" : "From your login account"}
              action={staffProfile && !isEditing ? <Button variant="outline" size="sm" onClick={startEditing}><Edit3 className="h-4 w-4 mr-2" />Edit</Button> : undefined}
            >
              {!loadingProfile && !staffProfile && (
                <div className={pf.notice} style={{ ["--tone" as any]: "#c98a00" }}>
                  <Info size={16} />
                  <span>This login isn't linked to a staff record, so name, phone and address can't be edited here. Ask an admin to link it in Staffs &amp; Trainers. Your picture and password can still be changed.</span>
                </div>
              )}
              <div className={pf.info}>
                {([
                  ["Full name", "name", User, displayName],
                  ["Email address", "email", Mail, displayEmail],
                  ["Phone number", "phone", Phone, displayPhone],
                  ["Address", "address", MapPin, displayAddress],
                ] as const).map(([label, key, Icon, value]) => (
                  <label key={key} className={`${pf.infoItem} ${key === "address" ? "" : ""}`}>
                    <span className={pf.infoLabel}>{label}</span>
                    {isEditing ? (
                      <Input
                        type={key === "email" ? "email" : "text"}
                        value={edited[key]}
                        onChange={e => {
                          const v = e.target.value;
                          if (key === "phone" && !/^[\d+\-\s()]*$/.test(v)) return;
                          setEdited(p => ({ ...p, [key]: v }));
                        }}
                      />
                    ) : (
                      <span className={pf.infoValue}><Icon size={15} />{value || "—"}</span>
                    )}
                  </label>
                ))}
              </div>
              {isEditing && (
                <div className={pf.formActions}>
                  <Button variant="outline" size="sm" disabled={savingProfile} onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
                  <Button size="sm" disabled={savingProfile} onClick={saveProfile}>
                    {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save changes
                  </Button>
                </div>
              )}
            </Panel>

            <Panel title="Employment" icon={BriefcaseBusiness} sub={staffProfile ? "As recorded by your gym" : "Not linked to a staff record"}>
              {staffProfile ? (
                <div className={pf.info}>
                  {([
                    ["Employee ID", staffProfile.staff_id || "—"],
                    ["Role", staffProfile.role || "—"],
                    ["Department", staffProfile.department || "—"],
                    ["Branch", staffProfile.branch || "—"],
                    ["Joined", joinDate ? format(joinDate, "d MMM yyyy") : "—"],
                    ["Status", staffProfile.status ? staffProfile.status.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) : "—"],
                  ] as const).map(([label, value]) => (
                    <div key={label} className={pf.infoItem}>
                      <span className={pf.infoLabel}>{label}</span>
                      <span className={pf.infoValue} style={{ textTransform: label === "Role" ? "capitalize" : undefined }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={BriefcaseBusiness} title="No staff record" text={`You're signed in as ${displayRole || "a user"}. Employment details, shifts and payslips appear once this login is linked to a staff member.`} />
              )}
            </Panel>
          </div>

          <Panel
            title="My attendance" icon={Clock}
            sub={attendance?.linked ? `${format(new Date(), "MMMM yyyy")} so far · from your clock-ins and shift` : "Shift attendance for staff members"}
          >
            {!attendance ? (
              <div className={styles.empty}><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : !attendance.linked ? (
              <Empty icon={Clock} title="No attendance to show" text="Attendance is tracked for logins linked to a staff record with a shift." />
            ) : !attendance.days || attendance.days.every(d => d.status === "No Shift") ? (
              <Empty icon={Clock} title="No shift assigned" text="Once a shift is assigned in Shifts & Schedules, your days, hours and lateness show here." />
            ) : (
              <>
                <div className={rs.kpis4}>
                  <Tile icon={UserCheck} tone="green" label="Present" value={String(attSummary?.present ?? 0)} hint={`of ${(attSummary?.scheduled_days ?? 0) - (attSummary?.upcoming_days ?? 0)} days so far`} />
                  <Tile icon={X} tone="red" label="Absent" value={String(attSummary?.absent ?? 0)} hint={attSummary?.unpaid_leave ? `${attSummary.unpaid_leave} unpaid leave` : "days"} />
                  <Tile icon={Clock} tone="amber" label="Late arrivals" value={String(attSummary?.late_count ?? 0)} hint="days" />
                  <Tile icon={TrendingUp} tone="blue" label="Hours worked" value={`${attSummary?.actual_hours ?? 0}h`} hint={attSummary?.ot_hours ? `${attSummary.ot_hours}h overtime` : "this month"} />
                </div>
                <div className={pf.days}>
                  {[...attendance.days].filter(d => d.status !== "No Shift").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(d => (
                    <div key={d.date} className={pf.day}>
                      <span className={pf.dayDate}>{format(new Date(`${d.date}T00:00:00`), "EEE d MMM")}</span>
                      <span className={pf.dayTimes}>
                        {d.actual_in ? `${d.actual_in} – ${d.actual_out ?? "…"}` : d.scheduled ? `Shift ${d.scheduled_in}–${d.scheduled_out}` : "Day off"}
                        {d.worked_minutes ? ` · ${Math.floor(d.worked_minutes / 60)}h ${d.worked_minutes % 60}m` : ""}
                        {d.late_minutes ? ` · ${d.late_minutes} min late` : ""}
                      </span>
                      <span className={styles.status} data-tone={STATUS_TONE[d.status] ?? "gray"}
                        style={{ ["--st" as any]: `var(--tone)` }}>{d.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ── Performance ── */}
      {activeTab === "performance" && (
        <div className={rs.tabBody} key="performance">
          {perfState === "loading" ? (
            <div className={`${styles.card} ${styles.empty}`}><Loader2 className="h-5 w-5 animate-spin" />Loading your performance…</div>
          ) : perfState === "error" || !performance ? (
            <div className={styles.card}>
              <Empty icon={Activity} title="Couldn't load your performance" text="Something went wrong while calculating your figures."
                action={<Button variant="outline" size="sm" onClick={loadPerformance}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>} />
            </div>
          ) : (
            <>
              {!staffProfile && (
                <div className={pf.notice}>
                  <Info size={16} />
                  <span>These figures come from the activity recorded under your login — receipts, leads and follow-ups you created and POS sales you rang up.</span>
                </div>
              )}
              <div className={rs.kpis4}>
                <Tile icon={CircleDollarSign} tone="green" label="Revenue" value={money(performance.revenue_target.achieved)}
                  delta={<Delta pct={performance.summary.growth_percentage} />}
                  hint={performance.revenue_target.target > 0 ? `${performance.revenue_target.percentage}% of ${money(performance.revenue_target.target)}` : "vs last month"} />
                <Tile icon={UserCheck} tone="blue" label="Conversions" value={String(performance.conversion_target.achieved)}
                  hint={performance.conversion_target.target > 0 ? `${performance.conversion_target.percentage}% of ${performance.conversion_target.target}` : "no target set"} />
                <Tile icon={Users} tone="violet" label="Leads" value={String(performance.summary.lead_count)} hint={`${performance.breakdown.conversion_rate}% converted`} />
                <Tile icon={Trophy} tone="amber" label="Member rating" value={performance.summary.rating > 0 ? `${performance.summary.rating} / 5` : "—"}
                  hint={performance.summary.rating > 0 ? "from workout feedback" : "no ratings yet"} />
              </div>

              <div className={styles.row2}>
                <Panel title="Last 6 months" icon={TrendingUp} sub="Revenue (bars) and conversions (line) credited to you">
                  <div className={styles.chart}>
                    <ResponsiveContainer>
                      <ComposedChart data={performance.trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e9e8e3" />
                        <XAxis dataKey="label" tick={{ fill: "#898781", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e9e8e3" }} />
                        <YAxis yAxisId="rev" tick={{ fill: "#898781", fontSize: 11 }} tickLine={false} axisLine={false} width={64}
                          tickFormatter={v => formatCurrency(Number(v), { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions)} />
                        <YAxis yAxisId="conv" orientation="right" allowDecimals={false} tick={{ fill: "#898781", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip formatter={(v: number, name: string) => name === "Revenue" ? money(v) : v} />
                        <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line yAxisId="conv" type="monotone" dataKey="conversions" name="Conversions" stroke="#eb6834" strokeWidth={2.5} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Quality" icon={ShieldCheck} sub="How well leads and follow-ups turn out">
                  {([
                    ["Lead conversion", performance.breakdown.conversion_rate, "#2a78d6"],
                    ["Follow-ups completed", performance.breakdown.follow_up_completion, "#1baf7a"],
                    ["Member satisfaction", performance.breakdown.customer_satisfaction, "#6250d6"],
                  ] as const).map(([label, value, color]) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", marginBottom: 6 }}>
                        <span>{label}</span><b>{value}%</b>
                      </div>
                      <Meter value={value} color={color} />
                    </div>
                  ))}
                  {performance.motivation?.message && (
                    <div className={pf.notice} style={{ ["--tone" as any]: performance.motivation.status === "AT_RISK" ? "#d03b3b" : performance.motivation.status === "ACHIEVED" ? "#0ca30c" : "var(--primary)" }}>
                      <Target size={16} /><span>{performance.motivation.message}</span>
                    </div>
                  )}
                </Panel>
              </div>

              {performance.leaderboard.length > 0 && (
                <Panel title="Branch leaderboard" icon={Trophy} sub={`${performance.period.label} · ranked by conversions, then revenue`}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>#</th><th>Staff member</th><th className={styles.num}>Conversions</th><th className={styles.num}>Revenue</th></tr></thead>
                      <tbody>
                        {performance.leaderboard.map(l => (
                          <tr key={l.staff_id} style={l.current_user ? { background: "color-mix(in srgb, var(--primary) 7%, transparent)" } : undefined}>
                            <td style={{ fontWeight: 700 }}>{l.rank}</td>
                            <td style={{ fontWeight: l.current_user ? 700 : 500 }}>{l.staff_name}{l.current_user && <span className={pf.pill} style={{ marginLeft: 8 }}>You</span>}</td>
                            <td className={styles.num}>{l.conversion_count}</td>
                            <td className={styles.num}>{money(l.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.("my-performance")}><Activity className="h-4 w-4 mr-2" />Open full performance page</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Targets ── */}
      {activeTab === "targets" && (
        <div className={rs.tabBody} key="targets">
          {!staffProfile && !loadingProfile ? (
            <div className={styles.card}>
              <Empty icon={Target} title="No targets for this login" text="Targets are set per staff member in Set Targets. Link this login to a staff record to receive targets." />
            </div>
          ) : (
            <>
              <div className={rs.kpis4}>
                <Tile icon={Target} tone="blue" label="Targets" value={String(targetsSummary.total)} hint="assigned to you" />
                <Tile icon={Activity} tone="amber" label="In progress" value={String(targetsSummary.active)} hint="not yet met" />
                <Tile icon={Trophy} tone="green" label="Met" value={String(targetsSummary.completed)} hint="100% or more" />
                <Tile icon={TrendingUp} tone="violet" label="Success rate" value={targetsSummary.total ? `${Math.round(targetsSummary.completed / targetsSummary.total * 100)}%` : "—"} hint="targets met" />
              </div>
              <Panel title="My targets" icon={Target} sub="Revenue, sessions and new-client goals set for you"
                action={<Button variant="outline" size="sm" onClick={() => onNavigate?.("my-targets")}>Open My Targets</Button>}>
                {loadingTargets ? (
                  <div className={styles.empty}><Loader2 className="h-5 w-5 animate-spin" />Loading targets…</div>
                ) : myTargets.length === 0 ? (
                  <Empty icon={Target} title="No targets yet" text="Your manager hasn't set any targets for you." />
                ) : (
                  <div className={pf.targets}>
                    {myTargets.map(t => {
                      const st = targetStatus(t);
                      const pct = Number(t.percentage ?? 0);
                      return (
                        <div key={t.id} className={pf.target}>
                          <div className={pf.targetHead}>
                            <div>
                              <div className={pf.targetTitle}>{targetLabel(t)}</div>
                              <div className={pf.targetSub}>
                                {money(t.revenue_achieved)} of {money(t.revenue_target)} revenue
                                {t.sessions_target ? ` · ${t.sessions_achieved || 0}/${t.sessions_target} sessions` : ""}
                                {t.new_clients_target ? ` · ${t.new_clients_achieved || 0}/${t.new_clients_target} new clients` : ""}
                              </div>
                            </div>
                            <span className={pf.pill} style={{ ["--tone" as any]: st.tone === "green" ? "#0ca30c" : st.tone === "red" ? "#d03b3b" : "#2a78d6" }}>{st.label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1 }}><Meter value={pct} color={pct >= 100 ? "#0ca30c" : undefined} /></div>
                            <b style={{ fontSize: "var(--text-sm)", minWidth: "3rem", textAlign: "right" }}>{Math.round(pct)}%</b>
                          </div>
                          <div className={pf.targetSub}>
                            {t.end_date ? `Deadline ${fmtDate(t.end_date)}` : `Period ${t.month ? `${MONTH_NAMES[t.month - 1]} ${t.year}` : t.year}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ── Transactions ── */}
      {activeTab === "transactions" && (
        <div className={rs.tabBody} key="transactions">
          <div className={`${styles.card} ${styles.filters}`}>
            <div className={styles.chips} role="group" aria-label="Period">
              {[30, 90, 365].map(d => (
                <button key={d} type="button" className={styles.chip} data-active={txDays === d} aria-pressed={txDays === d} onClick={() => setTxDays(d)}>
                  {d === 365 ? "Last 12 months" : `Last ${d} days`}
                </button>
              ))}
            </div>
            <div className={styles.filterEnd} style={{ gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => loadTransactions(txDays)} disabled={txState === "loading"}>
                <RefreshCw className={`h-4 w-4 mr-2 ${txState === "loading" ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportTransactions} disabled={!tx}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            </div>
          </div>

          {txState === "error" ? (
            <div className={styles.card}>
              <Empty icon={Wallet} title="Couldn't load your transactions" text="Please try again in a moment."
                action={<Button variant="outline" size="sm" onClick={() => loadTransactions(txDays)}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>} />
            </div>
          ) : !tx ? (
            <div className={`${styles.card} ${styles.empty}`}><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>
          ) : (
            <>
              <div className={rs.kpis4}>
                <Tile icon={Wallet} tone="green" label="Salary received" value={tx.linked ? money(tx.summary.salary_paid_ytd) : "—"} hint={tx.linked ? `${new Date().getFullYear()} so far` : "no staff record"} />
                <Tile icon={CircleDollarSign} tone="orange" label="Advance owed" value={tx.linked ? money(tx.summary.advance_balance) : "—"} hint="still to be recovered" />
                <Tile icon={ReceiptIcon} tone="blue" label="Collected by you" value={money(tx.summary.collected)} hint={`${tx.summary.receipt_count} receipt${tx.summary.receipt_count === 1 ? "" : "s"}`} />
                <Tile icon={ShoppingCart} tone="violet" label="POS sales" value={money(tx.summary.pos_net)} hint={`${tx.summary.pos_count} sale${tx.summary.pos_count === 1 ? "" : "s"}, net of refunds`} />
              </div>

              <Panel title="Activity" icon={Wallet}
                sub={txView === "salary" || txView === "advances" ? "All time" : `Recorded under your login · last ${txDays === 365 ? "12 months" : `${txDays} days`}`}
                action={
                  <div className={styles.seg} role="tablist" aria-label="Transaction type">
                    {([
                      ["receipts", `Receipts (${tx.receipts.length})`],
                      ["pos", `POS sales (${tx.pos_sales.length})`],
                      ["salary", `Salary (${tx.salary_payments.length})`],
                      ["advances", `Advances (${tx.advances.length})`],
                    ] as const).map(([v, label]) => (
                      <button key={v} type="button" role="tab" aria-selected={txView === v} data-active={txView === v} className={styles.segBtn} onClick={() => setTxView(v)}>{label}</button>
                    ))}
                  </div>
                }
              >
                {txView === "salary" && (!tx.linked ? (
                  <Empty icon={Wallet} title="No payslips for this login" text="Salary payments are recorded against a staff member. Link this login to a staff record to see yours." />
                ) : tx.salary_payments.length === 0 ? (
                  <Empty icon={Wallet} title="No salary payments yet" text="Salary paid to you through Salary Payments shows here." />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Month</th><th>Paid on</th><th>Method</th><th className={styles.num}>Gross</th><th className={styles.num}>Deductions</th><th className={styles.num}>Net paid</th></tr></thead>
                      <tbody>
                        {tx.salary_payments.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.month} {p.year}</td>
                            <td>{fmtDate(p.payment_date)}</td>
                            <td className={styles.muted}>{p.method ?? "—"}</td>
                            <td className={styles.num}>{p.gross != null ? money2(p.gross) : "—"}</td>
                            <td className={styles.num}>{p.total_deductions != null ? money2(p.total_deductions) : "—"}</td>
                            <td className={styles.num} style={{ fontWeight: 700 }}>{money2(p.net_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {txView === "advances" && (!tx.linked ? (
                  <Empty icon={CircleDollarSign} title="No advances for this login" text="Salary advances are recorded against a staff member." />
                ) : tx.advances.length === 0 ? (
                  <Empty icon={CircleDollarSign} title="No salary advances" text="Advances you request and their repayments show here." />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Advance</th><th>Requested on</th><th>Status</th><th className={styles.num}>Approved</th><th className={styles.num}>Recovered</th><th className={styles.num}>Balance</th></tr></thead>
                      <tbody>
                        {tx.advances.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>ADV-{a.id}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{a.advance_type ?? "Advance"}{a.installment_count ? ` · ${a.installment_count} installment${a.installment_count > 1 ? "s" : ""}` : ""}</div></td>
                            <td>{fmtDate(a.request_date)}</td>
                            <td><span className={pf.pill} style={{ ["--tone" as any]: a.status === "Fully Repaid" ? "#0ca30c" : a.status === "Rejected" ? "#d03b3b" : a.status === "Active" ? "#2a78d6" : "#c98a00" }}>{a.status ?? "—"}</span></td>
                            <td className={styles.num}>{a.approved_amount ? money2(a.approved_amount) : "—"}</td>
                            <td className={styles.num}>{money2(a.total_deducted)}</td>
                            <td className={styles.num} style={{ fontWeight: 700 }}>{money2(a.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {txView === "receipts" && (tx.receipts.length === 0 ? (
                  <Empty icon={ReceiptIcon} title="No receipts recorded" text="Member payments you take at the front desk show here." />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Receipt</th><th>Date</th><th>Member</th><th>For</th><th>Method</th><th>Status</th><th className={styles.num}>Paid</th></tr></thead>
                      <tbody>
                        {tx.receipts.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{r.receipt_no ?? `#${r.id}`}</td>
                            <td>{fmtDate(r.date)}</td>
                            <td>{r.member_name ?? "—"}</td>
                            <td className={styles.muted}>{r.plan_name ?? r.transaction_type ?? "—"}</td>
                            <td className={styles.muted}>{r.payment_method ?? "—"}</td>
                            <td><span className={pf.pill} style={{ ["--tone" as any]: r.status === "Paid" ? "#0ca30c" : r.status === "Partial" ? "#c98a00" : "#64748b" }}>{r.status ?? "—"}</span></td>
                            <td className={styles.num} style={{ fontWeight: 700 }}>{money2(r.paid_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {txView === "pos" && (tx.pos_sales.length === 0 ? (
                  <Empty icon={ShoppingCart} title="No POS sales" text="Completed sales you ring up at the point of sale show here." />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Sale</th><th>Date</th><th>Customer</th><th>Method</th><th className={styles.num}>Total</th><th className={styles.num}>Refunded</th><th className={styles.num}>Net</th></tr></thead>
                      <tbody>
                        {tx.pos_sales.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.transaction_number ?? `#${s.id}`}</td>
                            <td>{fmtDate(s.date, true)}</td>
                            <td>{s.member_name || "Walk-in"}</td>
                            <td className={styles.muted}>{s.payment_method ?? "—"}</td>
                            <td className={styles.num}>{money2(s.total)}</td>
                            <td className={styles.num}>{Number(s.refunded) > 0 ? money2(s.refunded) : "—"}</td>
                            <td className={styles.num} style={{ fontWeight: 700 }}>{money2(s.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ── Settings ── */}
      {activeTab === "settings" && (
        <div className={rs.tabBody} key="settings">
          <div className={pf.grid2}>
            <Panel title="Change password" icon={Lock} sub="Use at least 8 characters; a mix of letters, numbers and symbols is stronger">
              <label className={pf.infoItem}>
                <span className={pf.infoLabel}>Current password</span>
                <div className={pf.pwField}>
                  <Input type={showPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button" className={pf.pwToggle} onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className={pf.infoItem}>
                <span className={pf.infoLabel}>New password</span>
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
                {newPassword && (
                  <>
                    <div className={pf.strength} aria-hidden>
                      {[1, 2, 3, 4].map(i => <span key={i} data-on={strength >= i} style={{ ["--st" as any]: strengthColor }} />)}
                    </div>
                    <span className={styles.note}>{strengthText}</span>
                  </>
                )}
              </label>
              <label className={pf.infoItem}>
                <span className={pf.infoLabel}>Confirm new password</span>
                <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                {confirmPassword && confirmPassword !== newPassword && <span className={styles.note} style={{ color: "var(--bad-ink)" }}>Doesn't match the new password</span>}
              </label>
              <div className={pf.formActions}>
                <Button size="sm" onClick={changePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                  {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}Change password
                </Button>
              </div>
            </Panel>

            <Panel title="Account" icon={ShieldCheck} sub="Your login and session">
              <div>
                <div className={pf.settingRow}>
                  <div><div className={pf.settingTitle}>Signed in as</div><div className={pf.settingText}>{displayEmail || displayName}{displayRole ? ` · ${displayRole}` : ""}</div></div>
                </div>
                <div className={pf.settingRow}>
                  <div><div className={pf.settingTitle}>Profile picture</div><div className={pf.settingText}>{staffProfile ? "Saved on your staff record." : "Saved on this device for your login."}</div></div>
                  <Button variant="outline" size="sm" onClick={() => setAvatarOpen(true)}><Camera className="h-4 w-4 mr-2" />Change</Button>
                </div>
                <div className={pf.settingRow}>
                  <div><div className={pf.settingTitle}>Notifications</div><div className={pf.settingText}>Alerts for approvals, payments, follow-ups and more.</div></div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate?.("notifications")}><Bell className="h-4 w-4 mr-2" />Open</Button>
                </div>
                <div className={pf.settingRow}>
                  <div><div className={pf.settingTitle}>Sign out</div><div className={pf.settingText}>End your session on this device.</div></div>
                  <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "var(--text-lg)" }}>
            <Palette size={18} className="text-primary" />Appearance
          </div>
          <ThemeSettings />
        </div>
      )}

      {/* Profile picture */}
      <Dialog open={avatarOpen} onOpenChange={o => !uploadingPhoto && setAvatarOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update profile picture</DialogTitle>
            <DialogDescription>Square images work best. It's resized to 400 × 400.</DialogDescription>
          </DialogHeader>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChosen} />
          <button type="button" className={pf.upload} disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()}>
            {uploadingPhoto ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Camera className="h-10 w-10 text-primary" />}
            <span style={{ fontWeight: 600 }}>{uploadingPhoto ? "Uploading…" : "Choose a photo"}</span>
            <span className={styles.note}>PNG or JPG, up to 5 MB</span>
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
