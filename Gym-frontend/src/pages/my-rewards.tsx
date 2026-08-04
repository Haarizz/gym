// Route: /my-rewards
// Staff-facing page (this app has no member self-login portal): a staff member
// searches for and selects a member, then views/actions that member's referral
// rewards and wallet balance. Someone else wires the actual <Route> + sidebar
// entry in App.tsx.
import React, { useCallback, useEffect, useState } from "react";
import { useCurrency, CurrencyGlyph, CurrencyCode } from "../utils/currency";
import {
  Search,
  Gift,
  Wallet as WalletIcon,
  Copy,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { HiOutlineUserCircle, HiMiniCheckCircle, HiMiniExclamationTriangle } from "react-icons/hi2";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { membersService, Member as ApiMember } from "../utils/supabase/members-service";
import {
  rewardService,
  walletService,
  ReferralReward,
  RewardType,
  Wallet,
} from "../utils/supabase/reward-service";

// ── Local member shape (mirrors member-addons.tsx's picker) ─────────────────

interface Member {
  id: string;
  name: string;
  membershipId: string;
  currentPlan: string;
  validTill: Date;
  status: "Active" | "Expired" | "Frozen";
  phone: string;
}

function toLocalMember(m: ApiMember): Member {
  return {
    id: m.id,
    name: m.name,
    membershipId: m.member_id || m.id,
    currentPlan: m.membership_plan || m.membership_type || "—",
    validTill: m.membership_end_date ? new Date(m.membership_end_date) : new Date(),
    status: m.membership_status === "active" ? "Active" : m.membership_status === "frozen" ? "Frozen" : "Expired",
    phone: m.phone,
  };
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  WALLET_CREDIT: "Wallet Credit",
  MEMBERSHIP_EXTENSION: "Membership Extension",
  MEMBERSHIP_DISCOUNT: "Membership Discount",
  FREE_PT: "Free Personal Training",
  FREE_CLASS: "Free Class",
  COUPON: "Coupon",
  LOYALTY_POINTS: "Loyalty Points",
  GIFT: "Gift",
  CASH: "Cash",
};

function formatRewardType(type: RewardType): string {
  return REWARD_TYPE_LABELS[type] || type;
}

function getStatusBadgeClass(status: ReferralReward["status"]): string {
  switch (status) {
    case "AVAILABLE": return "bg-green-100 text-green-800 border-green-200";
    case "PENDING": return "bg-amber-100 text-amber-800 border-amber-200";
    case "CLAIMED": return "bg-blue-100 text-blue-800 border-blue-200";
    case "REDEEMED": return "bg-gray-100 text-gray-700 border-gray-200";
    case "EXPIRED":
    case "CANCELLED":
    default:
      return "bg-red-100 text-red-800 border-red-200";
  }
}

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Money-valued reward types get a currency glyph; everything else gets a
// type-specific unit (days / points / coupon code) or nothing extra.
function isMoneyType(type: RewardType): boolean {
  return type === "WALLET_CREDIT" || type === "CASH" || (type === "MEMBERSHIP_DISCOUNT");
}

export function MyRewards() {
  const { currencyCode } = useCurrency();

  // Member picker — mirrors member-addons.tsx's search/select pattern
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<ApiMember[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadMemberData = useCallback(async (member: Member) => {
    setLoading(true);
    try {
      const [rewardsRes, walletRes] = await Promise.all([
        rewardService.getByMember(member.membershipId),
        walletService.getWallet(member.membershipId),
      ]);
      setRewards(rewardsRes);
      setWallet(walletRes);
    } catch {
      toast.error("Failed to load rewards for this member");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadMemberData(selectedMember);
    } else {
      setRewards([]);
      setWallet(null);
    }
  }, [selectedMember, loadMemberData]);

  const refresh = () => {
    if (selectedMember) loadMemberData(selectedMember);
  };

  // Live search-as-you-type — mirrors member-addons.tsx
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 1) {
      membersService.searchMembers(value)
        .then(results => {
          setSearchSuggestions(results.slice(0, 6));
          setShowSuggestions(results.length > 0);
        })
        .catch(() => setSearchSuggestions([]));
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleMemberSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await membersService.searchMembers(searchQuery);
      if (results.length > 0) {
        const found = toLocalMember(results[0]);
        setSelectedMember(found);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        toast.success(`Member ${found.name} found!`);
      } else {
        toast.error("Member not found. Please check ID or name.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    }
  };

  const selectMemberFromSuggestions = (member: ApiMember) => {
    setSelectedMember(toLocalMember(member));
    setSearchQuery(member.name);
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  const getDaysUntilExpiry = (date: Date) => {
    const today = new Date();
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ── Reward actions ─────────────────────────────────────────────────────────

  const runAction = async (reward: ReferralReward, action: () => Promise<unknown>, successMsg: string) => {
    setActioningId(reward.id);
    try {
      await action();
      toast.success(successMsg);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  const handleUseDuringPayment = (reward: ReferralReward) =>
    runAction(reward, () => rewardService.redeem(reward.id), "Reward marked as used during payment");

  const handleClaimExtension = (reward: ReferralReward) =>
    runAction(reward, () => rewardService.redeem(reward.id), "Membership extension applied");

  const handleBookSession = (reward: ReferralReward, label: string) =>
    runAction(reward, () => rewardService.redeem(reward.id), `${label} marked as used`);

  const handleCopyCoupon = async (reward: ReferralReward) => {
    if (!reward.couponCode) {
      toast.error("No coupon code available for this reward");
      return;
    }
    try {
      await navigator.clipboard.writeText(reward.couponCode);
      toast.success(`Coupon code ${reward.couponCode} copied to clipboard`);
    } catch {
      toast.error("Failed to copy coupon code");
    }
  };

  const handleCollectGift = (reward: ReferralReward) =>
    runAction(reward, () => rewardService.redeem(reward.id), "Gift collection confirmed");

  const handleRequestCash = (reward: ReferralReward) =>
    runAction(reward, () => rewardService.claim(reward.id), "Cash request submitted for admin approval");

  // ── Reward value rendering ──────────────────────────────────────────────────

  const renderRewardValue = (reward: ReferralReward) => {
    if (reward.rewardType === "MEMBERSHIP_EXTENSION") {
      return <span>{reward.rewardValue ?? 0} Day{(reward.rewardValue ?? 0) === 1 ? "" : "s"}</span>;
    }
    if (reward.rewardType === "LOYALTY_POINTS") {
      return <span>{reward.rewardValue ?? 0} pts</span>;
    }
    if (reward.rewardType === "COUPON") {
      return (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
          {reward.couponCode || "—"}
        </span>
      );
    }
    if (reward.rewardType === "GIFT" || reward.rewardType === "FREE_PT" || reward.rewardType === "FREE_CLASS") {
      return null;
    }
    if (isMoneyType(reward.rewardType) && reward.rewardValue != null) {
      const code = (reward.currency as CurrencyCode) || currencyCode;
      return (
        <span className="inline-flex items-center gap-1 font-semibold">
          <CurrencyGlyph code={code} />
          {reward.rewardValue.toLocaleString()}
        </span>
      );
    }
    return reward.rewardValue != null ? <span>{reward.rewardValue}</span> : null;
  };

  const renderExpiry = (reward: ReferralReward) => {
    const days = getDaysUntil(reward.expiryDate);
    if (days === null) return <span className="text-muted-foreground">—</span>;
    if (days < 0) {
      return <span className="text-red-600 font-medium">{formatDate(reward.expiryDate)} (expired)</span>;
    }
    if (days <= 3) {
      return (
        <span className="text-amber-600 font-medium inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {formatDate(reward.expiryDate)}
        </span>
      );
    }
    return <span>{formatDate(reward.expiryDate)}</span>;
  };

  // ── Action button rendering ──────────────────────────────────────────────────

  const renderAction = (reward: ReferralReward) => {
    const busy = actioningId === reward.id;

    if (reward.status === "PENDING") {
      return <span className="text-xs text-amber-700 font-medium">Awaiting Approval</span>;
    }
    if (reward.status === "REDEEMED") {
      return <span className="text-xs text-muted-foreground font-medium">Redeemed</span>;
    }
    if (reward.status === "EXPIRED") {
      return <span className="text-xs text-muted-foreground font-medium">Expired</span>;
    }
    if (reward.status === "CANCELLED") {
      return <span className="text-xs text-muted-foreground font-medium">Cancelled</span>;
    }

    switch (reward.redemptionAction) {
      case "AUTO_WALLET":
        return <span className="text-xs text-muted-foreground font-medium">Auto-credited to wallet</span>;

      case "USE_DURING_PAYMENT":
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleUseDuringPayment(reward)}>
            {busy ? "Processing..." : "Use During Payment"}
          </Button>
        );

      case "EXTEND_MEMBERSHIP":
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleClaimExtension(reward)}>
            {busy ? "Processing..." : "Claim"}
          </Button>
        );

      case "BOOK_PT":
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleBookSession(reward, "Personal training session")}>
            {busy ? "Processing..." : "Book Session"}
          </Button>
        );

      case "BOOK_CLASS":
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleBookSession(reward, "Class")}>
            {busy ? "Processing..." : "Book Class"}
          </Button>
        );

      case "COPY_COUPON":
        return (
          <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={busy} onClick={() => handleCopyCoupon(reward)}>
            <Copy className="h-3.5 w-3.5" />
            Copy Coupon
          </Button>
        );

      case "COLLECT_GIFT":
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleCollectGift(reward)}>
            {busy ? "Processing..." : "Collect From Reception"}
          </Button>
        );

      case "REQUEST_CASH":
        if (reward.status === "CLAIMED") {
          return <span className="text-xs text-muted-foreground font-medium">Awaiting admin approval</span>;
        }
        return (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => handleRequestCash(reward)}>
            {busy ? "Processing..." : "Request Cash"}
          </Button>
        );

      default:
        return <span className="text-xs text-muted-foreground">—</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Rewards</h1>
          <p className="text-muted-foreground mt-2">
            Search a member to view and action their referral rewards
          </p>
        </div>
      </div>

      {/* Member search */}
          <div className="flex gap-2 relative max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by Member ID, Name, or Phone"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => { if (searchSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
                className="pl-10"
              />
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 rounded-xl border-2 border-border bg-white shadow-xl overflow-hidden">
                  {searchSuggestions.map((member) => (
                    <div
                      key={member.id}
                      onMouseDown={() => selectMemberFromSuggestions(member)}
                      className="px-4 py-2.5 hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-border last:border-b-0"
                    >
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {member.member_id || member.id} • {member.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleMemberSearch} className="shrink-0">
              Search
            </Button>
          </div>

          {/* Selected member summary card */}
          {selectedMember && (
            <div className="mt-4 max-w-xl rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shrink-0">
                    <HiOutlineUserCircle size={20} className="text-white block shrink-0" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedMember.name}</p>
                    <p className="text-[11px] text-muted-foreground">ID: {selectedMember.membershipId}</p>
                  </div>
                </div>
                <Badge className={selectedMember.status === "Active" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700"}>
                  <span className="flex items-center gap-1.5">
                    {selectedMember.status === "Active" && <HiMiniCheckCircle size={12} className="text-green-500 block shrink-0" />}
                    {selectedMember.status}
                  </span>
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-px bg-blue-100">
                <div className="bg-blue-50/60 px-4 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Current Plan</p>
                  <p className="text-xs font-semibold">{selectedMember.currentPlan}</p>
                </div>
                <div className="bg-blue-50/60 px-4 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Valid Till</p>
                  <p className={`text-xs font-semibold ${getDaysUntilExpiry(selectedMember.validTill) < 10 ? "text-red-600" : ""}`}>
                    {selectedMember.validTill.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  {getDaysUntilExpiry(selectedMember.validTill) < 10 && (
                    <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                      <HiMiniExclamationTriangle size={14} className="block shrink-0" /> Expires soon
                    </p>
                  )}
                </div>
                <div className="bg-blue-50/60 px-4 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Contact</p>
                  <p className="text-xs font-semibold">{selectedMember.phone}</p>
                </div>
              </div>
            </div>
          )}
        {!selectedMember ? (
          <Card className="border-primary/10 shadow-md">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Search for a member to view their rewards</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the search box above to find a member by ID, name, or phone.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Wallet balance summary */}
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow max-w-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
                <div className="p-2 rounded-lg bg-emerald-100">
                  <WalletIcon className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold inline-flex items-center gap-1.5">
                  <CurrencyGlyph code={currencyCode} />
                  {(wallet?.balance ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available credit for {selectedMember.name}
                </p>
              </CardContent>
            </Card>

            {/* Rewards grid */}
            {loading ? (
              <div className="text-center py-14 text-sm text-muted-foreground">Loading rewards...</div>
            ) : rewards.length === 0 ? (
              <Card className="border-primary/10 shadow-md">
                <CardContent className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <Gift className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">No rewards yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMember.name} has not earned any referral rewards yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Reward Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Generated Date</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.map((reward) => (
                        <TableRow key={reward.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-medium">{reward.rewardName}</TableCell>
                          <TableCell>{formatRewardType(reward.rewardType)}</TableCell>
                          <TableCell>{renderRewardValue(reward)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(reward.status)}>{reward.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(reward.generatedDate)}</TableCell>
                          <TableCell className={getDaysUntil(reward.expiryDate) !== null && getDaysUntil(reward.expiryDate)! < 0 ? 'text-red-600 font-medium' : ''}>
                            {renderExpiry(reward)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">
                            {reward.remarks || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderAction(reward)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
