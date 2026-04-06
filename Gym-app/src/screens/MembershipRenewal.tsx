import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface MemberData {
  id: string;
  memberId: string;
  name: string;
  membershipPlan: string;
  membershipType: string;
  membershipStatus: string;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  monthlyFee: number;
  membershipFee: number;
  paymentStatus: string;
  outstandingBalance: number;
  totalVisits: number;
  freezeStartDate: string | null;
  freezeEndDate: string | null;
  freezeReason: string | null;
}

interface Plan {
  id: number;
  name: string;
  type: string;
  price: number;
  discount: number;
  description: string | null;
}

type PaymentMethod = "card" | "cash" | "bank";

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const daysLeft = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
};

const addDays = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (months: number): Date => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
};

const statusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "active": return "#10B981";
    case "frozen": return "#6366F1";
    case "expired": return "#EF4444";
    case "pending": return "#F59E0B";
    default: return "#6B7280";
  }
};

const normalizeMember = (raw: any): MemberData => ({
  id: String(raw.id ?? ""),
  memberId: raw.member_id ?? raw.memberId ?? "",
  name: raw.name ?? "",
  membershipPlan: raw.membership_plan ?? raw.membershipPlan ?? "",
  membershipType: raw.membership_type ?? raw.membershipType ?? "",
  membershipStatus: raw.membership_status ?? raw.membershipStatus ?? "",
  membershipStartDate: raw.membership_start_date ?? raw.membershipStartDate ?? null,
  membershipEndDate: raw.membership_end_date ?? raw.membershipEndDate ?? null,
  monthlyFee: Number(raw.monthly_fee ?? raw.monthlyFee ?? 0),
  membershipFee: Number(raw.membership_fee ?? raw.membershipFee ?? 0),
  paymentStatus: raw.payment_status ?? raw.paymentStatus ?? "",
  outstandingBalance: Number(raw.outstanding_balance ?? raw.outstandingBalance ?? 0),
  totalVisits: Number(raw.total_visits ?? raw.totalVisits ?? 0),
  freezeStartDate: raw.freeze_start_date ?? raw.freezeStartDate ?? null,
  freezeEndDate: raw.freeze_end_date ?? raw.freezeEndDate ?? null,
  freezeReason: raw.freeze_reason ?? raw.freezeReason ?? null,
});

const normalizePlan = (raw: any): Plan => ({
  id: Number(raw.id),
  name: raw.name ?? "",
  type: raw.type ?? raw.planType ?? "",
  price: Number(raw.price ?? 0),
  discount: Number(raw.discount ?? 0),
  description: raw.description ?? null,
});

// ── Sub-components ─────────────────────────────────────────────────────────

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "card",  label: "Credit / Debit Card", icon: "💳" },
  { id: "cash",  label: "Cash at Counter",     icon: "💵" },
  { id: "bank",  label: "Bank Transfer",        icon: "🏦" },
];

const FREEZE_PRESETS = [
  { label: "1 Month",  days: 30 },
  { label: "2 Months", days: 60 },
  { label: "3 Months", days: 90 },
];

const FREEZE_REASONS = ["Travel", "Injury / Medical", "Work Commitments", "Relocation", "Other"];

// ── Renew Modal ─────────────────────────────────────────────────────────────

interface RenewModalProps {
  visible: boolean;
  plan: Plan | null;
  member: MemberData;
  onClose: () => void;
  onSuccess: () => void;
  authHeader: Record<string, string>;
}

function RenewModal({ visible, plan, member, onClose, onSuccess, authHeader }: RenewModalProps) {
  const [step, setStep] = useState<"summary" | "payment" | "confirm" | "success">("summary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (visible) { setStep("summary"); setPaymentMethod("card"); }
  }, [visible]);

  if (!plan) return null;

  const finalPrice = plan.price - plan.discount;
  const newExpiry = addMonths(1);

  const handleConfirmRenew = async () => {
    setLoading(true);
    try {
      const body = {
        planName: plan.name,
        membershipEndDate: newExpiry.toISOString(),
        membershipFee: finalPrice,
        paymentStatus: paymentMethod === "card" ? "paid" : "pending",
        membershipType: member.membershipType || "Individual",
        membershipStatus: "active",
      };
      const res = await fetch(`${API_BASE_URL}/members/${member.id}/renew`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Renewal failed");
      }
      setStep("success");
    } catch (e: any) {
      Alert.alert("Renewal Failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Handle bar */}
          <View style={ms.handle} />

          {/* ── Success screen ── */}
          {step === "success" && (
            <View style={ms.successBox}>
              <Text style={ms.successIcon}>✅</Text>
              <Text style={ms.successTitle}>Membership Renewed!</Text>
              <Text style={ms.successSub}>
                {plan.name} is active until {fmt(newExpiry.toISOString())}.
                {paymentMethod !== "card" && "\n\nPayment is pending — please complete at the counter."}
              </Text>
              <TouchableOpacity
                style={ms.successBtn}
                onPress={() => { onClose(); onSuccess(); }}
              >
                <Text style={ms.successBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: Summary ── */}
          {step === "summary" && (
            <>
              <Text style={ms.title}>Renewal Summary</Text>

              {/* Plan card */}
              <View style={ms.planBox}>
                <Text style={ms.planName}>{plan.name}</Text>
                {plan.description ? <Text style={ms.planDesc}>{plan.description}</Text> : null}
                <View style={ms.priceRow}>
                  {plan.discount > 0 && (
                    <Text style={ms.originalPrice}>AED {plan.price}</Text>
                  )}
                  <Text style={ms.finalPrice}>AED {finalPrice}</Text>
                  {plan.discount > 0 && (
                    <View style={ms.saveBadge}>
                      <Text style={ms.saveText}>Save AED {plan.discount}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Details */}
              <View style={ms.detailsBox}>
                <View style={ms.detailRow}>
                  <Text style={ms.detailKey}>Current Expiry</Text>
                  <Text style={ms.detailVal}>{fmt(member.membershipEndDate)}</Text>
                </View>
                <View style={ms.detailRow}>
                  <Text style={ms.detailKey}>New Expiry</Text>
                  <Text style={[ms.detailVal, { color: "#10B981", fontWeight: "700" }]}>
                    {fmt(newExpiry.toISOString())}
                  </Text>
                </View>
                <View style={ms.detailRow}>
                  <Text style={ms.detailKey}>Member</Text>
                  <Text style={ms.detailVal}>{member.name}</Text>
                </View>
                <View style={ms.detailRow}>
                  <Text style={ms.detailKey}>Membership Type</Text>
                  <Text style={ms.detailVal}>{member.membershipType}</Text>
                </View>
              </View>

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                  <Text style={ms.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.primaryBtn} onPress={() => setStep("payment")}>
                  <Text style={ms.primaryBtnText}>Choose Payment →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: Payment method ── */}
          {step === "payment" && (
            <>
              <Text style={ms.title}>Payment Method</Text>
              <Text style={ms.subtitle}>How would you like to pay AED {finalPrice}?</Text>

              <View style={ms.methodList}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[ms.methodRow, paymentMethod === m.id && ms.methodRowActive]}
                    onPress={() => setPaymentMethod(m.id)}
                  >
                    <Text style={ms.methodIcon}>{m.icon}</Text>
                    <Text style={[ms.methodLabel, paymentMethod === m.id && ms.methodLabelActive]}>
                      {m.label}
                    </Text>
                    <View style={[ms.radio, paymentMethod === m.id && ms.radioActive]}>
                      {paymentMethod === m.id && <View style={ms.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod !== "card" && (
                <View style={ms.noteBox}>
                  <Text style={ms.noteText}>
                    ℹ️ {paymentMethod === "cash"
                      ? "Please visit the reception desk to complete your cash payment."
                      : "Bank transfer details will be provided at the counter."}
                  </Text>
                </View>
              )}

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={() => setStep("summary")}>
                  <Text style={ms.cancelBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.primaryBtn} onPress={() => setStep("confirm")}>
                  <Text style={ms.primaryBtnText}>Review Order →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === "confirm" && (
            <>
              <Text style={ms.title}>Confirm Renewal</Text>

              <View style={ms.confirmBox}>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Plan</Text>
                  <Text style={ms.confirmVal}>{plan.name}</Text>
                </View>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>New Expiry</Text>
                  <Text style={ms.confirmVal}>{fmt(newExpiry.toISOString())}</Text>
                </View>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Payment</Text>
                  <Text style={ms.confirmVal}>
                    {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                  </Text>
                </View>
                <View style={[ms.confirmRow, ms.confirmTotal]}>
                  <Text style={ms.confirmTotalKey}>Total</Text>
                  <Text style={ms.confirmTotalVal}>AED {finalPrice}</Text>
                </View>
              </View>

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={() => setStep("payment")}>
                  <Text style={ms.cancelBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handleConfirmRenew}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={ms.primaryBtnText}>Confirm ✓</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Freeze Modal ─────────────────────────────────────────────────────────────

interface FreezeModalProps {
  visible: boolean;
  member: MemberData;
  onClose: () => void;
  onSuccess: () => void;
  authHeader: Record<string, string>;
}

function FreezeModal({ visible, member, onClose, onSuccess, authHeader }: FreezeModalProps) {
  const [step, setStep] = useState<"duration" | "reason" | "confirm" | "success">("duration");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) { setStep("duration"); setSelectedPreset(null); setSelectedReason(""); }
  }, [visible]);

  const freezeUntil = selectedPreset !== null ? addDays(selectedPreset) : null;

  const handleConfirmFreeze = async () => {
    if (!freezeUntil || !selectedReason) return;
    setLoading(true);
    try {
      const dateStr = freezeUntil.toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE_URL}/members/${member.id}/freeze`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ freezeUntil: dateStr, reason: selectedReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Freeze failed");
      }
      setStep("success");
    } catch (e: any) {
      Alert.alert("Freeze Failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />

          {/* ── Success ── */}
          {step === "success" && (
            <View style={ms.successBox}>
              <Text style={ms.successIcon}>❄️</Text>
              <Text style={ms.successTitle}>Membership Frozen</Text>
              <Text style={ms.successSub}>
                Your membership is paused until {fmt(freezeUntil?.toISOString())}.{"\n"}
                Reason: {selectedReason}
              </Text>
              <TouchableOpacity
                style={[ms.successBtn, { backgroundColor: "#6366F1" }]}
                onPress={() => { onClose(); onSuccess(); }}
              >
                <Text style={ms.successBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: Duration ── */}
          {step === "duration" && (
            <>
              <Text style={ms.title}>Freeze Membership</Text>
              <Text style={ms.subtitle}>How long would you like to pause?</Text>

              <View style={fm.presetGrid}>
                {FREEZE_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.days}
                    style={[fm.presetChip, selectedPreset === p.days && fm.presetChipActive]}
                    onPress={() => setSelectedPreset(p.days)}
                  >
                    <Text style={[fm.presetLabel, selectedPreset === p.days && fm.presetLabelActive]}>
                      {p.label}
                    </Text>
                    <Text style={[fm.presetDate, selectedPreset === p.days && { color: "#fff" }]}>
                      until {fmt(addDays(p.days).toISOString())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedPreset !== null && (
                <View style={ms.noteBox}>
                  <Text style={ms.noteText}>
                    📅 Your membership will be paused until{" "}
                    <Text style={{ fontWeight: "700" }}>{fmt(freezeUntil?.toISOString())}</Text> and
                    resume automatically after that date.
                  </Text>
                </View>
              )}

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                  <Text style={ms.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.primaryBtn, { backgroundColor: "#6366F1" }, !selectedPreset && { opacity: 0.4 }]}
                  onPress={() => { if (selectedPreset) setStep("reason"); }}
                  disabled={!selectedPreset}
                >
                  <Text style={ms.primaryBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: Reason ── */}
          {step === "reason" && (
            <>
              <Text style={ms.title}>Reason for Freeze</Text>
              <Text style={ms.subtitle}>
                Freezing until {fmt(freezeUntil?.toISOString())}
              </Text>

              <View style={fm.reasonList}>
                {FREEZE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[fm.reasonRow, selectedReason === r && fm.reasonRowActive]}
                    onPress={() => setSelectedReason(r)}
                  >
                    <Text style={[fm.reasonLabel, selectedReason === r && fm.reasonLabelActive]}>{r}</Text>
                    <View style={[ms.radio, selectedReason === r && ms.radioActive]}>
                      {selectedReason === r && <View style={ms.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={() => setStep("duration")}>
                  <Text style={ms.cancelBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.primaryBtn, { backgroundColor: "#6366F1" }, !selectedReason && { opacity: 0.4 }]}
                  onPress={() => { if (selectedReason) setStep("confirm"); }}
                  disabled={!selectedReason}
                >
                  <Text style={ms.primaryBtnText}>Review →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === "confirm" && (
            <>
              <Text style={ms.title}>Confirm Freeze</Text>

              <View style={ms.confirmBox}>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Member</Text>
                  <Text style={ms.confirmVal}>{member.name}</Text>
                </View>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Current Plan</Text>
                  <Text style={ms.confirmVal}>{member.membershipPlan}</Text>
                </View>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Freeze Until</Text>
                  <Text style={[ms.confirmVal, { color: "#6366F1", fontWeight: "700" }]}>
                    {fmt(freezeUntil?.toISOString())}
                  </Text>
                </View>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Reason</Text>
                  <Text style={ms.confirmVal}>{selectedReason}</Text>
                </View>
                <View style={[ms.confirmRow, { borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 8, paddingTop: 12 }]}>
                  <Text style={[ms.confirmKey, { color: "#6B7280" }]}>
                    ℹ️ Your membership timer will pause and resume automatically after the freeze period.
                  </Text>
                </View>
              </View>

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={() => setStep("reason")}>
                  <Text style={ms.cancelBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.primaryBtn, { backgroundColor: "#6366F1" }, loading && { opacity: 0.6 }]}
                  onPress={handleConfirmFreeze}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={ms.primaryBtnText}>Confirm Freeze ❄️</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Unfreeze Modal ──────────────────────────────────────────────────────────

interface UnfreezeModalProps {
  visible: boolean;
  member: MemberData;
  onClose: () => void;
  onSuccess: () => void;
  authHeader: Record<string, string>;
}

function UnfreezeModal({ visible, member, onClose, onSuccess, authHeader }: UnfreezeModalProps) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (visible) setStep("confirm"); }, [visible]);

  const handleUnfreeze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/members/${member.id}/unfreeze`, {
        method: "POST",
        headers: authHeader,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Unfreeze failed");
      }
      setStep("success");
    } catch (e: any) {
      Alert.alert("Unfreeze Failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />

          {step === "success" && (
            <View style={ms.successBox}>
              <Text style={ms.successIcon}>🔓</Text>
              <Text style={ms.successTitle}>Membership Reactivated!</Text>
              <Text style={ms.successSub}>
                Your membership is now active again. Welcome back!
              </Text>
              <TouchableOpacity style={ms.successBtn} onPress={() => { onClose(); onSuccess(); }}>
                <Text style={ms.successBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "confirm" && (
            <>
              <Text style={ms.title}>Unfreeze Membership</Text>

              <View style={ms.confirmBox}>
                <View style={ms.confirmRow}>
                  <Text style={ms.confirmKey}>Currently Frozen Until</Text>
                  <Text style={[ms.confirmVal, { color: "#6366F1" }]}>{fmt(member.freezeEndDate)}</Text>
                </View>
                {member.freezeReason && (
                  <View style={ms.confirmRow}>
                    <Text style={ms.confirmKey}>Freeze Reason</Text>
                    <Text style={ms.confirmVal}>{member.freezeReason}</Text>
                  </View>
                )}
                <View style={[ms.confirmRow, { borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 8, paddingTop: 12 }]}>
                  <Text style={[ms.confirmKey, { color: "#6B7280" }]}>
                    ℹ️ Unfreezing will reactivate your membership immediately. The remaining frozen days
                    will be added back to your expiry date.
                  </Text>
                </View>
              </View>

              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                  <Text style={ms.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ms.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handleUnfreeze}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={ms.primaryBtnText}>Reactivate Now 🔓</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export function MembershipRenewal() {
  const { colors } = useSettings();
  const { user } = useAuth();

  const [member, setMember] = useState<MemberData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [renewPlan, setRenewPlan] = useState<Plan | null>(null);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [unfreezeOpen, setUnfreezeOpen] = useState(false);

  const token = user?.token ?? "";
  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = useCallback(async () => {
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const [memberRes, plansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/members/me`, { headers: authHeader }),
        fetch(`${API_BASE_URL}/plans?status=Active`, { headers: authHeader }),
      ]);
      if (memberRes.status === 404) {
        throw new Error(await memberRes.text().catch(() => "No membership record found."));
      }
      if (!memberRes.ok) throw new Error(`Error ${memberRes.status}`);
      if (!plansRes.ok) throw new Error(`Plans error ${plansRes.status}`);
      const [rawMember, rawPlans] = await Promise.all([memberRes.json(), plansRes.json()]);
      setMember(normalizeMember(rawMember));
      setPlans((rawPlans as any[]).map(normalizePlan));
    } catch (e: any) {
      setError(e.message ?? "Failed to load membership data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Loading / Error ────────────────────────────────────────────────────

  if (loading) {
    return (
      <GlassScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading membership…</Text>
        </View>
      </GlassScreen>
    );
  }

  if (error || !member) {
    return (
      <GlassScreen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Membership data not found."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </GlassScreen>
    );
  }

  const isFrozen = member.membershipStatus?.toLowerCase() === "frozen";
  const days = daysLeft(member.membershipEndDate);
  const fee = member.membershipFee || member.monthlyFee || 0;

  return (
    <GlassScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={isFrozen ? ["#1E1B4B", "#4338CA", "#6366F1"] : ["#0F172A", "#6366F1", "#818CF8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>
              {isFrozen ? "❄️ Membership Frozen" : "Membership Renewal"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isFrozen
                ? `Frozen until ${fmt(member.freezeEndDate)}`
                : member.membershipEndDate
                  ? `Active until ${fmt(member.membershipEndDate)}`
                  : "No expiry date set"}
            </Text>
          </LinearGradient>
        </GlassCard>

        {/* Status card */}
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusCardInner}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Current Plan</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {member.membershipPlan || "—"}{fee > 0 ? ` · AED ${fee}` : ""}
                </Text>
                <Text style={[styles.statusMeta, { color: colors.textMuted }]}>
                  {member.membershipType} · {member.memberId}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(member.membershipStatus) + "22" }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(member.membershipStatus) }]}>
                  {member.membershipStatus}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: days < 7 ? "#EF4444" : colors.text }]}>{days}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Days Left</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{member.totalVisits}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Visits</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: member.outstandingBalance > 0 ? "#EF4444" : "#10B981" }]}>
                  {member.outstandingBalance > 0 ? `AED ${member.outstandingBalance}` : "Clear"}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Balance</Text>
              </View>
            </View>

            <View style={styles.datesRow}>
              <Text style={[styles.dateItem, { color: colors.textMuted }]}>
                Start: {fmt(member.membershipStartDate)}
              </Text>
              <Text style={[styles.dateItem, { color: colors.textMuted }]}>
                Expiry: {fmt(member.membershipEndDate)}
              </Text>
            </View>

            {isFrozen && member.freezeEndDate && (
              <View style={styles.frozenBanner}>
                <Text style={styles.frozenText}>
                  ❄️ Frozen until {fmt(member.freezeEndDate)}
                  {member.freezeReason ? `  ·  ${member.freezeReason}` : ""}
                </Text>
              </View>
            )}

            {days < 7 && days > 0 && !isFrozen && (
              <View style={styles.expiryWarning}>
                <Text style={styles.expiryWarningText}>
                  ⚠️ Expiring in {days} day{days !== 1 ? "s" : ""}! Renew now to avoid interruption.
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {isFrozen ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#6366F1" }]}
              onPress={() => setUnfreezeOpen(true)}
            >
              <Text style={styles.actionButtonText}>🔓  Unfreeze</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#475569" }]}
              onPress={() => setFreezeOpen(true)}
            >
              <Text style={styles.actionButtonText}>❄️  Freeze</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Available Plans */}
        {plans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Plans</Text>
            <View style={styles.planList}>
              {plans.map((plan) => {
                const finalPrice = plan.price - plan.discount;
                const isCurrent = plan.name === member.membershipPlan;
                return (
                  <GlassCard key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
                    <View style={styles.planCardInner}>
                      <View style={styles.planHeader}>
                        <Text style={[styles.planLabel, { color: colors.text }]}>{plan.name}</Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.planPriceRow}>
                        {plan.discount > 0 && (
                          <Text style={styles.planOriginal}>AED {plan.price}  </Text>
                        )}
                        <Text style={[styles.planPrice, { color: colors.text }]}>AED {finalPrice}</Text>
                        {plan.discount > 0 && (
                          <View style={styles.planSaveBadge}>
                            <Text style={styles.planSaveText}>Save AED {plan.discount}</Text>
                          </View>
                        )}
                      </View>

                      {plan.description ? (
                        <Text style={[styles.planDesc, { color: colors.textMuted }]}>{plan.description}</Text>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.planButton, { backgroundColor: isCurrent ? "#10B981" : "#6366F1" }]}
                        onPress={() => setRenewPlan(plan)}
                      >
                        <Text style={styles.planButtonText}>
                          {isCurrent ? "🔄  Renew Same Plan" : "✨  Choose Plan"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <RenewModal
        visible={renewPlan !== null}
        plan={renewPlan}
        member={member}
        onClose={() => setRenewPlan(null)}
        onSuccess={loadData}
        authHeader={authHeader}
      />

      <FreezeModal
        visible={freezeOpen}
        member={member}
        onClose={() => setFreezeOpen(false)}
        onSuccess={loadData}
        authHeader={authHeader}
      />

      <UnfreezeModal
        visible={unfreezeOpen}
        member={member}
        onClose={() => setUnfreezeOpen(false)}
        onSuccess={loadData}
        authHeader={authHeader}
      />
    </GlassScreen>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryButton: { backgroundColor: "#6366F1", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "700" },

  heroShell: { marginBottom: 20 },
  hero: { borderRadius: 24, padding: 20 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  heroSubtitle: { color: "#E0E7FF", marginTop: 6 },

  statusCard: { borderRadius: 24, marginBottom: 16 },
  statusCardInner: { padding: 18 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  statusLeft: { flex: 1 },
  statusLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  statusValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  statusMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8, alignSelf: "flex-start" },
  statusBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 14 },

  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 2 },

  datesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  dateItem: { fontSize: 12 },

  frozenBanner: { backgroundColor: "#EEF2FF", borderRadius: 10, padding: 10, marginTop: 12 },
  frozenText: { color: "#6366F1", fontSize: 13, fontWeight: "600" },

  expiryWarning: { backgroundColor: "#FEF9C3", borderRadius: 10, padding: 10, marginTop: 12 },
  expiryWarningText: { color: "#92400E", fontSize: 13, fontWeight: "600" },

  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  planList: { gap: 12, marginBottom: 20 },
  planCard: { borderRadius: 24 },
  planCardActive: { borderWidth: 2, borderColor: "#10B981" },
  planCardInner: { padding: 18 },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  planLabel: { fontSize: 15, fontWeight: "700", flex: 1 },
  currentBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  currentBadgeText: { color: "#065F46", fontSize: 11, fontWeight: "700" },
  planPriceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 4 },
  planOriginal: { color: "#9CA3AF", textDecorationLine: "line-through", fontSize: 13 },
  planPrice: { fontSize: 16, fontWeight: "700" },
  planSaveBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 8 },
  planSaveText: { color: "#065F46", fontSize: 11, fontWeight: "700" },
  planDesc: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
  planButton: { paddingVertical: 12, borderRadius: 14, alignItems: "center", marginTop: 10 },
  planButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// Modal shared styles
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
    maxHeight: "90%",
  },
  handle: {
    width: 40, height: 4, backgroundColor: "#E2E8F0",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },

  // Plan box
  planBox: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  planName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  planDesc: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 },
  originalPrice: { color: "#9CA3AF", textDecorationLine: "line-through", fontSize: 14 },
  finalPrice: { fontSize: 24, fontWeight: "800", color: "#6366F1" },
  saveBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  saveText: { color: "#065F46", fontSize: 12, fontWeight: "700" },

  // Details
  detailsBox: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: "#E2E8F0", gap: 10,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailKey: { fontSize: 13, color: "#6B7280" },
  detailVal: { fontSize: 13, color: "#111827", fontWeight: "600" },

  // Payment methods
  methodList: { gap: 10, marginBottom: 16 },
  methodRow: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  methodRowActive: { borderColor: "#6366F1", backgroundColor: "#EEF2FF" },
  methodIcon: { fontSize: 20, marginRight: 12 },
  methodLabel: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  methodLabelActive: { color: "#4338CA", fontWeight: "700" },

  // Radio
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: "#6366F1" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#6366F1" },

  // Note
  noteBox: { backgroundColor: "#EFF6FF", borderRadius: 12, padding: 12, marginBottom: 16 },
  noteText: { color: "#1D4ED8", fontSize: 13, lineHeight: 20 },

  // Confirm box
  confirmBox: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: "#E2E8F0", gap: 12,
  },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  confirmKey: { fontSize: 13, color: "#6B7280", flex: 1 },
  confirmVal: { fontSize: 13, color: "#111827", fontWeight: "600", flex: 1, textAlign: "right" },
  confirmTotal: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 12 },
  confirmTotalKey: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  confirmTotalVal: { fontSize: 20, fontWeight: "800", color: "#6366F1", flex: 1, textAlign: "right" },

  // Buttons
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0",
  },
  cancelBtnText: { color: "#374151", fontWeight: "700", fontSize: 14 },
  primaryBtn: {
    flex: 1.5, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: "#111827",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Success
  successBox: { alignItems: "center", paddingVertical: 20 },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 },
  successSub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  successBtn: {
    backgroundColor: "#111827", paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 14, alignItems: "center",
  },
  successBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// Freeze-specific styles
const fm = StyleSheet.create({
  presetGrid: { gap: 10, marginBottom: 16 },
  presetChip: {
    padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  presetChipActive: { borderColor: "#6366F1", backgroundColor: "#6366F1" },
  presetLabel: { fontSize: 15, fontWeight: "700", color: "#374151" },
  presetLabelActive: { color: "#fff" },
  presetDate: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  reasonList: { gap: 10, marginBottom: 20 },
  reasonRow: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  reasonRowActive: { borderColor: "#6366F1", backgroundColor: "#EEF2FF" },
  reasonLabel: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  reasonLabelActive: { color: "#4338CA", fontWeight: "700" },
});
