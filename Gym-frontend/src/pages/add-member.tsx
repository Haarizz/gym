import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { plansService, Plan as MembershipPlanData } from '../utils/supabase/plans-service';
import { membersService } from '../utils/supabase/members-service';
import { accountHeadsService, AccountHead } from '../utils/supabase/account-heads-service';
import { staffService, Staff } from '../utils/supabase/staff-service';
import { promotionsService, PromotionApi } from '../utils/supabase/promotions-service';
import { referralService, ReferralResponse } from '../utils/supabase/referral-service';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { useBranch } from '../utils/branch-context';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { usePaymentManager } from '../payments/usePaymentManager';
import { PaymentAllocationPanel } from '../payments/PaymentAllocationPanel';
import { buildPaymentPayload } from '../payments/paymentPayload';
import { PAYMENT_TYPES } from '../payments/paymentModel';
import type { CreditCustomer } from '../payments/modals/CreditModal';
import {
  FaPlus,
  FaUser,
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaLocationDot,
  FaCamera,
  FaUpload,
  FaMagnifyingGlassPlus,
  FaUpDownLeftRight,
  FaCheck,
  FaXmark,
  FaArrowLeft,
  FaArrowRight,
  FaArrowsLeftRight,
  FaRotateLeft,
  FaVideo,
  FaCreditCard,
  FaDumbbell,
  FaHeart,
  FaGraduationCap,
  FaBuilding,
  FaDollarSign,
  FaEarthAmericas,
  FaCalendarDays,
  FaHashtag,
  FaFileCircleCheck,
  FaArrowsRotate,
  FaHeartPulse,
  FaCircleExclamation,
  FaPills,
  FaDroplet,
  FaRuler,
  FaWeightScale,
  FaPhoneVolume,
  FaShield,
  FaMobileScreen,
  FaKey,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa6';

// ISO Standard Country List - Comprehensive list of all countries
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort();

interface AddMemberProps {
  onNavigate?: (section: string) => void;
}

// Canonical label for each payment-method selection key, used consistently across
// the "Received Via" select, Mixed Payment breakdown, receipts, and the value sent
// to the backend as payment_method_used.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  check: 'Cheque',
  'bank-transfer': 'Bank Transfer',
  online: 'Online Payment',
  'multi-pay': 'Mixed',
  credit: 'Credit',
};

const CARD_TYPE_OPTIONS = ['Visa', 'Mastercard', 'RuPay', 'American Express', 'Maestro', 'Diners Club', 'Other'];
const ONLINE_PAYMENT_TYPE_OPTIONS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Samsung Pay', 'Apple Pay', 'Amazon Pay', 'UPI', 'Other'];

// A member must be at least this old — rejects today's date and other
// obviously-wrong entries (newborns, typos) while still allowing young
// children to be registered (BG_61).
const MIN_MEMBER_AGE_YEARS = 1;

// The latest Date of Birth selectable/acceptable: today minus the minimum age,
// as a "YYYY-MM-DD" string for use as the date input's max bound and for
// submit-time validation.
const getMaxDateOfBirth = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_MEMBER_AGE_YEARS);
  return d.toISOString().split('T')[0];
};

// Whole-years age as of today, from a "YYYY-MM-DD" date-of-birth string.
// Returns null for empty/invalid/future-dated input so callers can hide the
// Age readout instead of showing a nonsense value.
const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  if (birthDate > today) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function AddMember({ onNavigate }: AddMemberProps = {}) {
  const { memberId: routeMemberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currencyCode } = useCurrency();
  const { isAllBranches } = useBranch();
  const isEditMode = Boolean(routeMemberId);

  // A lead converted on the Leads page hands its contact info off here via router state
  // instead of the member being fabricated with no plan/payment info.
  const prefillLead = (location.state as { prefillLead?: { leadId: string; firstName: string; lastName: string; email: string; phone: string } } | null)?.prefillLead;

  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState([1]);
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [internalId, setInternalId] = useState<string | null>(null);
  
  // Payment popup state management
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [existingUserId, setExistingUserId] = useState<number | undefined>();
  const [existingAppUsername, setExistingAppUsername] = useState('');
  const [editNewAppUsername, setEditNewAppUsername] = useState('');
  const [editNewAppPassword, setEditNewAppPassword] = useState('');
  const [showEditNewAppPassword, setShowEditNewAppPassword] = useState(false);
  const [isSavingMemberCredentials, setIsSavingMemberCredentials] = useState(false);

  // Bank accounts pulled from Chart of Accounts (Ledger) for Bank Transfer payments
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  useEffect(() => {
    accountHeadsService.getBankAccounts()
      .then(setBankAccounts)
      .catch(err => console.error('Failed to load bank accounts:', err));
  }, []);

  // Staff list for "processed by" credit — which staff member should have this
  // sale count toward their revenue target, regardless of which account is logged in.
  const [staffOptions, setStaffOptions] = useState<Staff[]>([]);
  const [processedByStaffId, setProcessedByStaffId] = useState('');
  useEffect(() => {
    staffService.getStaff({}, 1, 500)
      .then(res => setStaffOptions(res.items))
      .catch(err => console.error('Failed to load staff list:', err));
  }, []);
  
  // Discount management state
  const [selectedDiscount, setSelectedDiscount] = useState<string>('');
  const [discountList, setDiscountList] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Promo code input state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromoCode, setIsValidatingPromoCode] = useState(false);
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);

  // Referral code input state
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [isValidatingReferralCode, setIsValidatingReferralCode] = useState(false);
  const [referralCodeApplied, setReferralCodeApplied] = useState(false);
  const [appliedReferralId, setAppliedReferralId] = useState<number | null>(null);
  // Snapshot of the applied referral's referee photo/name — lets front-desk staff
  // visually confirm the walk-in matches the photo captured when the referral was logged.
  const [appliedReferralInfo, setAppliedReferralInfo] = useState<{ refereeName: string; referrerName: string; refereePhoto?: string } | null>(null);

  // Find a pending referral by the new member's name/phone instead of requiring
  // them to know a code — covers the common case where a staff member logged
  // "referred by X" at referral-creation time but never handed out a code.
  const [refereeSearchQuery, setRefereeSearchQuery] = useState('');
  const [refereeSearchResults, setRefereeSearchResults] = useState<ReferralResponse[]>([]);
  const [isSearchingReferee, setIsSearchingReferee] = useState(false);

  useEffect(() => {
    const query = refereeSearchQuery.trim();
    if (query.length < 2 || referralCodeApplied) {
      setRefereeSearchResults([]);
      return;
    }
    setIsSearchingReferee(true);
    const timer = setTimeout(async () => {
      try {
        const { referrals } = await referralService.getReferrals({ status: 'pending', search: query, size: 5 });
        setRefereeSearchResults(referrals);
      } catch {
        setRefereeSearchResults([]);
      } finally {
        setIsSearchingReferee(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [refereeSearchQuery, referralCodeApplied]);

  // Track which promotion ID was used for redemption tracking
  const [appliedPromotionId, setAppliedPromotionId] = useState<number | null>(null);

  // Member ID is auto-generated by the backend after save
  
  // Family members management
  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, {
      id: `family-${Date.now()}`,
      name: '', relationship: '', isMinor: false,
      email: '', phone: '', dateOfBirth: '',
      membershipPlan: '', membershipFee: '',
      paymentMethod: 'cash', amountPaid: '', receivedVia: '',
      cardType: '', chequeNumber: '', chequeDate: '', bankName: '', bankAccountId: '',
      onlinePaymentType: '', providerName: '',
      minorFee: '',
      minorPaymentMethod: 'cash', minorAmountPaid: '', minorReceivedVia: '',
      minorCardType: '', minorChequeNumber: '', minorChequeDate: '', minorBankName: '', minorBankAccountId: '',
      minorOnlinePaymentType: '', minorProviderName: '',
    }]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== id));
  };

  // Uses the functional setState form so that calling this twice in a row within
  // the same handler (e.g. updating paymentMethod then amountPaid together) composes
  // correctly instead of the second call clobbering the first with a stale snapshot
  // of familyMembers.
  const updateFamilyMemberField = <K extends keyof FamilyMemberRow>(id: string, field: K, value: FamilyMemberRow[K]) => {
    setFamilyMembers(prev => prev.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  // Auto-fills a family member's fee when they select a plan (discount-adjusted,
  // mirroring getMembershipDetails() for the primary member).
  const getPlanPriceById = (planId: string) => {
    const plan = apiPlans.find(p => p.id.toString() === planId);
    if (!plan) return 0;
    const discounted = plan.discount && Number(plan.discount) > 0
      ? Number(plan.price) * (1 - Number(plan.discount) / 100)
      : Number(plan.price);
    return Math.round(discounted * 100) / 100;
  };

  // The selected primary-member plan, and whether it's a Family/Couple plan
  // configured for "family_head" billing — every family/couple member (adult
  // or minor) then folds into ONE invoice on the head instead of adults
  // billing independently.
  const getSelectedPrimaryPlan = () => apiPlans.find(p => p.id.toString() === formData.membershipPlan);
  const isFamilyHeadBillingMode = (): boolean =>
    (formData.membershipType === 'family' || formData.membershipType === 'couple')
    && getSelectedPrimaryPlan()?.familyBillingMode === 'family_head';

  // Mirrors MemberService.memberPriceForIndex() on the backend: price_per_member
  // for members within max_family_members, additional_member_price (falling back
  // to price_per_member) for every member beyond that cap.
  const computeFamilyHeadTotal = (plan: MembershipPlanData, totalMembers: number): number => {
    const perMember = Number(plan.pricePerMember) || 0;
    const max = plan.maxFamilyMembers != null && Number(plan.maxFamilyMembers) > 0
      ? Number(plan.maxFamilyMembers) : null;
    const extra = plan.additionalMemberPrice != null ? Number(plan.additionalMemberPrice) : perMember;
    let total = 0;
    for (let i = 0; i < totalMembers; i++) {
      total += (max !== null && i >= max) ? extra : perMember;
    }
    return Math.round(total * 100) / 100;
  };

  // "Individual" family billing (the non-family_head default): only minor
  // family members fold onto the head's own invoice/due — adults are billed
  // fully independently, so they're intentionally excluded from these totals.
  const getFamilyMinorFeeTotal = (): number => {
    if (formData.membershipType !== 'family' || isFamilyHeadBillingMode()) return 0;
    return familyMembers
      .filter(m => m.isMinor)
      .reduce((sum, m) => sum + (parseFloat(m.minorFee || '0') || 0), 0);
  };
  const getFamilyMinorUnpaidTotal = (): number => {
    if (formData.membershipType !== 'family' || isFamilyHeadBillingMode()) return 0;
    return familyMembers
      .filter(m => m.isMinor)
      .reduce((sum, m) => {
        const fee = parseFloat(m.minorFee || '0') || 0;
        const paid = parseFloat(m.minorAmountPaid || '0') || 0;
        return sum + Math.max(0, fee - paid);
      }, 0);
  };

  // Method-specific detail fields (Card/Cheque/Bank Transfer/Online Payment) shared
  // by both the adult and minor payment sections of a family member row — mirrors
  // the primary member's payment dialog fields (cardType/chequeNumber/.../providerName).
  const renderPaymentMethodDetails = (
    method: string,
    values: {
      cardType: string; chequeNumber: string; chequeDate: string; bankName: string;
      bankAccountId: string; onlinePaymentType: string; providerName: string;
    },
    onChange: (field: string, value: string) => void
  ) => {
    if (method === 'card') {
      return (
        <div>
          <Label className="text-sm text-gray-600 mb-1 block">Card Type</Label>
          <Select value={values.cardType || undefined} onValueChange={(v) => onChange('cardType', v)}>
            <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select card type" /></SelectTrigger>
            <SelectContent>
              {CARD_TYPE_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (method === 'check') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Cheque Number</Label>
            <Input value={values.chequeNumber} onChange={(e) => onChange('chequeNumber', e.target.value)} className="border-primary/20" />
          </div>
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Bank Name</Label>
            <Input value={values.bankName} onChange={(e) => onChange('bankName', e.target.value)} className="border-primary/20" />
          </div>
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Cheque Date</Label>
            <Input type="date" value={values.chequeDate} onChange={(e) => onChange('chequeDate', e.target.value)} className="border-primary/20" />
          </div>
        </div>
      );
    }
    if (method === 'bank-transfer') {
      return (
        <div>
          <Label className="text-sm text-gray-600 mb-1 block">Bank Account</Label>
          <Select value={values.bankAccountId || undefined} onValueChange={(v) => onChange('bankAccountId', v)}>
            <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select bank account" /></SelectTrigger>
            <SelectContent>
              {bankAccounts.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">No bank accounts found in Chart of Accounts</div>
              ) : (
                bankAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (method === 'online') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Online Payment Type</Label>
            <Select value={values.onlinePaymentType || undefined} onValueChange={(v) => onChange('onlinePaymentType', v)}>
              <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ONLINE_PAYMENT_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {values.onlinePaymentType === 'Other' && (
            <div>
              <Label className="text-sm text-gray-600 mb-1 block">Provider Name</Label>
              <Input value={values.providerName} onChange={(e) => onChange('providerName', e.target.value)} className="border-primary/20" />
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Builds a single PaymentSplitDTO-shaped leg for a family member's (adult or
  // minor) payment, snake_case to match the backend DTO.
  const buildFamilyMemberLeg = (methodKey: string, amount: number, vals: {
    cardType: string; chequeNumber: string; chequeDate: string; bankName: string; onlinePaymentType: string; providerName: string;
  }) => {
    const leg: any = { method: PAYMENT_METHOD_LABELS[methodKey] || methodKey, amount };
    if (methodKey === 'card') {
      leg.card_type = vals.cardType;
    } else if (methodKey === 'check') {
      leg.cheque_number = vals.chequeNumber;
      if (vals.bankName) leg.bank_name = vals.bankName;
      if (vals.chequeDate) leg.cheque_date = vals.chequeDate;
    } else if (methodKey === 'online') {
      leg.online_payment_type = vals.onlinePaymentType;
      if (vals.onlinePaymentType === 'Other') leg.provider_name = vals.providerName;
    }
    return [leg];
  };

  // Maps the generic field names used by renderPaymentMethodDetails onto the
  // minor-prefixed FamilyMemberRow fields, so the same renderer serves both sections.
  const minorPaymentFieldMap: Record<string, keyof FamilyMemberRow> = {
    cardType: 'minorCardType',
    chequeNumber: 'minorChequeNumber',
    chequeDate: 'minorChequeDate',
    bankName: 'minorBankName',
    bankAccountId: 'minorBankAccountId',
    onlinePaymentType: 'minorOnlinePaymentType',
    providerName: 'minorProviderName',
  };

  // Shared payment-capture UI for a family member row (used for both the adult's
  // own payment and a minor's optional payment) — mirrors the primary member's
  // payment model: Cash/Card/Cheque/Bank Transfer/Online Payment/Credit as the
  // method, with Credit additionally exposing "Received Via" + its own sub-details
  // once some amount is collected against it (matching PAYMENT_METHOD_LABELS).
  const renderPaymentCapture = (
    method: string,
    amountPaid: string,
    receivedVia: string,
    feeAmount: string,
    detailValues: {
      cardType: string; chequeNumber: string; chequeDate: string; bankName: string;
      bankAccountId: string; onlinePaymentType: string; providerName: string;
    },
    handlers: {
      onMethodChange: (val: string) => void;
      onAmountChange: (val: string) => void;
      onReceivedViaChange: (val: string) => void;
      onDetailChange: (field: string, value: string) => void;
    }
  ) => {
    const isCredit = method === 'credit';
    const paidNum = parseFloat(amountPaid || '0');
    const fullFee = parseFloat(feeAmount || '0');
    const effectiveMethod = isCredit ? receivedVia : method;
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Payment Method</Label>
            <Select value={method} onValueChange={handlers.onMethodChange}>
              <SelectTrigger className="border-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">
              {isCredit ? 'Amount Received Now (optional)' : 'Amount Paid Now'}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => handlers.onAmountChange(e.target.value)}
                placeholder="0.00"
                className="border-primary/20"
              />
              {fullFee > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlers.onAmountChange(feeAmount)}
                  disabled={paidNum === fullFee}
                  className="shrink-0 whitespace-nowrap"
                >
                  Full Amount
                </Button>
              )}
            </div>
          </div>
        </div>
        {isCredit && paidNum > 0 && (
          <div>
            <Label className="text-sm text-gray-600 mb-1 block">Received Via</Label>
            <Select value={receivedVia || undefined} onValueChange={handlers.onReceivedViaChange}>
              <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {renderPaymentMethodDetails(effectiveMethod, detailValues, handlers.onDetailChange)}
      </>
    );
  };
  
  // Active membership plans from backend
  const [apiPlans, setApiPlans] = useState<MembershipPlanData[]>([]);

  useEffect(() => {
    plansService.getPlans('Active')
      .then(data => setApiPlans(data))
      .catch(err => console.error('Failed to load membership plans:', err));
  }, []);

  // A member's own plan must always match the Membership Type selected above
  // (Individual/Couple/Family/Corporate) — e.g. an Individual member should
  // never be offered a Family-only plan. Nothing is excluded until a
  // membership type is actually chosen.
  const getFilteredMembershipPlans = () => {
    if (!formData.membershipType) return apiPlans;
    return apiPlans.filter(plan => plan.planType.toLowerCase() === formData.membershipType.toLowerCase());
  };

  // Initialize Member ID on component mount
  React.useEffect(() => {
    if (isEditMode && routeMemberId) {
      Promise.all([
        membersService.getMembers({ search: routeMemberId }),
        plansService.getPlans('Active')
      ]).then(([response, plans]) => {
        setApiPlans(plans);
        const member = response.members.find((m: any) => m.member_id === routeMemberId || m.id === routeMemberId);
        if (member) {
          // Parse the date strings if they exist, to fit the input format (YYYY-MM-DD)
          const formatToDateStr = (isoDate: string | undefined | null) => {
            if (!isoDate) return '';
            const d = new Date(isoDate);
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          };

          const names = (member.name || '').split(' ');
          const fName = names[0] || '';
          const lName = names.slice(1).join(' ') || '';

          // Resolve plan ID from plan name so end-date computation works
          const matchedPlan = plans.find((p: any) => p.name === member.membership_plan);

          setFormData(prev => ({
            ...prev,
            memberId: member.member_id || '',
            // Stored values are capitalized ("Couple"/"Family"/"Individual"/"Corporate")
            // but every card/conditional in this form compares against the lowercase
            // internal values ('couple'/'family'/...) — without lowercasing here, the
            // comparison silently fails, no card shows as selected, and re-saving falls
            // back to the selected plan's own category (e.g. overwriting a linked
            // Couple/Family member's type with their own plan's "Individual").
            membershipType: (member.membership_type || '').toLowerCase(),
            firstName: fName,
            lastName: lName,
            email: member.email || '',
            phone: member.phone || '',
            address: member.address || '',
            nationality: member.nationality || '',
            gender: member.gender || '',
            regDocNumber: member.reg_doc_number || '',
            regDocDate: formatToDateStr(member.reg_doc_date),
            joiningDate: formatToDateStr(member.join_date || member.membership_start_date),
            startDate: formatToDateStr(member.membership_start_date || member.join_date),
            endDate: formatToDateStr(member.membership_end_date || member.expiry_date),
            membershipPlan: matchedPlan ? matchedPlan.id.toString() : (member.membership_plan || ''),
            profilePhoto: member.photo_url || null,
            medicalConditions: member.medical_conditions || '',
            allergies: member.allergies || '',
            currentMedications: member.current_medications || '',
            chronicIllnesses: member.chronic_illnesses || '',
            bloodType: member.blood_type || '',
            dateOfBirth: formatToDateStr(member.date_of_birth),
            height: member.height?.toString() || '',
            weight: member.weight?.toString() || '',
            emergencyContact: member.emergency_contact || '',
            emergencyContactName: member.emergency_contact_name || '',
            emergencyContactPhone: member.emergency_contact_phone || '',
            healthNotes: member.health_notes || ''
          }));
          setInternalId(member.id);
          setExistingUserId(member.user_id);
          setExistingAppUsername(member.app_username || '');
        }
      }).catch((err: any) => {
        console.error("Failed to load member for edit", err);
        toast.error("Failed to load member details.");
      });
    }
  }, [isEditMode, routeMemberId]);

  // Check camera availability on component mount
  React.useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraAvailable(false);
          setCameraError('Camera not supported in this browser');
          return;
        }

        // Try to enumerate devices to check if camera exists
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          setCameraAvailable(false);
          setCameraError('No camera found on this device');
        } else {
          setCameraAvailable(true);
          setCameraError('');
        }
      } catch (error) {
        setCameraAvailable(false);
        setCameraError('Unable to check camera availability');
      }
    };

    checkCameraAvailability();
  }, []);
  
  // Load discount promotions from Promotions & Campaigns backend
  React.useEffect(() => {
    promotionsService.getActiveDiscountPromotions()
      .then(promotions => {
        // Map API promotions to the format used by the discount dropdown
        const discounts = promotions.map(p => ({
          id: String(p.id),
          apiId: p.id, // Numeric ID for API calls (redeem, etc.)
          name: p.name,
          type: p.type,
          discountType: p.discountType || 'percentage',
          discountValue: Number(p.discountValue) || 0,
          status: p.status,
          code: p.code || null,
          usageCount: p.usageCount || 0,
          usageLimit: p.usageLimit || null,
        }));
        setDiscountList(discounts);
      })
      .catch(err => {
        console.error('Failed to load discount promotions:', err);
        // Gracefully degrade — discount list stays empty
      });
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    memberId: '',
    membershipType: '', // Individual, Family, Corporate
    regDocNumber: '',
    regDocDate: '',
    firstName: prefillLead?.firstName ?? '',
    lastName: prefillLead?.lastName ?? '',
    email: prefillLead?.email ?? '',
    phone: prefillLead?.phone ?? '',
    address: '',
    nationality: '',
    gender: '',
    genderOther: '',
    joiningDate: '',
    startDate: '',
    endDate: '',    // existing end date loaded in edit mode
    membershipPlan: '',
    emergencyContact: '',
    profilePhoto: null as string | null,
    // Health Information Fields
    medicalConditions: '',
    allergies: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodType: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    chronicIllnesses: '',
    healthNotes: '',
    // App access credentials
    appUsername: '',
    appPassword: '',
  });

  useEffect(() => {
    if (prefillLead) {
      toast.info(`Pre-filled from converted lead: ${prefillLead.firstName} ${prefillLead.lastName}`.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Family members state — adults get a fully independent membership (own plan/
  // fee/payment); minors are billed to the family head instead of carrying their
  // own balance.
  type FamilyMemberRow = {
    id: string;
    name: string;
    relationship: string;
    isMinor: boolean;
    email: string;
    phone: string;
    dateOfBirth: string;
    membershipPlan: string;   // plan id, adult-only
    membershipFee: string;    // adult-only
    // Adult-only payment capture — mirrors the primary member's own payment fields:
    // paymentMethod is one of cash/card/check/bank-transfer/online/credit; amountPaid
    // is however much is being collected right now (defaults to the full fee for a
    // direct method, defaults to 0 for credit); receivedVia is the real method used
    // when a credit sale has SOME amount collected now.
    paymentMethod: string;
    amountPaid: string;
    receivedVia: string;
    cardType: string;
    chequeNumber: string;
    chequeDate: string;
    bankName: string;
    bankAccountId: string;
    onlinePaymentType: string;
    providerName: string;
    minorFee: string;         // minor-only: total amount to bill to the guardian
    // Minor-only payment capture — same model as the adult section above, but the
    // amount actually collected (if any) reduces the guardian's due instead of
    // creating an independent balance for the minor.
    minorPaymentMethod: string;
    minorAmountPaid: string;
    minorReceivedVia: string;
    minorCardType: string;
    minorChequeNumber: string;
    minorChequeDate: string;
    minorBankName: string;
    minorBankAccountId: string;
    minorOnlinePaymentType: string;
    minorProviderName: string;
  };
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);

  // Membership plan filters
  const [programFilter, setProgramFilter] = useState('all');

  // Enhanced camera functionality with better error handling
  const startCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported in this browser. Please use the photo upload option instead.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraDialogOpen(true);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = '';
      let instruction = '';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access was denied.';
          instruction = 'Please allow camera access in your browser settings and try again. You can also use the "Upload Photo" option instead.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          instruction = 'Please use the "Upload Photo" option to add a member photo.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is already in use by another application.';
          instruction = 'Please close other applications using the camera and try again, or use the "Upload Photo" option.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera does not support the required settings.';
          instruction = 'Please try again or use the "Upload Photo" option.';
          break;
        case 'SecurityError':
          errorMessage = 'Camera access is blocked due to security restrictions.';
          instruction = 'This usually happens on non-HTTPS sites. Please use the "Upload Photo" option instead.';
          break;
        default:
          errorMessage = 'Unable to access camera.';
          instruction = 'Please check your camera permissions and try again, or use the "Upload Photo" option.';
      }
      
      // Show toast notification for better user experience
      toast.error(errorMessage, {
        description: instruction,
        duration: 8000,
        action: {
          label: "Upload Photo",
          onClick: () => fileInputRef.current?.click()
        }
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraDialogOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedPhoto(imageData);
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        
        stopCamera();
        setPhotoDialogOpen(true);
      }
    }
  };

  const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ACCEPTED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  const isAcceptedPhotoFile = (file: File) => {
    const name = file.name.toLowerCase();
    const hasAcceptedExtension = ACCEPTED_PHOTO_EXTENSIONS.some((ext) => name.endsWith(ext));
    // Some browsers/OSes report an empty file.type for certain uploads, so a file
    // is only trusted when its MIME type is missing/unreliable AND the extension
    // still checks out — never on extension alone, since MIME wins when present.
    if (file.type) return ACCEPTED_PHOTO_TYPES.includes(file.type.toLowerCase());
    return hasAcceptedExtension;
  };

  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isAcceptedPhotoFile(file)) {
        toast.error('Unsupported file type', {
          description: 'Please upload a JPG, JPEG, or PNG image. Other file types (like PDF) are not allowed for the member photo.',
        });
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedPhoto(result);
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        setPhotoDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePhotoSave = useCallback(() => {
    setFormData({ ...formData, profilePhoto: selectedPhoto });
    setPhotoDialogOpen(false);
  }, [formData, selectedPhoto]);

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - photoPosition.x,
      y: e.clientY - photoPosition.y
    });
  };

  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPhotoPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handlePhotoMouseUp = () => {
    setIsDragging(false);
  };

  const movePhoto = useCallback((direction: 'left' | 'right') => {
    const moveAmount = 15;
    setPhotoPosition(prev => ({
      ...prev,
      x: direction === 'left' ? prev.x - moveAmount : prev.x + moveAmount
    }));
  }, []);

  const resetPhotoPosition = useCallback(() => {
    setPhotoPosition({ x: 0, y: 0 });
    setPhotoZoom([1]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAllBranches) {
      toast.error('Please switch to a branch to create member', {
        description: 'Member records must belong to a specific branch. Select one from the sidebar before continuing.',
        duration: 5000,
      });
      return;
    }

    // Validation
    const isMemberIdValid = isEditMode ? !!formData.memberId : true;
    if (!isMemberIdValid || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.membershipPlan) {
      toast.error('Please fill in all required fields', {
        description: isEditMode
          ? 'Member ID, first name, last name, email, phone, and membership plan are required.'
          : 'First name, last name, email, phone, and membership plan are required.',
        duration: 4000
      });
      return;
    }

    // Joining/Start Date must be explicit — leaving them blank previously let the
    // backend silently default Start Date to "now" and still compute a real expiry
    // date from it, with no indication to the user that a substitution happened.
    if (!formData.joiningDate || !formData.startDate) {
      toast.error('Please fill in all required fields', {
        description: 'Joining date and start date are required.',
        duration: 4000
      });
      return;
    }

    if (formData.joiningDate && formData.startDate) {
      const joinD = new Date(formData.joiningDate);
      const startD = new Date(formData.startDate);
      // Strip time components for accurate date-only comparison
      joinD.setHours(0, 0, 0, 0);
      startD.setHours(0, 0, 0, 0);

      if (startD < joinD) {
        toast.error('Invalid Dates', {
          description: 'Start date cannot be earlier than joining date.',
          duration: 4000
        });
        return;
      }
    }

    // Date of Birth must be a real, plausible birthdate — the `max` on the date
    // input is only a soft hint (still bypassable by typing), so re-check here.
    // Rejects today's date and anything younger than MIN_MEMBER_AGE_YEARS (BG_61).
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        toast.error('Invalid Date of Birth', {
          description: 'Date of birth cannot be in the future.',
          duration: 4000
        });
        return;
      }
      if (formData.dateOfBirth > getMaxDateOfBirth()) {
        toast.error('Invalid Date of Birth', {
          description: `Member must be at least ${MIN_MEMBER_AGE_YEARS} year${MIN_MEMBER_AGE_YEARS === 1 ? '' : 's'} old.`,
          duration: 4000
        });
        return;
      }
    }

    // Family / Couple membership validation
    if ((formData.membershipType === 'family' || formData.membershipType === 'couple') && !isEditMode) {
      if (familyMembers.length === 0) {
        toast.error(
          formData.membershipType === 'couple' ? 'Please add the connected member' : 'Please add at least one family member',
          {
            description: formData.membershipType === 'couple'
              ? 'Couple memberships require exactly one connected member.'
              : 'Family memberships require at least one additional family member.',
            duration: 4000
          }
        );
        return;
      }
      const incomplete = familyMembers.find(fm => !fm.name.trim() || !fm.relationship.trim());
      if (incomplete) {
        toast.error('Please complete all family member entries', {
          description: 'Each family member must have a name and relationship.',
          duration: 4000
        });
        return;
      }
      // Adult family members can share the primary member's plan by leaving their plan blank
    }

    // Open payment selection popup (or skip if edit mode)
    if (isEditMode) {
      handlePaymentConfirm();
    } else {
      setPaymentDialogOpen(true);
    }
  };

  // Get membership plan details and pricing
  const getMembershipDetails = () => {
    const plan = apiPlans.find(p => p.id.toString() === formData.membershipPlan)
      || apiPlans.find(p => p.name === formData.membershipPlan);
    if (!plan) return { name: 'Unknown Plan', price: 0, originalPrice: null, savings: null };

    // Family Head billing: the invoice is the WHOLE family's total (price per
    // member × current headcount) — not the plan's flat listed price. This is
    // what actually gets billed/collected via the primary member's payment
    // section below; family members carry no payment of their own.
    if (isFamilyHeadBillingMode() && plan.autoCalculateTotal !== false && plan.pricePerMember != null) {
      const totalMembers = familyMembers.length + 1;
      return {
        name: plan.name,
        price: computeFamilyHeadTotal(plan, totalMembers),
        originalPrice: null,
        savings: null,
      };
    }

    const originalPrice = plan.discount && plan.discount > 0
      ? Number(plan.price)
      : null;
    const discountedPrice = plan.discount && plan.discount > 0
      ? Number(plan.price) * (1 - Number(plan.discount) / 100)
      : Number(plan.price);
    const savings = originalPrice ? originalPrice - discountedPrice : null;
    return {
      name: plan.name,
      price: Math.round(discountedPrice * 100) / 100,
      originalPrice,
      savings: savings ? Math.round(savings * 100) / 100 : null,
    };
  };
  
  // Get final price with discount applied
  const getFinalPrice = () => {
    const basePrice = getMembershipDetails().price;
    return Math.round(Math.max(0, basePrice - discountAmount) * 100) / 100;
  };

  const paymentManager = usePaymentManager({ invoiceTotal: getFinalPrice() });

  // Handle discount selection and calculation
  const handleDiscountChange = (discountId: string) => {
    // Handle "no-discount" selection
    if (discountId === 'no-discount' || !discountId) {
      setSelectedDiscount('');
      setDiscountAmount(0);
      setAppliedPromotionId(null);
      setPromoCodeApplied(false);
      setPromoCodeInput('');
      // Also clear referral if changing discount
      setReferralCodeApplied(false);
      setReferralCodeInput('');
      setAppliedReferralId(null);
      return;
    }
    
    setSelectedDiscount(discountId);
    
    const selected = discountList.find(d => d.id === discountId);
    if (!selected) {
      setDiscountAmount(0);
      setAppliedPromotionId(null);
      return;
    }
    
    // Track the API promotion ID for redemption
    setAppliedPromotionId(selected.apiId || null);
    
    // Automatically populate promo code input if the discount has a code
    if (selected.code) {
      setPromoCodeInput(selected.code);
      setPromoCodeApplied(true);
    } else {
      setPromoCodeInput('');
      setPromoCodeApplied(false);
    }

    // Clear referral when picking a dropdown discount
    setReferralCodeApplied(false);
    setReferralCodeInput('');
    setAppliedReferralId(null);
    
    const basePrice = getMembershipDetails().price;
    let calculatedDiscount = 0;
    
    if (selected.discountType === 'percentage') {
      calculatedDiscount = (basePrice * selected.discountValue) / 100;
    } else if (selected.discountType === 'fixed') {
      calculatedDiscount = selected.discountValue;
    }
    
    // Ensure discount doesn't exceed the base price
    setDiscountAmount(Math.min(calculatedDiscount, basePrice));
  };

  // Handle promo code apply
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      toast.error('Please enter a promotion code');
      return;
    }
    setIsValidatingPromoCode(true);
    try {
      const promo = await promotionsService.validateCode(promoCodeInput.trim());
      // Check if this promotion is already in the dropdown list
      let matchingDiscount = discountList.find(d => d.apiId === promo.id);
      if (!matchingDiscount) {
        // Add it to the discount list dynamically
        const newDiscount = {
          id: String(promo.id),
          apiId: promo.id,
          name: promo.name,
          type: promo.type,
          discountType: promo.discountType || 'percentage',
          discountValue: Number(promo.discountValue) || 0,
          status: promo.status,
          code: promo.code || null,
          usageCount: promo.usageCount || 0,
          usageLimit: promo.usageLimit || null,
        };
        setDiscountList(prev => [...prev, newDiscount]);
        matchingDiscount = newDiscount;
      }
      // Apply the discount
      setSelectedDiscount(String(promo.id));
      setAppliedPromotionId(promo.id);
      setPromoCodeApplied(true);
      // Clear referral when promo code is applied
      setReferralCodeApplied(false);
      setReferralCodeInput('');
      setAppliedReferralId(null);
      
      const basePrice = getMembershipDetails().price;
      let calculatedDiscount = 0;
      const discType = promo.discountType || 'percentage';
      const discValue = Number(promo.discountValue) || 0;
      if (discType === 'percentage') {
        calculatedDiscount = (basePrice * discValue) / 100;
      } else {
        calculatedDiscount = discValue;
      }
      setDiscountAmount(Math.min(calculatedDiscount, basePrice));
      toast.success(`Promo code "${promoCodeInput.trim()}" applied! ${discType === 'percentage' ? `${discValue}% Off` : `${currencyCode} ${discValue} Off`}`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid promotion code');
    } finally {
      setIsValidatingPromoCode(false);
    }
  };

  // Shared by both the "enter a code" and "search by name/phone" paths — both
  // end up resolving a referral code and running it through the same
  // validation/discount logic so they can't drift out of sync.
  const applyReferralByCode = async (code: string) => {
    if (!code.trim()) {
      toast.error('Please enter a referral code');
      return;
    }
    setIsValidatingReferralCode(true);
    try {
      const result = await referralService.validateCode(code.trim());
      const { referral, applicableRewardRules } = result;
      
      // Find the best applicable reward rule for the referee
      // Prefer 'discount' type rules, fallback to 'credit'
      const discountRule = applicableRewardRules.find(r => r.type === 'discount')
        || applicableRewardRules.find(r => r.type === 'credit')
        || applicableRewardRules[0];
      
      if (!discountRule) {
        toast.success(`Referral from ${referral.referrerName} applied! (No discount for new members)`);
        setAppliedReferralId(referral.id);
        setAppliedReferralInfo({ refereeName: referral.refereeName, referrerName: referral.referrerName, refereePhoto: referral.refereePhoto });
        setReferralCodeApplied(true);
        setPromoCodeApplied(false);
        setPromoCodeInput('');
        setSelectedDiscount('no-discount');
        setIsValidatingReferralCode(false);
        return;
      }

      // Apply referral discount
      const referralDiscount = {
        id: `referral-${referral.id}`,
        apiId: null,
        name: `Referral from ${referral.referrerName}`,
        type: 'discount',
        discountType: discountRule.unit === '%' ? 'percentage' : 'fixed',
        discountValue: Number(discountRule.value) || 0,
        status: 'active',
        code: referral.referralCode,
        usageCount: 0,
        usageLimit: null,
      };

      // Add to discount list and select it
      setDiscountList(prev => {
        const filtered = prev.filter(d => !d.id.startsWith('referral-'));
        return [...filtered, referralDiscount];
      });
      setSelectedDiscount(referralDiscount.id);
      setAppliedReferralId(referral.id);
      setAppliedReferralInfo({ refereeName: referral.refereeName, referrerName: referral.referrerName, refereePhoto: referral.refereePhoto });
      setReferralCodeApplied(true);
      // Clear any promo code discount
      setPromoCodeApplied(false);
      setPromoCodeInput('');
      setAppliedPromotionId(null);
      
      const basePrice = getMembershipDetails().price;
      let calculatedDiscount = 0;
      if (referralDiscount.discountType === 'percentage') {
        calculatedDiscount = (basePrice * referralDiscount.discountValue) / 100;
      } else {
        calculatedDiscount = referralDiscount.discountValue;
      }
      setDiscountAmount(Math.min(calculatedDiscount, basePrice));
      toast.success(`Referral code applied! ${referralDiscount.discountType === 'percentage' ? `${referralDiscount.discountValue}% Off` : `${currencyCode} ${referralDiscount.discountValue} Off`} — Referred by ${referral.referrerName}`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid referral code');
    } finally {
      setIsValidatingReferralCode(false);
    }
  };

  const handleApplyReferralCode = () => applyReferralByCode(referralCodeInput);

  const handleSelectPendingReferral = (referral: ReferralResponse) => {
    setReferralCodeInput(referral.referralCode);
    setRefereeSearchQuery('');
    setRefereeSearchResults([]);
    applyReferralByCode(referral.referralCode);
  };


  // Handle payment confirmation. The new allocation panel folds "partial now,
  // rest later" into a CREDIT line — there is no separate due-later concept —
  // so the CREDIT line's amount IS the member's outstanding balance, and
  // everything else in paymentManager.paymentLines was actually received now.
  const handlePaymentConfirm = async () => {
    if (!isEditMode && paymentManager.paymentLines.length === 0) {
      toast.error('Please add at least one payment');
      return;
    }
    if (!isEditMode && !paymentManager.settleable) {
      toast.error('Allocate the full amount (or leave the remainder on Credit) before continuing');
      return;
    }

    // Process payment and create member
    const membershipDetails = getMembershipDetails();
    const finalPrice = getFinalPrice();
    const hasPayment = paymentManager.paymentLines.length > 0;
    const payload = buildPaymentPayload(paymentManager.paymentLines, finalPrice);
    const outstandingBalance = payload.creditBalance;
    // In edit mode with no new payment entered (e.g. only updating profile/access
    // credentials), leave outstanding balance and payment status untouched rather
    // than forcing them from an empty payment line set — otherwise every
    // credentials-only save would wipe the member's real outstanding dues to 0
    // (BG_63).
    const shouldUpdatePaymentFields = !isEditMode || hasPayment;
    const paymentStatus = !hasPayment ? 'paid' : (outstandingBalance > 0 ? 'pending' : 'paid');

    // Resolve the selected plan name
    const selectedPlan = apiPlans.find(p => p.id.toString() === formData.membershipPlan)
      || apiPlans.find(p => p.name === formData.membershipPlan);
    const planName = selectedPlan?.name || formData.membershipPlan;
    const planType = selectedPlan?.planType || '';

    // Build ISO date strings
    const toIso = (dateStr: string) => dateStr ? `${dateStr}T00:00:00Z` : '';

    // End date is computed by the backend from plan duration; use existing value in edit mode
    const endDateStr = isEditMode ? (formData.endDate || '') : '';

    const effectivePaymentMethodLabel = hasPayment ? (payload.paymentSummary || undefined) : undefined;

    // Ledger bank account for an Online allocation, so the journal entry hits
    // that specific account instead of a generic bucket.
    const onlineLine = paymentManager.paymentLines.find(l => l.paymentType === PAYMENT_TYPES.ONLINE);
    const selectedBankAccount = onlineLine?.bankAccountId
      ? bankAccounts.find(a => String(a.id) === onlineLine.bankAccountId)
      : undefined;

    // Per-leg breakdown carrying the method-specific detail (card network,
    // reference, ...) for whichever allocation(s) actually received money —
    // CREDIT never appears here, since it posts no receipt.
    const paymentBreakdownForPayload = hasPayment
      ? payload.paymentAllocations
          .filter(a => a.type !== PAYMENT_TYPES.CREDIT)
          .map(a => ({
            method: a.type === PAYMENT_TYPES.CARD ? (a.subtype || 'Card') : a.type === PAYMENT_TYPES.ONLINE ? 'Online Payment' : 'Cash',
            amount: a.amount,
            ...(a.reference ? { reference: a.reference } : {}),
            ...(a.bankAccountName ? { bank_account_name: a.bankAccountName } : {}),
          }))
      : undefined;

    // A Couple registration always links the two members the same way a Family
    // head links to an adult dependent (own plan/fee/receipt/ledger, just
    // connected) — send "Couple" as the membership_type regardless of the
    // selected plan's own planType, so the backend's family-linking logic
    // (which recognizes both "Family" and "Couple") always kicks in.
    const effectiveMembershipType = formData.membershipType === 'couple' ? 'Couple' : planType;

    const memberPayload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      membership_type: effectiveMembershipType,
      membership_status: 'active' as const,
      membership_plan: planName,
      join_date: toIso(formData.joiningDate),
      membership_start_date: toIso(formData.startDate),
      membership_end_date: toIso(endDateStr),
      expiry_date: toIso(endDateStr),
      ...(shouldUpdatePaymentFields ? { payment_status: paymentStatus as any } : {}),
      monthly_fee: membershipDetails.price,
      membership_fee: getFinalPrice(),
      emergency_contact: formData.emergencyContact,
      emergency_contact_name: formData.emergencyContactName,
      emergency_contact_phone: formData.emergencyContactPhone,
      date_of_birth: toIso(formData.dateOfBirth),
      blood_type: formData.bloodType,
      medical_conditions: formData.medicalConditions,
      allergies: formData.allergies,
      current_medications: formData.currentMedications,
      chronic_illnesses: formData.chronicIllnesses,
      health_notes: formData.healthNotes || '',
      ...(shouldUpdatePaymentFields ? { outstanding_balance: outstandingBalance } : {}),
      last_payment_date: hasPayment ? toIso(new Date().toISOString().split('T')[0]) : undefined,
      payment_method_used: effectivePaymentMethodLabel,
      bank_account_code: selectedBankAccount?.code,
      bank_account_name: selectedBankAccount?.name,
      payment_breakdown: paymentBreakdownForPayload,
      processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
      discount_applied: discountAmount || 0,
      reg_doc_number: formData.regDocNumber,
      reg_doc_date: toIso(formData.regDocDate),
      address: formData.address,
      nationality: formData.nationality,
      gender: formData.gender,
      height: formData.height ? parseFloat(formData.height) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      photo_url: formData.profilePhoto || undefined,
      // Family/Couple plan: mark primary member as head and include family members array
      is_family_head: (formData.membershipType === 'family' || formData.membershipType === 'couple') && familyMembers.length > 0 ? true : undefined,
      family_members: (!isEditMode && (formData.membershipType === 'family' || formData.membershipType === 'couple') && familyMembers.length > 0)
        ? familyMembers.map(fm => {
            // Under family_head billing mode EVERY member (adult or minor) folds
            // into the head's single invoice — reuse the exact same "billed to
            // head" payload shape minors have always used, just no longer gated
            // on the isMinor toggle (which stays purely demographic here).
            if (fm.isMinor || isFamilyHeadBillingMode()) {
              const minorFeeNum = fm.minorFee ? parseFloat(fm.minorFee) : 0;
              const minorPaidNow = parseFloat(fm.minorAmountPaid || '0');
              const minorIsCredit = fm.minorPaymentMethod === 'credit';
              const minorEffectiveMethod = minorIsCredit ? fm.minorReceivedVia : fm.minorPaymentMethod;
              const minorAccount = minorEffectiveMethod === 'bank-transfer' && fm.minorBankAccountId
                ? bankAccounts.find(a => String(a.id) === fm.minorBankAccountId)
                : undefined;
              return {
                name: fm.name,
                relationship: fm.relationship,
                is_minor: Boolean(fm.isMinor),
                date_of_birth: fm.dateOfBirth ? toIso(fm.dateOfBirth) : undefined,
                minor_fee: minorFeeNum,
                minor_paid_amount: minorPaidNow,
                minor_payment_method: minorPaidNow > 0
                  ? (PAYMENT_METHOD_LABELS[minorEffectiveMethod] || minorEffectiveMethod)
                  : (minorIsCredit ? 'Credit' : undefined),
                minor_payment_breakdown: minorPaidNow > 0
                  ? buildFamilyMemberLeg(minorEffectiveMethod, minorPaidNow, {
                      cardType: fm.minorCardType, chequeNumber: fm.minorChequeNumber, chequeDate: fm.minorChequeDate,
                      bankName: fm.minorBankName, onlinePaymentType: fm.minorOnlinePaymentType, providerName: fm.minorProviderName,
                    })
                  : undefined,
                minor_bank_account_code: minorAccount?.code,
                minor_bank_account_name: minorAccount?.name,
                processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
              };
            }
            // Fall back to the primary member's plan when the family member didn't pick one
            const plan = fm.membershipPlan
              ? apiPlans.find(p => p.id.toString() === fm.membershipPlan)
              : null;
            const primaryPlan = apiPlans.find(p => p.id.toString() === formData.membershipPlan);
            const effectivePlanName = plan?.name || primaryPlan?.name || planName;
            const fee = fm.membershipFee && parseFloat(fm.membershipFee) > 0
              ? parseFloat(fm.membershipFee)
              : (plan ? getPlanPriceById(plan.id.toString()) : (primaryPlan ? getPlanPriceById(primaryPlan.id.toString()) : finalPrice));
            const paidNow = parseFloat(fm.amountPaid || '0');
            const outstanding = Math.max(0, fee - paidNow);
            const isCredit = fm.paymentMethod === 'credit';
            const effectiveMethod = isCredit ? fm.receivedVia : fm.paymentMethod;
            const account = effectiveMethod === 'bank-transfer' && fm.bankAccountId
              ? bankAccounts.find(a => String(a.id) === fm.bankAccountId)
              : undefined;
            return {
              name: fm.name,
              relationship: fm.relationship,
              is_minor: false,
              email: fm.email || undefined,
              phone: fm.phone || undefined,
              membership_plan: effectivePlanName,
              membership_fee: fee,
              payment_status: outstanding <= 0 ? 'paid' : (paidNow > 0 ? 'partial' : 'pending'),
              outstanding_balance: outstanding,
              payment_method: paidNow > 0
                ? (PAYMENT_METHOD_LABELS[effectiveMethod] || effectiveMethod)
                : (isCredit ? 'Credit' : undefined),
              payment_breakdown: paidNow > 0
                ? buildFamilyMemberLeg(effectiveMethod, paidNow, {
                    cardType: fm.cardType, chequeNumber: fm.chequeNumber, chequeDate: fm.chequeDate,
                    bankName: fm.bankName, onlinePaymentType: fm.onlinePaymentType, providerName: fm.providerName,
                  })
                : undefined,
              bank_account_code: account?.code,
              bank_account_name: account?.name,
              processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
            };
          })
        : undefined,
      // App access credentials (only included on create if both are provided)
      ...((!isEditMode && formData.appUsername && formData.appPassword) ? {
        app_username: formData.appUsername,
        app_password: formData.appPassword,
      } : {}),
    };

    try {
      const updatePayload: Partial<Parameters<typeof membersService.updateMember>[1]> & Record<string, any> = {
        ...memberPayload,
      } as Partial<Parameters<typeof membersService.updateMember>[1]> & Record<string, any>;

      let createdMember: any = null;
      if (isEditMode && internalId) {
        await membersService.updateMember(internalId, updatePayload);
      } else {
        createdMember = await membersService.createMember({ ...memberPayload, total_visits: 0 } as any);
      }

      // Record promotion redemption (increment usage count and track revenue)
      if (appliedPromotionId && discountAmount > 0) {
        try {
          await promotionsService.redeemPromotion(appliedPromotionId, getFinalPrice(), discountAmount);
        } catch (e) {
          console.error('Failed to record promotion redemption:', e);
        }
      }

      // Record referral as successful and let the reward engine generate rewards
      // for both referrer and referee. Not gated on discountAmount > 0 — the
      // referrer's reward doesn't depend on the referee having received a
      // client-side discount, only on a valid referral code being used to sign up.
      if (appliedReferralId) {
        try {
          await referralService.markSuccessful(appliedReferralId, {
            purchaseAmount: getFinalPrice(),
            membershipPlanId: selectedPlan?.id ? Number(selectedPlan.id) : undefined,
            refereeMemberId: createdMember?.member_id || undefined,
          });
        } catch (e) {
          console.error('Failed to mark referral as successful:', e);
        }
      }

      toast.success(isEditMode ? 'Member updated successfully!' : 'Member registered successfully!');
      onNavigate?.('members');
      navigate('/members');
    } catch (err: any) {
      console.error(isEditMode ? 'Failed to update member:' : 'Failed to create member:', err);
      
      const is403 = err.message && err.message.includes('403');
      const activeBranchId = sessionStorage.getItem('activeBranchId');
      const isAllBranches = !activeBranchId || activeBranchId === 'null';

      const title = isAllBranches && is403 
        ? 'please switch to a branch to create member' 
        : (isEditMode ? 'Failed to update member' : 'Failed to create member');
        
      const description = isAllBranches && is403 
        ? '' 
        : (err.message || 'Please try again.');

      toast.error(title, {
        description: description,
        duration: 5000,
        style: { color: 'black' }
      });
      return;
    }

    setPaymentDialogOpen(false);
    paymentManager.clearLines();
  };



  // Handle payment dialog close
  const handlePaymentCancel = () => {
    setPaymentDialogOpen(false);
    paymentManager.clearLines();
    setSelectedDiscount('');
    setDiscountAmount(0);
    setPromoCodeInput('');
    setPromoCodeApplied(false);
    setIsValidatingPromoCode(false);
    setReferralCodeInput('');
    setReferralCodeApplied(false);
    setIsValidatingReferralCode(false);
    setAppliedPromotionId(null);
    setAppliedReferralId(null);
    setRefereeSearchQuery('');
    setRefereeSearchResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Page Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('members')} className="gap-2 shrink-0">
            <FaArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground">{isEditMode ? 'Edit Member Profile' : 'New Member Registration'}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{isEditMode ? 'Update the details for this gym member' : 'Fill in the details to register a new gym member'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          {isAllBranches && !isEditMode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-medium">All Branches is selected.</span> Choose a specific branch from the sidebar before creating a member — records must belong to one branch.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Top Section - Member Photo */}
            <Card className="border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full bg-white shadow-md border-4 border-white flex items-center justify-center overflow-hidden">
                      {formData.profilePhoto ? (
                        <img src={formData.profilePhoto} alt="Member" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <FaUser size={36} className="text-gray-300 mx-auto mb-0.5" />
                          <p className="text-xs text-gray-400">No photo</p>
                        </div>
                      )}
                    </div>
                    {formData.profilePhoto && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
                        <FaCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  {/* Info + Buttons */}
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 mb-0.5">Member Photo</h2>
                    <p className="text-sm text-gray-500 mb-3">Add a profile photo for easy member identification</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <div className="relative">
                        <Button
                          type="button"
                          size="sm"
                          onClick={startCamera}
                          disabled={cameraAvailable === false}
                          className={`gap-2 ${cameraAvailable === false ? 'bg-gray-300 cursor-not-allowed opacity-60 text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <FaCamera size={14} />
                          {cameraAvailable === null ? 'Checking...' : cameraAvailable === false ? 'Unavailable' : 'Capture Photo'}
                        </Button>
                        {cameraAvailable === false && cameraError && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg whitespace-nowrap z-10">
                            {cameraError}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <FaUpload size={14} />
                        Upload Photo
                      </Button>
                    </div>
                    {cameraAvailable === false && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-2 justify-center">
                        <FaUpload size={12} /> Use Upload Photo instead
                      </p>
                    )}
                    {formData.profilePhoto && (
                      <Badge className="bg-green-100 text-green-800 mt-2 w-fit gap-1 mx-auto">
                        <FaCheck size={12} /> Photo Added
                      </Badge>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </CardContent>
            </Card>

            {/* Membership Type Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg shrink-0">
                    <FaUsers className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Membership Type</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Select the type of membership for this registration</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
              
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: 'individual', label: 'Individual', sub: 'Single person', icon: <FaUser className="h-5 w-5" />, onClick: () => { setFormData({...formData, membershipType: 'individual'}); setFamilyMembers([]); } },
                  { value: 'couple', label: 'Couple', sub: 'Two connected members', icon: <FaUsers className="h-5 w-5" />, onClick: () => {
                      setFormData({...formData, membershipType: 'couple'});
                      // Couple only ever has one connected member, and it's always an adult
                      // (independent billing) — normalize any leftover rows from switching
                      // away from a Family selection.
                      setFamilyMembers(prev => prev.slice(0, 1).map(fm => ({ ...fm, isMinor: false })));
                    } },
                  { value: 'family', label: 'Family', sub: 'Multiple members', icon: <FaHeart className="h-5 w-5" />, onClick: () => setFormData({...formData, membershipType: 'family'}) },
                  { value: 'corporate', label: 'Corporate', sub: 'Company-sponsored', icon: <FaBuilding className="h-5 w-5" />, onClick: () => { setFormData({...formData, membershipType: 'corporate'}); setFamilyMembers([]); } },
                ].map((opt) => (
                  <div
                    key={opt.value}
                    className={`relative p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.membershipType === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                    }`}
                    onClick={opt.onClick}
                  >
                    {formData.membershipType === opt.value && (
                      <div className="absolute top-2 right-2"><FaCheck className="h-4 w-4 text-primary" /></div>
                    )}
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.membershipType === opt.value ? 'bg-primary' : 'bg-gray-100'}`}>
                        <span className={formData.membershipType === opt.value ? 'text-white' : 'text-gray-500'}>{opt.icon}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${formData.membershipType === opt.value ? 'text-primary' : 'text-gray-800'}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 hidden sm:block">{opt.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {formData.membershipType && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                    <FaCheck size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {formData.membershipType.charAt(0).toUpperCase() + formData.membershipType.slice(1)} Membership selected
                    </p>
                    {formData.membershipType === 'family' && (
                      <p className="text-xs text-primary/70 mt-0.5">Add family members in Personal Info below</p>
                    )}
                    {formData.membershipType === 'couple' && (
                      <p className="text-xs text-primary/70 mt-0.5">Add the connected member in Personal Info below</p>
                    )}
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Identity & Registration Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
                    <FaHashtag className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Identity & Registration</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Member ID and document details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
              
              {/* Member ID, Reg Doc Number, Reg Doc Date - 3 Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="memberId">
                    <div className="flex items-center space-x-2">
                      <FaHashtag className="h-4 w-4" />
                      <span>Member ID</span>
                    </div>
                  </Label>
                  <Input
                    id="memberId"
                    value={isEditMode ? (formData.memberId || '') : ''}
                    readOnly
                    placeholder="Auto-generated after save (e.g. MBR-0000000001)"
                    className="bg-muted cursor-default"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned automatically by the system
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="regDocNumber">
                    <div className="flex items-center space-x-2">
                      <FaFileCircleCheck className="h-4 w-4" />
                      <span>Reg. Doc. Number</span>
                    </div>
                  </Label>
                  <Input
                    id="regDocNumber"
                    value={formData.regDocNumber}
                    onChange={(e) => setFormData({...formData, regDocNumber: e.target.value})}
                    placeholder="Enter document number"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Official ID/registration document
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="regDocDate">
                    <div className="flex items-center space-x-2">
                      <FaCalendarDays className="h-4 w-4" />
                      <span>Reg. Doc. Date</span>
                    </div>
                  </Label>
                  <Input
                    id="regDocDate"
                    type="date"
                    value={formData.regDocDate}
                    onChange={(e) => setFormData({...formData, regDocDate: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Document issue/validation date
                  </p>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Personal Information Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg shrink-0">
                    <FaUser className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Member personal and contact details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="mb-1.5 block">First Name <span className="text-red-500">*</span></Label>
                <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" required />
              </div>
              <div>
                <Label htmlFor="lastName" className="mb-1.5 block">Last Name <span className="text-red-500">*</span></Label>
                <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block">Email <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john.doe@email.com" required />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1.5 block">Phone <span className="text-red-500">*</span></Label>
                <Input id="phone" value={formData.phone} onChange={(e) => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) setFormData({...formData, phone: v}); }} placeholder="+971 XX XXX XXXX" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender" className="mb-1.5 block">Gender</Label>
                <Select value={formData.gender || undefined} onValueChange={(v) => setFormData({...formData, gender: v, genderOther: v !== 'other' ? '' : formData.genderOther})}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Select Gender (Optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-Binary</SelectItem>
                    <SelectItem value="transgender">Transgender</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.gender === 'other' && (
                  <Input className="mt-2" value={formData.genderOther} onChange={(e) => setFormData({...formData, genderOther: e.target.value})} placeholder="Please specify" />
                )}
              </div>
              <div>
                <Label htmlFor="nationality" className="mb-1.5 block">Nationality</Label>
                <Select value={formData.nationality || undefined} onValueChange={(v) => setFormData({...formData, nationality: v})}>
                  <SelectTrigger id="nationality"><SelectValue placeholder="Select Country" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="mb-1.5 block">Address</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="123 Main St, City" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth" className="mb-1.5 block">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  max={getMaxDateOfBirth()}
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Age</Label>
                <Input
                  value={calculateAge(formData.dateOfBirth) !== null ? `${calculateAge(formData.dateOfBirth)} years` : ''}
                  placeholder="Auto-calculated from date of birth"
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Family / Couple Members Section */}
            {(formData.membershipType === 'family' || formData.membershipType === 'couple') && (
              <div className="space-y-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-gradient-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaHeart className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-primary">
                        {formData.membershipType === 'couple' ? 'Connected Member' : 'Family Members'}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {formData.membershipType === 'couple'
                          ? (isFamilyHeadBillingMode()
                              ? 'Add the one member connected to this membership — billed together with the couple head on one invoice'
                              : 'Add the one member connected to this membership — billed independently, linked together')
                          : 'Add additional family members to this membership'}
                      </p>
                    </div>
                  </div>
                  {(formData.membershipType === 'family' || familyMembers.length === 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFamilyMember}
                      className="btn-primary"
                    >
                      <FaPlus className="h-4 w-4 mr-2" />
                      {formData.membershipType === 'couple' ? 'Add Connected Member' : 'Add Family Member'}
                    </Button>
                  )}
                </div>

                {familyMembers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <FaUsers className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">
                      {formData.membershipType === 'couple' ? 'No connected member added yet' : 'No family members added yet'}
                    </p>
                    <p className="text-xs">
                      {formData.membershipType === 'couple'
                        ? 'Click "Add Connected Member" to get started'
                        : 'Click "Add Family Member" to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member, index) => {
                      const headName = `${formData.firstName} ${formData.lastName}`.trim() || 'the family head';
                      return (
                      <div key={member.id} className="space-y-3 p-3 bg-white rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-light rounded-full flex-shrink-0">
                              <FaUser className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {formData.membershipType === 'couple' ? 'Connected Member' : `Family Member ${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {formData.membershipType !== 'couple' && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={!member.isMinor ? 'default' : 'outline'}
                                  onClick={() => updateFamilyMemberField(member.id, 'isMinor', false)}
                                >
                                  Adult
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={member.isMinor ? 'default' : 'outline'}
                                  onClick={() => updateFamilyMemberField(member.id, 'isMinor', true)}
                                >
                                  Minor
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFamilyMember(member.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <FaXmark className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`family-member-${member.id}`} className="text-sm text-gray-600 mb-1 block">
                              Name *
                            </Label>
                            <Input
                              id={`family-member-${member.id}`}
                              value={member.name}
                              onChange={(e) => updateFamilyMemberField(member.id, 'name', e.target.value)}
                              placeholder="Enter full name"
                              className="border-primary/20"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`family-rel-${member.id}`} className="text-sm text-gray-600 mb-1 block">
                              Relationship *
                            </Label>
                            <Select
                              value={member.relationship || undefined}
                              onValueChange={(val) => updateFamilyMemberField(member.id, 'relationship', val)}
                            >
                              <SelectTrigger id={`family-rel-${member.id}`} className="border-primary/20">
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Wife">Wife</SelectItem>
                                <SelectItem value="Husband">Husband</SelectItem>
                                <SelectItem value="Son">Son</SelectItem>
                                <SelectItem value="Daughter">Daughter</SelectItem>
                                <SelectItem value="Father">Father</SelectItem>
                                <SelectItem value="Mother">Mother</SelectItem>
                                <SelectItem value="Brother">Brother</SelectItem>
                                <SelectItem value="Sister">Sister</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {isFamilyHeadBillingMode() ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Date of Birth (optional)</Label>
                                <Input
                                  type="date"
                                  value={member.dateOfBirth}
                                  onChange={(e) => updateFamilyMemberField(member.id, 'dateOfBirth', e.target.value)}
                                  className="border-primary/20"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Billed together with {headName} on the one combined family invoice — no separate payment needed for this member.
                            </p>
                          </>
                        ) : member.isMinor ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Date of Birth (optional)</Label>
                                <Input
                                  type="date"
                                  value={member.dateOfBirth}
                                  onChange={(e) => updateFamilyMemberField(member.id, 'dateOfBirth', e.target.value)}
                                  className="border-primary/20"
                                />
                              </div>
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">
                                  Fee to bill {headName} ({currencyCode})
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={member.minorFee}
                                  onChange={(e) => updateFamilyMemberField(member.id, 'minorFee', e.target.value)}
                                  placeholder="0.00"
                                  className="border-primary/20"
                                />
                              </div>
                            </div>
                            {renderPaymentCapture(
                              member.minorPaymentMethod, member.minorAmountPaid, member.minorReceivedVia, member.minorFee,
                              {
                                cardType: member.minorCardType, chequeNumber: member.minorChequeNumber, chequeDate: member.minorChequeDate,
                                bankName: member.minorBankName, bankAccountId: member.minorBankAccountId,
                                onlinePaymentType: member.minorOnlinePaymentType, providerName: member.minorProviderName,
                              },
                              {
                                onMethodChange: (val) => {
                                  updateFamilyMemberField(member.id, 'minorPaymentMethod', val);
                                  updateFamilyMemberField(member.id, 'minorAmountPaid', val === 'credit' ? '' : (member.minorFee || ''));
                                },
                                onAmountChange: (val) => updateFamilyMemberField(member.id, 'minorAmountPaid', val),
                                onReceivedViaChange: (val) => updateFamilyMemberField(member.id, 'minorReceivedVia', val),
                                onDetailChange: (field, value) => updateFamilyMemberField(member.id, minorPaymentFieldMap[field], value),
                              }
                            )}
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const due = Math.max(0, parseFloat(member.minorFee || '0') - parseFloat(member.minorAmountPaid || '0'));
                                return due > 0
                                  ? `${currencyCode} ${due.toFixed(2)} will be added to ${headName}'s due.`
                                  : `Fully covered now — won't show as a due on ${headName}'s account.`;
                              })()}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Email (optional)</Label>
                                <Input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => updateFamilyMemberField(member.id, 'email', e.target.value)}
                                  className="border-primary/20"
                                />
                              </div>
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Phone (optional)</Label>
                                <Input
                                  value={member.phone}
                                  onChange={(e) => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) updateFamilyMemberField(member.id, 'phone', v); }}
                                  className="border-primary/20"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Membership Plan (Optional)</Label>
                                <Select
                                  value={member.membershipPlan || undefined}
                                  onValueChange={(val) => {
                                    updateFamilyMemberField(member.id, 'membershipPlan', val);
                                    updateFamilyMemberField(member.id, 'membershipFee', String(getPlanPriceById(val)));
                                  }}
                                >
                                  <SelectTrigger className="border-primary/20">
                                    <SelectValue placeholder="Select plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {apiPlans.map((p) => (
                                      <SelectItem key={p.id} value={p.id.toString()}>
                                        {p.name} — {currencyCode} {p.price}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">Leave blank to share the primary member's plan.</p>
                              </div>
                              <div>
                                <Label className="text-sm text-gray-600 mb-1 block">Fee ({currencyCode})</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={member.membershipFee}
                                  onChange={(e) => updateFamilyMemberField(member.id, 'membershipFee', e.target.value)}
                                  className="border-primary/20"
                                />
                              </div>
                            </div>
                            {renderPaymentCapture(
                              member.paymentMethod, member.amountPaid, member.receivedVia, member.membershipFee,
                              {
                                cardType: member.cardType, chequeNumber: member.chequeNumber, chequeDate: member.chequeDate,
                                bankName: member.bankName, bankAccountId: member.bankAccountId,
                                onlinePaymentType: member.onlinePaymentType, providerName: member.providerName,
                              },
                              {
                                onMethodChange: (val) => {
                                  updateFamilyMemberField(member.id, 'paymentMethod', val);
                                  updateFamilyMemberField(member.id, 'amountPaid', val === 'credit' ? '' : (member.membershipFee || ''));
                                },
                                onAmountChange: (val) => updateFamilyMemberField(member.id, 'amountPaid', val),
                                onReceivedViaChange: (val) => updateFamilyMemberField(member.id, 'receivedVia', val),
                                onDetailChange: (field, value) => updateFamilyMemberField(member.id, field as keyof FamilyMemberRow, value),
                              }
                            )}
                            {(() => {
                              const due = Math.max(0, parseFloat(member.membershipFee || '0') - parseFloat(member.amountPaid || '0'));
                              return due > 0 ? (
                                <p className="text-xs text-gray-500">
                                  {currencyCode} {due.toFixed(2)} will remain as this member's own outstanding balance.
                                </p>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                      );
                    })}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FaUsers className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          {formData.membershipType === 'couple'
                            ? 'Total Connected Members: 2'
                            : `Total Family Members: ${familyMembers.length + 1} (including primary member)`}
                        </span>
                      </div>
                      {formData.membershipType === 'family' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addFamilyMember}
                          className="border-primary/30 text-primary"
                        >
                          <FaPlus className="h-3 w-3 mr-1" />
                          Add More
                        </Button>
                      )}
                    </div>
                    {isFamilyHeadBillingMode() && (
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">
                            {formData.membershipType === 'couple' ? 'Couple Head Billing' : 'Family Head Billing'} — one combined invoice
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {currencyCode} {(Number(getSelectedPrimaryPlan()?.pricePerMember) || 0)} × {familyMembers.length + 1} ={' '}
                            {currencyCode} {getSelectedPrimaryPlan() ? computeFamilyHeadTotal(getSelectedPrimaryPlan()!, familyMembers.length + 1).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <p className="text-xs text-primary/70">
                          This total is captured once, below, as {`${formData.firstName} ${formData.lastName}`.trim() || 'the primary member'}'s own payment — {formData.membershipType === 'couple' ? 'the connected member' : 'family members'} above don't need a separate payment.
                        </p>
                      </div>
                    )}
                    {getFamilyMinorFeeTotal() > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-800">
                            {formData.firstName || 'Primary'}'s own fee + minor family member fees
                          </span>
                          <span className="text-sm font-bold text-amber-800">
                            {currencyCode} {getFinalPrice().toFixed(2)} + {currencyCode} {getFamilyMinorFeeTotal().toFixed(2)} ={' '}
                            {currencyCode} {(getFinalPrice() + getFamilyMinorFeeTotal()).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          The payment dialog below only collects {formData.firstName || 'the primary member'}'s own fee — minor fees are captured on their own row above and, unless marked paid there, will be added to {formData.firstName || 'the primary member'}'s due.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="joiningDate" className="mb-1.5 flex items-center gap-1.5"><FaCalendarDays className="h-3.5 w-3.5" />Joining Date <span className="text-red-500">*</span></Label>
                <Input id="joiningDate" type="date" required value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">Date member officially joins</p>
              </div>
              <div>
                <Label htmlFor="startDate" className="mb-1.5 flex items-center gap-1.5"><FaCalendarDays className="h-3.5 w-3.5" />Start Date <span className="text-red-500">*</span></Label>
                <Input id="startDate" type="date" required min={formData.joiningDate} value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">Membership service start date</p>
              </div>
            </div>
              </CardContent>
            </Card>

            {/* Membership Plans Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-lg shrink-0">
                    <FaCreditCard size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {(formData.membershipType === 'family' || formData.membershipType === 'couple')
                        ? `Choose Plan for ${(`${formData.firstName} ${formData.lastName}`.trim()) || 'the Primary Member'}`
                        : 'Choose Membership Plan'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(formData.membershipType === 'family' || formData.membershipType === 'couple')
                        ? (formData.membershipType === 'couple'
                            ? 'This is only the primary member\'s own plan — the connected member picks theirs separately below.'
                            : 'This is only the primary member\'s own plan — each family member picks theirs separately below.')
                        : 'Select the right plan for this member'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 space-y-3">

              {getFilteredMembershipPlans().length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {apiPlans.length === 0
                    ? 'No active membership plans found. Please create plans in Manage Plans first.'
                    : `No active ${formData.membershipType} plans found. Please create one in Manage Plans first.`}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFilteredMembershipPlans().map((plan) => {
                const isSelected = formData.membershipPlan === plan.id.toString();
                const discountedPrice = plan.discount && Number(plan.discount) > 0
                  ? Number(plan.price) * (1 - Number(plan.discount) / 100)
                  : Number(plan.price);
                const originalPrice = plan.discount && Number(plan.discount) > 0
                  ? Number(plan.price)
                  : null;
                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                    }`}
                    onClick={() => setFormData({ ...formData, membershipPlan: plan.id.toString() })}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                            <FaCreditCard className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                            <p className="text-gray-600">{plan.description || plan.planType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-purple-600">
                            {Math.round(discountedPrice * 100) / 100} <span className="text-lg text-gray-500"><CurrencyGlyph /></span>
                          </div>
                          {originalPrice && (
                            <div className="text-sm text-gray-500 line-through"><CurrencyGlyph /> {originalPrice}</div>
                          )}
                          {plan.discount && Number(plan.discount) > 0 && (
                            <div className="text-xs text-green-600 font-semibold">{plan.discount}% OFF</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center min-w-0 space-y-1">
                          <div className="text-xl font-bold text-gray-900 leading-tight truncate">{plan.durationValue || '-'}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{plan.durationType || 'Duration'}</div>
                        </div>
                        <div className="text-center min-w-0 space-y-1">
                          <div className="text-xl font-bold text-blue-600 leading-tight truncate" title={plan.planType}>{plan.planType}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Type</div>
                        </div>
                        <div className="text-center min-w-0 space-y-1">
                          <div className="text-xl font-bold text-green-600 leading-tight truncate">{plan.maxSessions ?? '∞'}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Sessions</div>
                        </div>
                      </div>

                      <Button
                        className={`w-full ${
                          isSelected ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-900'
                        } text-white transition-all duration-200`}
                        size="lg"
                      >
                        {isSelected ? (
                          <>
                            <FaCheck className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          `Select ${plan.name}`
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>{/* end plans grid */}

              {/* Selected Plan Summary */}
              {formData.membershipPlan && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Plan Selected</p>
                      <p className="text-sm text-green-600">
                        {getMembershipDetails().name} — <CurrencyGlyph /> {getMembershipDetails().price}
                        {getMembershipDetails().savings ? ` (Save ${currencyCode} ${getMembershipDetails().savings})` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Health Information Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded-full shrink-0">
                    <FaHeartPulse className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Health Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Medical details for member safety and emergency preparedness</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">

              {/* Health Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Medical Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="medicalConditions" className="flex items-center space-x-2">
                    <FaCircleExclamation className="h-4 w-4" style={{ color: '#2B7A78' }} />
                    <span>Medical Conditions</span>
                  </Label>
                  <Textarea
                    id="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})}
                    placeholder="e.g., Asthma, Diabetes, High Blood Pressure"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.medicalConditions.length}/500 characters
                  </p>
                </div>

                {/* Allergies */}
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="flex items-center space-x-2">
                    <FaCircleExclamation className="h-4 w-4 text-red-500" />
                    <span>Allergies</span>
                  </Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                    placeholder="e.g., Peanuts, Penicillin, Dust, Latex"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.allergies.length}/500 characters
                  </p>
                </div>

                {/* Current Medications */}
                <div className="space-y-2">
                  <Label htmlFor="currentMedications" className="flex items-center space-x-2">
                    <FaPills className="h-4 w-4" style={{ color: '#2B7A78' }} />
                    <span>Current Medications</span>
                  </Label>
                  <Textarea
                    id="currentMedications"
                    value={formData.currentMedications}
                    onChange={(e) => setFormData({...formData, currentMedications: e.target.value})}
                    placeholder="e.g., Metformin 500mg, Vitamin D 1000IU"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.currentMedications.length}/500 characters
                  </p>
                </div>

                {/* Chronic Illnesses */}
                <div className="space-y-2">
                  <Label htmlFor="chronicIllnesses" className="flex items-center space-x-2">
                    <FaHeart className="h-4 w-4 text-red-500" />
                    <span>Chronic Illnesses</span>
                  </Label>
                  <Textarea
                    id="chronicIllnesses"
                    value={formData.chronicIllnesses}
                    onChange={(e) => setFormData({...formData, chronicIllnesses: e.target.value})}
                    placeholder="e.g., Heart Disease, Arthritis, COPD"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.chronicIllnesses.length}/500 characters
                  </p>
                </div>

                {/* Blood Type */}
                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="flex items-center space-x-2">
                    <FaDroplet className="h-4 w-4 text-red-600" />
                    <span>Blood Type</span>
                  </Label>
                  <Select
                    value={formData.bloodType || undefined}
                    onValueChange={(value) => setFormData({...formData, bloodType: value})}
                  >
                    <SelectTrigger id="bloodType">
                      <SelectValue placeholder="Select Blood Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2 mb-4">
                    Important for emergency medical care
                  </p>
                </div>

                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center space-x-2">
                      <FaRuler className="h-4 w-4" style={{ color: '#2B7A78' }} />
                      <span>Height (cm)</span>
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: e.target.value})}
                      placeholder="170"
                      min="0"
                      max="300"
                      className="focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center space-x-2">
                      <FaWeightScale className="h-4 w-4" style={{ color: '#2B7A78' }} />
                      <span>Weight (kg)</span>
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      placeholder="70"
                      min="0"
                      max="500"
                      className="focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 border-b border-red-200 pb-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full">
                    <FaShield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">Emergency Contact Information</h3>
                    <p className="text-sm text-red-700">Person to contact in case of emergency</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName" className="flex items-center space-x-2 text-red-900">
                      <FaUser className="h-4 w-4 text-red-600" />
                      <span>Emergency Contact Name *</span>
                    </Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                      placeholder="Enter full name"
                      className="bg-white border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone" className="flex items-center space-x-2 text-red-900">
                      <FaPhoneVolume className="h-4 w-4 text-red-600" />
                      <span>Emergency Contact Number *</span>
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) setFormData({...formData, emergencyContactPhone: v}); }}
                      placeholder="+971 XX XXX XXXX"
                      className="bg-white border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <FaCircleExclamation className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">Why is this important?</p>
                      <p className="text-xs text-red-700">
                        Emergency contact information is crucial for member safety. In case of a medical emergency during training,
                        this person will be contacted immediately. Please ensure the contact information is accurate and up-to-date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Information Summary */}
              {(formData.medicalConditions || formData.allergies || formData.currentMedications || formData.chronicIllnesses) && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <FaCircleExclamation className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 mb-2">Health Information Summary</p>
                      <div className="space-y-1 text-sm text-amber-800">
                        {formData.medicalConditions && (
                          <p>• Medical Conditions: {formData.medicalConditions.substring(0, 50)}{formData.medicalConditions.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.allergies && (
                          <p className="text-red-700 font-medium">• Allergies: {formData.allergies.substring(0, 50)}{formData.allergies.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.currentMedications && (
                          <p>• Medications: {formData.currentMedications.substring(0, 50)}{formData.currentMedications.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.chronicIllnesses && (
                          <p>• Chronic Illnesses: {formData.chronicIllnesses.substring(0, 50)}{formData.chronicIllnesses.length > 50 ? '...' : ''}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* App Access Section — only on create mode */}
            {!isEditMode && (
              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full shrink-0">
                      <FaMobileScreen className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">App Access (Optional)</CardTitle>
                      <p className="text-sm text-muted-foreground">Create login credentials so this member can access the GymBios mobile app. Leave blank to skip.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="appUsername" className="flex items-center space-x-2">
                        <FaKey className="h-4 w-4 text-indigo-600" />
                        <span>Username</span>
                      </Label>
                      <Input
                        id="appUsername"
                        value={formData.appUsername}
                        onChange={(e) => setFormData({ ...formData, appUsername: e.target.value })}
                        placeholder="e.g. john.doe"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appPassword" className="flex items-center space-x-2">
                        <FaKey className="h-4 w-4 text-indigo-600" />
                        <span>Password</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="appPassword"
                          type={showAppPassword ? 'text' : 'password'}
                          value={formData.appPassword}
                          onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAppPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAppPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {formData.appUsername && !formData.appPassword && (
                    <p className="text-sm text-amber-600 mt-3">Both username and password are required to create app access.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* App Access Section — edit mode */}
            {isEditMode && (
              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full shrink-0">
                      <FaMobileScreen className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">App Access</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {existingUserId
                          ? 'Manage this member\'s mobile app login credentials.'
                          : 'No app login set up yet. Create credentials to give access to the mobile app.'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {existingUserId ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <FaKey className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-mono font-medium">{existingAppUsername}</span>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Change Password</Label>
                        <div className="flex gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showEditNewAppPassword ? 'text' : 'password'}
                              placeholder="New password"
                              className="pr-10"
                              value={editNewAppPassword}
                              onChange={e => setEditNewAppPassword(e.target.value)}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditNewAppPassword(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showEditNewAppPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!editNewAppPassword || isSavingMemberCredentials}
                            onClick={async () => {
                              if (!internalId) return;
                              setIsSavingMemberCredentials(true);
                              try {
                                await membersService.setMemberCredentials(internalId, existingAppUsername, editNewAppPassword);
                                setEditNewAppPassword('');
                                toast.success('Password updated successfully');
                              } catch (e: any) {
                                toast.error(e.message || 'Failed to update password');
                              } finally { setIsSavingMemberCredentials(false); }
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <FaKey className="h-4 w-4 text-indigo-600" />
                            Username
                          </Label>
                          <Input
                            placeholder="e.g. john.doe"
                            value={editNewAppUsername}
                            onChange={e => setEditNewAppUsername(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <FaKey className="h-4 w-4 text-indigo-600" />
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showEditNewAppPassword ? 'text' : 'password'}
                              placeholder="Min 6 characters"
                              className="pr-10"
                              value={editNewAppPassword}
                              onChange={e => setEditNewAppPassword(e.target.value)}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditNewAppPassword(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showEditNewAppPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {editNewAppUsername && !editNewAppPassword && (
                        <p className="text-sm text-amber-600">Both username and password are required.</p>
                      )}
                      <Button
                        type="button"
                        disabled={!editNewAppUsername || !editNewAppPassword || isSavingMemberCredentials}
                        onClick={async () => {
                          if (!internalId) return;
                          setIsSavingMemberCredentials(true);
                          try {
                            const updated = await membersService.setMemberCredentials(internalId, editNewAppUsername, editNewAppPassword);
                            setExistingUserId(updated.user_id);
                            setExistingAppUsername(updated.app_username || editNewAppUsername);
                            setEditNewAppUsername('');
                            setEditNewAppPassword('');
                            toast.success('App access created');
                          } catch (e: any) {
                            toast.error(e.message || 'Failed to create app access');
                          } finally { setIsSavingMemberCredentials(false); }
                        }}
                      >
                        Set App Access
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-3 py-4 border-t bg-slate-50/60 rounded-xl px-4">
              <p className="text-sm text-muted-foreground">
                {isAllBranches && !isEditMode
                  ? 'Select a specific branch from the sidebar to create a member.'
                  : 'All required fields must be filled before submitting.'}
              </p>
              <div className="flex gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onNavigate?.('members')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-8"
                  disabled={isAllBranches && !isEditMode}
                >
                  {isEditMode ? 'Update Member' : 'Create Member'}
                </Button>
              </div>
            </div>
          </form>
      </div>

      {/* Camera Capture Dialog */}
      <Dialog open={cameraDialogOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="camera-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FaVideo className="h-5 w-5 text-blue-600" />
              <span>Take Member Photo</span>
            </DialogTitle>
            <DialogDescription id="camera-dialog-description">
              Position the member's face in the center of the frame. The photo will be automatically cropped to fit the profile circle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-96 h-72 bg-gray-900 rounded-xl shadow-2xl"
                  onLoadedMetadata={() => {
                    // Video loaded successfully
                    setCameraError('');
                  }}
                  onError={() => {
                    setCameraError('Failed to load camera feed');
                  }}
                />
                {/* Face guide overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-48 border-4 border-white border-dashed rounded-full bg-white/10 flex items-center justify-center">
                    <div className="text-center text-white">
                      <FaUser className="h-12 w-12 mx-auto mb-2 opacity-75" />
                      <p className="text-sm opacity-75">Position face here</p>
                    </div>
                  </div>
                </div>
                {/* Corner indicators */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-white rounded-br-lg"></div>
              </div>
            </div>
            
            {/* Camera status and tips */}
            <div className="space-y-3">
              <div className="text-center text-sm text-gray-600">
                <p><strong>Photography Tips:</strong></p>
                <div className="flex justify-center space-x-4 mt-2 text-xs">
                  <span>Good lighting</span>
                  <span>Look at camera</span>
                  <span>Center face in circle</span>
                  <span>Remove glasses if possible</span>
                </div>
              </div>
              
              {/* Permission help */}
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-700">
                  <strong>Camera Permission Required:</strong> If you see a blocked camera icon in your browser's address bar, 
                  click it and select "Allow" to enable camera access.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={stopCamera} size="lg">
                <FaXmark className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={capturePhoto} 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!videoRef.current?.srcObject}
              >
                <FaCamera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }} 
                size="lg"
              >
                <FaUpload className="h-4 w-4 mr-2" />
                Upload Instead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Editor Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="photo-dialog-description">
          <DialogHeader>
            <DialogTitle>Adjust Member Photo</DialogTitle>
            <DialogDescription id="photo-dialog-description">
              Use the controls below to zoom and position the photo perfectly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedPhoto && (
              <div className="flex flex-col items-center space-y-6">
                {/* Photo Preview */}
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-border bg-muted">
                  <div
                    className="absolute inset-0 cursor-move select-none"
                    onMouseDown={handlePhotoMouseDown}
                    onMouseMove={handlePhotoMouseMove}
                    onMouseUp={handlePhotoMouseUp}
                    onMouseLeave={handlePhotoMouseUp}
                  >
                    <img
                      src={selectedPhoto}
                      alt="Member"
                      className="select-none pointer-events-none w-full h-full object-cover"
                      style={{
                        transform: `translate(${photoPosition.x}px, ${photoPosition.y}px) scale(${photoZoom[0]})`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
                
                {/* Photo Controls */}
                <div className="w-full space-y-4">
                  {/* Zoom Control */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <FaMagnifyingGlassPlus className="h-4 w-4" />
                      <span>Zoom: {photoZoom[0].toFixed(1)}x</span>
                    </Label>
                    <Slider
                      value={photoZoom}
                      onValueChange={setPhotoZoom}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Movement Controls */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <FaUpDownLeftRight className="h-4 w-4" />
                      <span>Position Controls</span>
                    </Label>
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => movePhoto('left')}
                        className="flex items-center space-x-2"
                      >
                        <FaArrowLeft className="h-4 w-4" />
                        <span>Move Left</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => movePhoto('right')}
                        className="flex items-center space-x-2"
                      >
                        <FaArrowRight className="h-4 w-4" />
                        <span>Move Right</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Reset and Actions */}
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPhotoPosition}
                    >
                      <FaRotateLeft className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaUpload className="h-4 w-4 mr-2" />
                      Choose Different Photo
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground text-center">
                    <FaUpDownLeftRight className="h-4 w-4 inline mr-1" />
                    Drag the photo to reposition • Use buttons for precise control
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
              <FaXmark className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handlePhotoSave} disabled={!selectedPhoto}>
              <FaCheck className="h-4 w-4 mr-2" />
              Save Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Selection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={() => {}}>
        {/*
          onOpenChange is intentionally a no-op (dismiss only via the explicit
          Cancel/X below), which also means DialogContent's own built-in top-right
          close button — wired straight to onOpenChange — would do nothing if
          clicked. The plain <style> tag (not a Tailwind utility class, so it
          doesn't depend on anything being pre-generated in the project's static
          stylesheet) hides that non-functional button, leaving the one manually
          wired to handlePaymentCancel (in the header below) as the only close
          control.
        */}
        <style>{`.payment-selection-dialog > button:last-child { display: none; }`}</style>
        <DialogContent className="payment-selection-dialog sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full">
                  <FaCreditCard className="h-5 w-5 text-white" />
                </div>
                <span>Select Payment Method</span>
              </DialogTitle>
              <DialogDescription>
                Choose your preferred payment method to complete the membership registration
              </DialogDescription>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePaymentCancel}
                className="h-8 w-8"
              >
                <FaXmark className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Choose how the member will pay for their membership plan. You can accept full payment, split payments, or set up installments.
            </DialogDescription>
            
            {/* Membership Summary */}
            {formData.membershipPlan && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">{getMembershipDetails().name}</h3>
                    <p className="text-sm text-blue-700">
                      Member: {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {getMembershipDetails().price} <span className="text-sm text-blue-600"><CurrencyGlyph /></span>
                    </div>
                    {getMembershipDetails().originalPrice && (
                      <div className="text-xs text-blue-600 line-through">
                        <CurrencyGlyph /> {getMembershipDetails().originalPrice}
                      </div>
                    )}
                    {getMembershipDetails().savings && (
                      <div className="text-xs text-green-600 font-semibold">
                        Save <CurrencyGlyph /> {getMembershipDetails().savings}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Family member fees (individual billing mode only — family_head
                    mode already folds everyone into the price shown above) */}
                {getFamilyMinorFeeTotal() > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200 text-sm">
                    <div className="flex items-center justify-between text-blue-800">
                      <span>{formData.firstName || 'Primary member'}'s own fee</span>
                      <span className="font-semibold">{currencyCode} {getFinalPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-800 mt-1">
                      <span>+ Family member fees ({familyMembers.filter(m => m.isMinor).length})</span>
                      <span className="font-semibold">{currencyCode} {getFamilyMinorFeeTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                      <span className="font-semibold text-blue-900">Total Amount Due (whole family):</span>
                      <span className="text-2xl font-bold text-blue-900">
                        <span className="text-sm">{currencyCode}</span> {(getFinalPrice() + getFamilyMinorFeeTotal()).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      The payment method you pick below only collects {formData.firstName || 'the primary member'}'s own {currencyCode} {getFinalPrice().toFixed(2)} — family member fees are captured on their own row below.
                      {getFamilyMinorUnpaidTotal() > 0
                        ? ` ${currencyCode} ${getFamilyMinorUnpaidTotal().toFixed(2)} of it isn't marked paid yet and will be added to ${formData.firstName || 'the primary member'}'s due.`
                        : ' All of it is already marked paid on those rows.'}
                    </p>
                  </div>
                )}

                {/* Discount Applied Badge */}
                {selectedDiscount && discountAmount > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500 text-white">
                          Discount Applied
                        </Badge>
                        <span className="text-blue-800">
                          {discountList.find(d => d.id === selectedDiscount)?.name}
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">
                        - <CurrencyGlyph /> {discountAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                      <span className="font-semibold text-blue-900">Final Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {getFinalPrice().toFixed(2)} <span className="text-sm"><CurrencyGlyph /></span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Discount Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FaDollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Select Discount (Optional)</h3>
              </div>
              
              <Select 
                value={selectedDiscount || "no-discount"} 
                onValueChange={handleDiscountChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No Discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-discount">No Discount</SelectItem>
                  {discountList.filter(d => !d.id.startsWith('referral-')).map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{discount.name}</span>
                        <span className="ml-4 text-green-600 font-semibold">
                          {discount.discountType === 'percentage' 
                            ? `${discount.discountValue}% Off` 
                            : `${currencyCode} ${discount.discountValue} Off`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Promo Code Input */}
              <div className="mt-3">
                <Label className="text-sm text-gray-600 mb-1.5 block font-medium">Have a promo code?</Label>
                <div className="flex gap-2">
                  <Input
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="border-primary/20 font-mono tracking-wider uppercase"
                    disabled={promoCodeApplied}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromoCode(); } }}
                  />
                  {promoCodeApplied ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setPromoCodeApplied(false);
                        setPromoCodeInput('');
                        setSelectedDiscount('');
                        setDiscountAmount(0);
                        setAppliedPromotionId(null);
                      }}
                    >
                      <FaXmark className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="shrink-0 bg-green-600 hover:bg-green-700"
                      onClick={handleApplyPromoCode}
                      disabled={isValidatingPromoCode || !promoCodeInput.trim()}
                    >
                      {isValidatingPromoCode ? (
                        <FaArrowsRotate className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <FaCheck className="h-4 w-4 mr-1" />
                      )}
                      Apply
                    </Button>
                  )}
                </div>
              </div>

              {/* Referral Code Input */}
              <div className="mt-3">
                <Label className="text-sm text-gray-600 mb-1.5 block font-medium">Have a referral code?</Label>
                <div className="flex gap-2">
                  <Input
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="border-primary/20 font-mono tracking-wider uppercase"
                    disabled={referralCodeApplied}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyReferralCode(); } }}
                  />
                  {referralCodeApplied ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setReferralCodeApplied(false);
                        setReferralCodeInput('');
                        setSelectedDiscount('');
                        setDiscountAmount(0);
                        setAppliedReferralId(null);
                        setAppliedReferralInfo(null);
                        // Remove referral-* items from the discount list
                        setDiscountList(prev => prev.filter(d => !d.id.startsWith('referral-')));
                      }}
                    >
                      <FaXmark className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="shrink-0 bg-purple-600 hover:bg-purple-700"
                      onClick={handleApplyReferralCode}
                      disabled={isValidatingReferralCode || !referralCodeInput.trim()}
                    >
                      {isValidatingReferralCode ? (
                        <FaArrowsRotate className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <FaCheck className="h-4 w-4 mr-1" />
                      )}
                      Apply
                    </Button>
                  )}
                </div>
              </div>

              {/* Visual confirmation of who this referral was logged for — lets
                  front-desk staff match the walk-in's face against the photo the
                  referring staff captured at referral-creation time. */}
              {referralCodeApplied && appliedReferralInfo && (
                <div className="mt-3 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  {appliedReferralInfo.refereePhoto ? (
                    <img src={appliedReferralInfo.refereePhoto} alt={appliedReferralInfo.refereeName} className="w-12 h-12 rounded-lg object-cover border border-purple-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <FaUser className="text-purple-400" size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-purple-900 truncate">{appliedReferralInfo.refereeName}</p>
                    <p className="text-xs text-purple-700">Referred by {appliedReferralInfo.referrerName}</p>
                    {!appliedReferralInfo.refereePhoto && (
                      <p className="text-xs text-purple-500">No photo was captured for this referral.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Find a pending referral by the new member's name/phone — for when
                  staff logged "referred by X" at referral-creation time but never
                  handed the person a code to type in above. */}
              {!referralCodeApplied && (
                <div className="mt-3">
                  <Label className="text-sm text-gray-600 mb-1.5 block font-medium">
                    Or find by referred person's name/phone
                  </Label>
                  <Input
                    value={refereeSearchQuery}
                    onChange={(e) => setRefereeSearchQuery(e.target.value)}
                    placeholder="Search pending referrals..."
                    className="border-primary/20"
                  />
                  {isSearchingReferee && (
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <FaArrowsRotate className="h-3 w-3 animate-spin" /> Searching...
                    </p>
                  )}
                  {!isSearchingReferee && refereeSearchQuery.trim().length >= 2 && refereeSearchResults.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1.5">No pending referrals match.</p>
                  )}
                  {refereeSearchResults.length > 0 && (
                    <div className="mt-1.5 border border-primary/20 rounded-lg divide-y divide-primary/10 overflow-hidden">
                      {refereeSearchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectPendingReferral(r)}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2.5"
                        >
                          {r.refereePhoto ? (
                            <img src={r.refereePhoto} alt={r.refereeName} className="w-9 h-9 rounded-md object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                              <FaUser className="text-gray-300" size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.refereeName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {r.refereePhone || r.refereeEmail || 'No contact info'} · Referred by {r.referrerName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedDiscount && discountAmount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <FaCheck className="h-4 w-4 text-green-600" />
                      <span className="text-green-800">
                        {discountList.find(d => d.id === selectedDiscount)?.name} applied
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">
                      Save <CurrencyGlyph /> {discountAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Options */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Payment</h3>
              <PaymentAllocationPanel
                manager={paymentManager}
                invoiceTotal={getFinalPrice()}
                bankAccounts={bankAccounts}
                customers={[{
                  code: isEditMode ? (formData.memberId || 'this-member') : 'this-member',
                  name: `${formData.firstName} ${formData.lastName}`.trim() || 'This member',
                }]}
              />
            </div>

            {/* Processed By (Staff) — credits this sale toward that staff member's revenue target */}
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">Processed By (Staff)</Label>
              <Select value={processedByStaffId || undefined} onValueChange={setProcessedByStaffId}>
                <SelectTrigger><SelectValue placeholder="Select staff member (optional)" /></SelectTrigger>
                <SelectContent>
                  {staffOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePaymentCancel}
            >
              <FaXmark className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePaymentConfirm}
              disabled={
                (isAllBranches && !isEditMode)
                || (!isEditMode && (paymentManager.paymentLines.length === 0 || !paymentManager.settleable))
              }
            >
              <FaCheck className="h-4 w-4 mr-2" />
              {isEditMode ? 'Update Member' : 'Confirm Payment & Create Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

