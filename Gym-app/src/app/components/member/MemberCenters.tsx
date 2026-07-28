"use client";

import { useState, useMemo } from "react";
import {
  Search,
  MapPin,
  Star,
  Clock,
  X,
  CreditCard,
  Banknote,
  Navigation,
  Dumbbell,
  Heart,
  Waves,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Shield,
  Tag,
  SlidersHorizontal,
  Building2,
  Zap,
  Phone,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMode = "cash" | "card" | "bnpl";
type CenterCategory = "Gym" | "Fitness Center" | "Wellness Center" | "Studio";
type GenderType = "Mixed" | "Ladies Only" | "Men Only";
type View = "listing" | "detail" | "purchase" | "confirm";

interface MembershipPlan {
  id: string;
  name: string;
  duration: string;
  durationMonths: number;
  price: number;
  originalPrice?: number;
  taxPct: number;
  features: string[];
  popular?: boolean;
  offer?: string;
}

interface Trainer {
  name: string;
  specialty: string;
  avatar: string;
}

interface Center {
  id: string;
  name: string;
  category: CenterCategory;
  address: string;
  area: string;
  distance: string;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  about: string;
  facilities: string[];
  trainers: Trainer[];
  timings: string;
  genderType: GenderType;
  plans: MembershipPlan[];
  paymentModes: PaymentMode[];
  bnplProvider?: string;
  terms: string;
  vatEnabled: boolean;
  phone: string;
  established: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CENTERS: Center[] = [
  {
    id: "1",
    name: "FitZone Premium",
    category: "Gym",
    address: "14, Hill Road, Bandra West",
    area: "Bandra West",
    distance: "0.8 km",
    rating: 4.8,
    reviews: 312,
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80",
    ],
    about:
      "FitZone Premium is Mumbai's premier fitness destination with 15,000 sq ft of state-of-the-art equipment. Our 24/7 facility offers world-class amenities, certified trainers, and a motivating community.",
    facilities: [
      "Cardio Zone",
      "Free Weights",
      "Group Classes",
      "Steam Room",
      "Locker Room",
      "Juice Bar",
      "Parking",
      "Functional Training",
    ],
    trainers: [
      { name: "Rahul Sharma", specialty: "Strength & Conditioning", avatar: "RS" },
      { name: "Priya Mehta", specialty: "HIIT & Cardio", avatar: "PM" },
      { name: "Karan Bose", specialty: "Powerlifting", avatar: "KB" },
    ],
    timings: "Mon–Sat: 5:00 AM – 11:00 PM\nSun: 7:00 AM – 9:00 PM",
    genderType: "Mixed",
    plans: [
      {
        id: "p1",
        name: "Monthly",
        duration: "1 Month",
        durationMonths: 1,
        price: 2499,
        taxPct: 18,
        features: ["Full gym access", "Group classes (4/week)", "Locker"],
        popular: false,
      },
      {
        id: "p2",
        name: "Quarterly",
        duration: "3 Months",
        durationMonths: 3,
        price: 6499,
        originalPrice: 7497,
        taxPct: 18,
        features: ["Full gym access", "Group classes (unlimited)", "Locker", "2 PT sessions"],
        popular: true,
        offer: "Save ₹998",
      },
      {
        id: "p3",
        name: "Annual",
        duration: "12 Months",
        durationMonths: 12,
        price: 22999,
        originalPrice: 29988,
        taxPct: 18,
        features: [
          "Full gym access 24/7",
          "Group classes (unlimited)",
          "Locker",
          "12 PT sessions",
          "Nutrition plan",
          "Body composition analysis",
        ],
        popular: false,
        offer: "Save ₹6,989",
      },
    ],
    paymentModes: ["cash", "card", "bnpl"],
    bnplProvider: "ZestMoney",
    terms:
      "No refund after 7 days of activation. Membership freeze available twice per year (max 30 days each). Non-transferable. Photo ID mandatory for enrollment.",
    vatEnabled: true,
    phone: "+91 98765 43210",
    established: "2018",
  },
  {
    id: "2",
    name: "Serenity Wellness Hub",
    category: "Wellness Center",
    address: "7, Chakala Road, Andheri East",
    area: "Andheri East",
    distance: "1.4 km",
    rating: 4.6,
    reviews: 189,
    image:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    ],
    about:
      "Serenity Wellness Hub combines ancient yoga traditions with modern wellness science. Our certified experts guide you toward complete mind-body balance through yoga, meditation, and holistic therapies.",
    facilities: [
      "Yoga Studio",
      "Meditation Room",
      "Spa",
      "Detox Bar",
      "Therapy Rooms",
      "Rooftop Garden",
      "Sound Bath Room",
    ],
    trainers: [
      { name: "Ananya Gupta", specialty: "Yoga & Meditation", avatar: "AG" },
      { name: "Riya Sharma", specialty: "Ayurvedic Therapy", avatar: "RS" },
    ],
    timings: "All Days: 6:00 AM – 9:00 PM",
    genderType: "Mixed",
    plans: [
      {
        id: "p4",
        name: "Monthly",
        duration: "1 Month",
        durationMonths: 1,
        price: 3999,
        taxPct: 18,
        features: ["All yoga classes", "2 meditation sessions/week", "Spa access (2×/month)"],
        popular: false,
      },
      {
        id: "p5",
        name: "Annual",
        duration: "12 Months",
        durationMonths: 12,
        price: 39999,
        originalPrice: 47988,
        taxPct: 18,
        features: [
          "Unlimited classes",
          "Daily meditation",
          "Unlimited spa",
          "Therapy (4 sessions/month)",
          "Personal wellness plan",
        ],
        popular: true,
        offer: "Save ₹7,989",
      },
    ],
    paymentModes: ["card", "bnpl"],
    bnplProvider: "LazyPay",
    terms:
      "Sessions must be booked 24 hours in advance. Cancellations within 2 hours forfeit the session credit. Quiet dress code mandatory.",
    vatEnabled: true,
    phone: "+91 98765 11223",
    established: "2020",
  },
  {
    id: "3",
    name: "PowerFit Ladies Studio",
    category: "Studio",
    address: "22, JVPD Scheme, Juhu",
    area: "Juhu",
    distance: "2.1 km",
    rating: 4.9,
    reviews: 428,
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80",
    ],
    about:
      "PowerFit is an exclusive ladies-only studio offering high-energy group classes, personal training, and a supportive community where women empower each other every day.",
    facilities: ["Dance Studio", "Boxing Ring", "Pilates Zone", "Dressing Rooms", "Childcare Area", "Café Corner"],
    trainers: [
      { name: "Deepika Nair", specialty: "Dance & Zumba", avatar: "DN" },
      { name: "Sneha Kapoor", specialty: "Pilates & Core", avatar: "SK" },
    ],
    timings: "Mon–Sat: 6:00 AM – 10:00 PM\nSun: 7:00 AM – 8:00 PM",
    genderType: "Ladies Only",
    plans: [
      {
        id: "p6",
        name: "Monthly",
        duration: "1 Month",
        durationMonths: 1,
        price: 1999,
        taxPct: 18,
        features: ["Unlimited group classes", "Locker access", "Childcare included"],
        popular: false,
      },
      {
        id: "p7",
        name: "Quarterly",
        duration: "3 Months",
        durationMonths: 3,
        price: 5499,
        originalPrice: 5997,
        taxPct: 18,
        features: ["Unlimited classes", "Locker", "1 free PT session", "Dance workshop access"],
        popular: true,
        offer: "Save ₹498",
      },
    ],
    paymentModes: ["cash", "card"],
    terms: "Exclusive ladies-only facility. Valid government-issued ID required at enrollment. No male guests on premises.",
    vatEnabled: false,
    phone: "+91 98765 55678",
    established: "2021",
  },
  {
    id: "4",
    name: "AquaFit Sports Complex",
    category: "Fitness Center",
    address: "Hiranandani Gardens, Powai",
    area: "Powai",
    distance: "3.5 km",
    rating: 4.4,
    reviews: 156,
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
      "https://images.unsplash.com/photo-1625029219568-dbe68dc70534?w=600&q=80",
    ],
    about:
      "AquaFit Sports Complex is a world-class multi-sport facility with an Olympic-size pool, tennis courts, basketball courts, and a premium gym — all under one roof.",
    facilities: [
      "Olympic Pool",
      "Tennis Courts (4)",
      "Basketball Court",
      "Gym Floor",
      "Cafeteria",
      "Sports Shop",
      "Physiotherapy",
    ],
    trainers: [
      { name: "Arjun Singh", specialty: "Swimming & Aqua Fitness", avatar: "AS" },
      { name: "Vikram Patel", specialty: "Tennis Coaching", avatar: "VP" },
    ],
    timings: "All Days: 5:30 AM – 10:00 PM",
    genderType: "Mixed",
    plans: [
      {
        id: "p8",
        name: "Monthly",
        duration: "1 Month",
        durationMonths: 1,
        price: 4999,
        taxPct: 18,
        features: ["Pool access", "Gym floor", "Group classes", "Court access (shared)"],
        popular: false,
      },
      {
        id: "p9",
        name: "Annual",
        duration: "12 Months",
        durationMonths: 12,
        price: 49999,
        originalPrice: 59988,
        taxPct: 18,
        features: [
          "All facilities",
          "Unlimited access",
          "Coaching (8 sessions/month)",
          "Priority court booking",
          "Guest passes (4/year)",
        ],
        popular: true,
        offer: "Save ₹9,989",
      },
    ],
    paymentModes: ["card"],
    terms:
      "Swimming cap mandatory in pool area. Court bookings must be made 48 hours in advance. No outside food or beverages.",
    vatEnabled: true,
    phone: "+91 98765 88901",
    established: "2016",
  },
];

// ─── Helper maps ──────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<CenterCategory, React.ReactNode> = {
  Gym: <Dumbbell className="w-3 h-3" />,
  "Fitness Center": <Heart className="w-3 h-3" />,
  "Wellness Center": <Waves className="w-3 h-3" />,
  Studio: <Users className="w-3 h-3" />,
};

const CATEGORY_COLOR: Record<CenterCategory, string> = {
  Gym: "bg-[#327F74]/10 text-[#327F74] border-[#327F74]/20",
  "Fitness Center": "bg-orange-50 text-orange-700 border-orange-200",
  "Wellness Center": "bg-purple-50 text-purple-700 border-purple-200",
  Studio: "bg-pink-50 text-pink-700 border-pink-200",
};

const PAYMENT_LABEL: Record<PaymentMode, string> = {
  cash: "Cash",
  card: "Card",
  bnpl: "BNPL",
};

const PAYMENT_ICON: Record<PaymentMode, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  bnpl: <Zap className="w-4 h-4" />,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? "text-[#F5C742] fill-[#F5C742]" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

function GenderBadge({ type }: { type: GenderType }) {
  const styles: Record<GenderType, string> = {
    Mixed: "bg-blue-50 text-blue-700 border-blue-200",
    "Ladies Only": "bg-pink-50 text-pink-700 border-pink-200",
    "Men Only": "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[type]}`}>
      {type}
    </span>
  );
}

// ─── CenterCard ───────────────────────────────────────────────────────────────

function CenterCard({
  center,
  onViewDetails,
  onBuyMembership,
}: {
  center: Center;
  onViewDetails: (c: Center) => void;
  onBuyMembership: (c: Center) => void;
}) {
  const lowestPlan = center.plans.reduce((a, b) => (a.price < b.price ? a : b));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={center.image}
          alt={center.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Category pill */}
        <div
          className={`absolute top-3 left-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${CATEGORY_COLOR[center.category]}`}
        >
          {CATEGORY_ICON[center.category]}
          {center.category}
        </div>
        {/* Distance */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
          <Navigation className="w-2.5 h-2.5" />
          {center.distance}
        </div>
        {/* Gender badge if not mixed */}
        {center.genderType !== "Mixed" && (
          <div className="absolute bottom-3 left-3">
            <GenderBadge type={center.genderType} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight flex-1 pr-2">
            {center.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 text-[#F5C742] fill-[#F5C742]" />
            <span className="text-[13px] font-bold text-gray-900">{center.rating}</span>
            <span className="text-[11px] text-gray-400">({center.reviews})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-500 mb-3">
          <MapPin className="w-3 h-3 text-[#327F74] shrink-0" />
          <span className="text-[12px] truncate">{center.address}</span>
        </div>

        {/* Facilities chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {center.facilities.slice(0, 3).map((f) => (
            <span key={f} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {f}
            </span>
          ))}
          {center.facilities.length > 3 && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              +{center.facilities.length - 3} more
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between mb-3 py-2 border-t border-b border-gray-100">
          <div>
            <div className="text-[10px] text-gray-400 font-medium">Starting from</div>
            <div className="text-[16px] font-extrabold text-gray-900">
              ₹{lowestPlan.price.toLocaleString()}
              <span className="text-[11px] font-normal text-gray-500"> /month</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {center.paymentModes.slice(0, 2).map((m) => (
              <div
                key={m}
                className="flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
              >
                {PAYMENT_ICON[m]}
                <span>{PAYMENT_LABEL[m]}</span>
              </div>
            ))}
            {center.paymentModes.includes("bnpl") && (
              <div className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded border border-[#F59E0B]/20 font-semibold">
                BNPL
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(center)}
            className="flex-1 py-2.5 rounded-xl border-2 border-[#327F74] text-[#327F74] text-[12px] font-semibold hover:bg-[#327F74] hover:text-white transition-colors"
          >
            View Details
          </button>
          <button
            onClick={() => onBuyMembership(center)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[12px] font-semibold shadow-md hover:shadow-lg transition-shadow"
          >
            Buy Membership
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

interface Filters {
  category: CenterCategory | "";
  priceRange: "" | "under2k" | "2k-5k" | "above5k";
  genderType: GenderType | "";
  paymentMode: PaymentMode | "";
}

const DEFAULT_FILTERS: Filters = {
  category: "",
  priceRange: "",
  genderType: "",
  paymentMode: "",
};

function FilterPanel({
  filters,
  onChange,
  onClose,
  onReset,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  const toggle = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === val ? ("" as Filters[K]) : val }));
  };

  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 z-10 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-gray-900">Filter Centers</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Center Type */}
        <div className="mb-5">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Center Type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["Gym", "Fitness Center", "Wellness Center", "Studio"] as CenterCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => toggle("category", c)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-colors ${
                  local.category === c
                    ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74]"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {CATEGORY_ICON[c]}
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-5">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Monthly Price
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { val: "under2k" as const, label: "Under ₹2,000" },
              { val: "2k-5k" as const, label: "₹2,000–₹5,000" },
              { val: "above5k" as const, label: "Above ₹5,000" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => toggle("priceRange", val)}
                className={`px-3 py-2 rounded-full border text-[12px] font-medium transition-colors ${
                  local.priceRange === val
                    ? "border-[#F5C742] bg-[#F5C742]/10 text-[#F59E0B]"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="mb-5">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Facility Type
          </p>
          <div className="flex flex-wrap gap-2">
            {(["Mixed", "Ladies Only", "Men Only"] as GenderType[]).map((g) => (
              <button
                key={g}
                onClick={() => toggle("genderType", g)}
                className={`px-3 py-2 rounded-full border text-[12px] font-medium transition-colors ${
                  local.genderType === g
                    ? "border-pink-400 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Mode */}
        <div className="mb-6">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Payment Options
          </p>
          <div className="flex gap-2">
            {(["cash", "card", "bnpl"] as PaymentMode[]).map((m) => (
              <button
                key={m}
                onClick={() => toggle("paymentMode", m)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12px] font-medium transition-colors ${
                  local.paymentMode === m
                    ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74]"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {PAYMENT_ICON[m]}
                {PAYMENT_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setLocal(DEFAULT_FILTERS);
              onReset();
            }}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-[13px] font-semibold"
          >
            Reset{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <button
            onClick={() => {
              onChange(local);
              onClose();
            }}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[13px] font-semibold shadow-md"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CenterDetail ─────────────────────────────────────────────────────────────

function CenterDetail({
  center,
  onClose,
  onBuyMembership,
}: {
  center: Center;
  onClose: () => void;
  onBuyMembership: (c: Center) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "trainers" | "info">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "plans" as const, label: "Plans" },
    { id: "trainers" as const, label: "Trainers" },
    { id: "info" as const, label: "Info" },
  ];

  return (
    <div className="absolute inset-0 bg-[#f9fafe] z-40 flex flex-col overflow-hidden">
      {/* Image gallery */}
      <div className="relative h-52 shrink-0">
        <img
          src={center.images[imgIdx]}
          alt={center.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Back button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Image dots */}
        {center.images.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
            {center.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`rounded-full transition-all ${
                  i === imgIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Prev/Next */}
        {center.images.length > 1 && (
          <>
            <button
              onClick={() => setImgIdx((i) => (i - 1 + center.images.length) % center.images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-1.5 rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImgIdx((i) => (i + 1) % center.images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-1.5 rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1 ${CATEGORY_COLOR[center.category]}`}
              >
                {CATEGORY_ICON[center.category]}
                {center.category}
              </div>
              <h2 className="text-[18px] font-extrabold text-white leading-tight">
                {center.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#F5C742] fill-[#F5C742]" />
                  <span className="text-[12px] font-bold text-white">{center.rating}</span>
                  <span className="text-[11px] text-white/70">({center.reviews} reviews)</span>
                </div>
                <GenderBadge type={center.genderType} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-[#327F74]" />
          <span className="text-[11px]">{center.area}</span>
          <span className="text-[11px] text-[#327F74] font-semibold">· {center.distance}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px]">Est. {center.established}</span>
        </div>
        <a
          href={`tel:${center.phone}`}
          className="flex items-center gap-1 text-[#327F74] bg-[#327F74]/10 px-2.5 py-1 rounded-full"
        >
          <Phone className="w-3 h-3" />
          <span className="text-[11px] font-semibold">Call</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 shrink-0">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-3 text-[12px] font-semibold border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-[#F5C742] text-[#F59E0B]"
                  : "border-transparent text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            {/* About */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-2">About</h4>
              <p className="text-[12px] text-gray-600 leading-relaxed">{center.about}</p>
            </div>

            {/* Timings */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#327F74]" />
                <h4 className="text-[13px] font-bold text-gray-900">Timings</h4>
              </div>
              <p className="text-[12px] text-gray-600 whitespace-pre-line">{center.timings}</p>
            </div>

            {/* Facilities */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-3">Facilities</h4>
              <div className="grid grid-cols-2 gap-2">
                {center.facilities.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#327F74] shrink-0" />
                    <span className="text-[12px] text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "plans" && (
          <div className="p-4 space-y-3">
            {center.plans.map((plan) => {
              const taxAmt = Math.round(plan.price * (plan.taxPct / 100));
              const total = plan.price + (center.vatEnabled ? taxAmt : 0);
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                    plan.popular ? "border-[#F5C742]" : "border-transparent"
                  }`}
                >
                  {plan.popular && (
                    <div className="flex items-center gap-1 text-[#F59E0B] text-[10px] font-bold mb-2">
                      <Tag className="w-3 h-3" />
                      MOST POPULAR
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-900">{plan.name}</h4>
                      <p className="text-[12px] text-gray-500">{plan.duration}</p>
                      {plan.offer && (
                        <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                          🎉 {plan.offer}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-extrabold text-gray-900">
                        ₹{plan.price.toLocaleString()}
                      </div>
                      {plan.originalPrice && (
                        <div className="text-[11px] text-gray-400 line-through">
                          ₹{plan.originalPrice.toLocaleString()}
                        </div>
                      )}
                      {center.vatEnabled && (
                        <div className="text-[10px] text-gray-400">
                          +{plan.taxPct}% GST = ₹{total.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#327F74] mt-0.5 shrink-0" />
                        <span className="text-[12px] text-gray-700">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onBuyMembership(center)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[12px] font-semibold shadow-sm"
                  >
                    Select Plan
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "trainers" && (
          <div className="p-4 space-y-3">
            {center.trainers.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#327F74] to-[#2a6b62] flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-white">{t.avatar}</span>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-gray-900">{t.name}</h4>
                  <p className="text-[12px] text-gray-500">{t.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "info" && (
          <div className="p-4 space-y-4">
            {/* Payment modes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-3">Payment Options</h4>
              <div className="space-y-2">
                {(["cash", "card", "bnpl"] as PaymentMode[]).map((m) => {
                  const enabled = center.paymentModes.includes(m);
                  return (
                    <div
                      key={m}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                        enabled ? "border-[#327F74]/30 bg-[#327F74]/5" : "border-gray-100 bg-gray-50 opacity-50"
                      }`}
                    >
                      <div className={enabled ? "text-[#327F74]" : "text-gray-400"}>
                        {PAYMENT_ICON[m]}
                      </div>
                      <span className={`text-[13px] font-medium ${enabled ? "text-gray-800" : "text-gray-400"}`}>
                        {PAYMENT_LABEL[m]}
                        {m === "bnpl" && center.bnplProvider && enabled ? ` via ${center.bnplProvider}` : ""}
                      </span>
                      <div className="ml-auto">
                        {enabled ? (
                          <CheckCircle className="w-4 h-4 text-[#327F74]" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tax */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-gray-400" />
                <h4 className="text-[13px] font-bold text-gray-900">Tax & Charges</h4>
              </div>
              <p className="text-[12px] text-gray-600">
                {center.vatEnabled
                  ? "18% GST is applicable on all membership plans and is included in the final amount shown at checkout."
                  : "No additional GST/VAT is applicable at this center. Prices are all-inclusive."}
              </p>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#327F74]" />
                <h4 className="text-[13px] font-bold text-gray-900">Terms & Policies</h4>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{center.terms}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="bg-white border-t border-gray-100 p-4 shrink-0">
        <button
          onClick={() => onBuyMembership(center)}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[14px] font-bold shadow-lg"
        >
          Buy Membership
        </button>
      </div>
    </div>
  );
}

// ─── PurchaseFlow ─────────────────────────────────────────────────────────────

function PurchaseFlow({
  center,
  onClose,
  onSuccess,
}: {
  center: Center;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    center.plans.find((p) => p.popular)?.id ?? center.plans[0].id
  );
  const [step, setStep] = useState<"plan" | "payment" | "review">("plan");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode>(
    center.paymentModes[0]
  );

  const plan = center.plans.find((p) => p.id === selectedPlanId)!;
  const taxAmt = center.vatEnabled ? Math.round(plan.price * (plan.taxPct / 100)) : 0;
  const total = plan.price + taxAmt;

  const stepLabels = ["Select Plan", "Payment", "Review"];
  const stepIdx = step === "plan" ? 0 : step === "payment" ? 1 : 2;

  return (
    <div className="absolute inset-0 bg-[#f9fafe] z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">Buy Membership</h2>
            <p className="text-[11px] text-gray-500">{center.name}</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    i < stepIdx
                      ? "bg-[#327F74] text-white"
                      : i === stepIdx
                      ? "bg-[#F5C742] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < stepIdx ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-[9px] mt-1 font-medium ${
                    i === stepIdx ? "text-[#F59E0B]" : i < stepIdx ? "text-[#327F74]" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${
                    i < stepIdx ? "bg-[#327F74]" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === "plan" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[#327F74]" />
                <span className="text-[13px] font-bold text-gray-900">{center.name}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 text-[12px]">
                <MapPin className="w-3 h-3" />
                {center.address}
              </div>
            </div>

            {center.plans.map((p) => {
              const pTax = center.vatEnabled ? Math.round(p.price * (p.taxPct / 100)) : 0;
              const pTotal = p.price + pTax;
              const selected = selectedPlanId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-colors ${
                    selected ? "border-[#F5C742]" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selected ? "border-[#F5C742] bg-[#F5C742]" : "border-gray-300"
                        }`}
                      >
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-[14px] font-bold text-gray-900">{p.name}</span>
                      {p.popular && (
                        <span className="text-[9px] bg-[#F5C742]/20 text-[#F59E0B] font-bold px-1.5 py-0.5 rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-extrabold text-gray-900">
                        ₹{p.price.toLocaleString()}
                      </div>
                      {center.vatEnabled && (
                        <div className="text-[10px] text-gray-400">
                          ₹{pTotal.toLocaleString()} incl. GST
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-6 flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">{p.duration}</span>
                    {p.offer && (
                      <span className="text-[10px] text-green-700 font-semibold">· {p.offer}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {step === "payment" && (
          <>
            {/* Plan summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[12px] text-gray-500">Selected Plan</div>
                  <div className="text-[14px] font-bold text-gray-900">{plan.name} · {plan.duration}</div>
                </div>
                <button
                  onClick={() => setStep("plan")}
                  className="text-[#327F74] text-[12px] font-semibold"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-3">Select Payment Method</h4>
              <div className="space-y-2">
                {(["cash", "card", "bnpl"] as PaymentMode[]).map((m) => {
                  const enabled = center.paymentModes.includes(m);
                  const selected = selectedPayment === m;
                  return (
                    <button
                      key={m}
                      disabled={!enabled}
                      onClick={() => setSelectedPayment(m)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                        !enabled
                          ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                          : selected
                          ? "border-[#F5C742] bg-[#F5C742]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={selected ? "text-[#F59E0B]" : "text-gray-500"}>
                        {PAYMENT_ICON[m]}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`text-[13px] font-semibold ${selected ? "text-gray-900" : "text-gray-700"}`}>
                          {PAYMENT_LABEL[m]}
                          {m === "bnpl" && center.bnplProvider && enabled
                            ? ` via ${center.bnplProvider}`
                            : ""}
                        </div>
                        {m === "bnpl" && enabled && (
                          <div className="text-[10px] text-[#F59E0B]">
                            Pay in easy instalments
                          </div>
                        )}
                        {!enabled && (
                          <div className="text-[10px] text-gray-400">Not available at this center</div>
                        )}
                      </div>
                      {enabled && (
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selected ? "border-[#F5C742] bg-[#F5C742]" : "border-gray-300"
                          }`}
                        >
                          {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card details if card selected */}
            {selectedPayment === "card" && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="text-[13px] font-bold text-gray-900 mb-3">Card Details</h4>
                <div className="space-y-2.5">
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-[#F5C742] bg-gray-50"
                    placeholder="Card Number"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="border border-gray-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-[#F5C742] bg-gray-50"
                      placeholder="MM/YY"
                    />
                    <input
                      className="border border-gray-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-[#F5C742] bg-gray-50"
                      placeholder="CVV"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {step === "review" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-4">Order Summary</h4>
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Center</span>
                  <span className="font-semibold text-gray-900">{center.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold text-gray-900">{plan.name} ({plan.duration})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment</span>
                  <span className="font-semibold text-gray-900">{PAYMENT_LABEL[selectedPayment]}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Membership fee</span>
                    <span>₹{plan.price.toLocaleString()}</span>
                  </div>
                  {center.vatEnabled && (
                    <div className="flex justify-between text-gray-600">
                      <span>GST ({plan.taxPct}%)</span>
                      <span>₹{taxAmt.toLocaleString()}</span>
                    </div>
                  )}
                  {!center.vatEnabled && (
                    <div className="flex justify-between text-green-700 text-[12px]">
                      <span>GST / VAT</span>
                      <span>Not applicable</span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-[15px] font-bold text-gray-900">Total Payable</span>
                  <span className="text-[18px] font-extrabold text-[#327F74]">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-700 mt-0.5 shrink-0" />
                <p className="text-[11px] text-yellow-800 leading-relaxed">
                  By proceeding, you agree to {center.name}&apos;s terms and policies. Ensure you have read
                  all membership terms before confirming.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Key Terms
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">{center.terms}</p>
            </div>
          </>
        )}
      </div>

      {/* Bottom action */}
      <div className="bg-white border-t border-gray-100 p-4 shrink-0">
        {step !== "review" ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[12px] text-gray-500 px-1">
              <span>{plan.name} · {plan.duration}</span>
              <span className="font-semibold text-gray-900">
                ₹{total.toLocaleString()} {center.vatEnabled ? "(incl. GST)" : ""}
              </span>
            </div>
            <button
              onClick={() => setStep(step === "plan" ? "payment" : "review")}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[14px] font-bold shadow-lg flex items-center justify-center gap-2"
            >
              {step === "plan" ? "Continue to Payment" : "Review Order"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSuccess}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#327F74] to-[#2a6b62] text-white text-[14px] font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm & Pay ₹{total.toLocaleString()}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function SuccessScreen({ center, onDone }: { center: Center; onDone: () => void }) {
  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-[#327F74]/10 flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-[#327F74]" />
      </div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-2">
        Membership Purchased!
      </h2>
      <p className="text-[13px] text-gray-500 mb-1">You are now a member of</p>
      <p className="text-[16px] font-bold text-[#327F74] mb-6">{center.name}</p>
      <div className="bg-[#f9fafe] rounded-2xl px-6 py-4 mb-8 w-full border border-gray-100">
        <p className="text-[12px] text-gray-500 mb-1">Confirmation has been sent to your</p>
        <p className="text-[12px] font-semibold text-gray-900">registered email & phone number</p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white text-[14px] font-bold shadow-md"
      >
        Done
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberCenters() {
  const [view, setView] = useState<View>("listing");
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [locationDetected, setLocationDetected] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filtered = useMemo(() => {
    return CENTERS.filter((c) => {
      // Search
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.area.toLowerCase().includes(search.toLowerCase()) &&
        !c.category.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      // Category filter
      if (filters.category && c.category !== filters.category) return false;
      // Price filter
      if (filters.priceRange) {
        const lowest = Math.min(...c.plans.map((p) => p.price));
        if (filters.priceRange === "under2k" && lowest >= 2000) return false;
        if (filters.priceRange === "2k-5k" && (lowest < 2000 || lowest > 5000)) return false;
        if (filters.priceRange === "above5k" && lowest <= 5000) return false;
      }
      // Gender filter
      if (filters.genderType && c.genderType !== filters.genderType) return false;
      // Payment filter
      if (filters.paymentMode && !c.paymentModes.includes(filters.paymentMode)) return false;
      return true;
    });
  }, [search, filters]);

  const handleViewDetails = (c: Center) => {
    setSelectedCenter(c);
    setView("detail");
  };

  const handleBuyMembership = (c: Center) => {
    setSelectedCenter(c);
    setView("purchase");
  };

  const handleSuccess = () => setView("confirm");

  const handleDone = () => {
    setView("listing");
    setSelectedCenter(null);
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
      {/* ── Listing ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero search bar */}
        <div className="bg-gradient-to-br from-[#327F74] to-[#2a6b62] px-4 pt-4 pb-6">
          <h2 className="text-[16px] font-bold text-white mb-1">Find Wellness Centers</h2>
          <p className="text-[12px] text-white/70 mb-4">
            Discover gyms, studios & wellness hubs near you
          </p>

          {/* Search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, area, or type…"
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F5C742]/50 shadow-sm"
            />
          </div>

          {/* Location + Filter row */}
          <div className="flex gap-2">
            <button
              onClick={() => setLocationDetected(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors flex-1 ${
                locationDetected
                  ? "bg-white text-[#327F74]"
                  : "bg-white/20 text-white border border-white/30"
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${locationDetected ? "text-[#327F74]" : ""}`} />
              {locationDetected ? "Bandra West, Mumbai" : "Use My Location"}
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                activeFilterCount > 0
                  ? "bg-[#F5C742] text-white border-[#F5C742]"
                  : "bg-white/20 text-white border-white/30"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-[#F59E0B] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {filters.category && (
              <div className="flex items-center gap-1 bg-[#327F74]/10 text-[#327F74] text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                {filters.category}
                <button onClick={() => setFilters((f) => ({ ...f, category: "" }))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.genderType && (
              <div className="flex items-center gap-1 bg-pink-50 text-pink-700 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                {filters.genderType}
                <button onClick={() => setFilters((f) => ({ ...f, genderType: "" }))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.priceRange && (
              <div className="flex items-center gap-1 bg-[#F5C742]/10 text-[#F59E0B] text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                {filters.priceRange === "under2k"
                  ? "Under ₹2k"
                  : filters.priceRange === "2k-5k"
                  ? "₹2k–₹5k"
                  : "Above ₹5k"}
                <button onClick={() => setFilters((f) => ({ ...f, priceRange: "" }))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.paymentMode && (
              <div className="flex items-center gap-1 bg-gray-100 text-gray-700 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                {PAYMENT_LABEL[filters.paymentMode]}
                <button onClick={() => setFilters((f) => ({ ...f, paymentMode: "" }))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="shrink-0 text-[11px] text-red-500 font-semibold ml-auto"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[12px] text-gray-500">
            <span className="font-bold text-gray-900">{filtered.length}</span> centers
            {locationDetected ? " near Bandra West" : " available"}
          </p>
        </div>

        {/* Center cards */}
        <div className="px-4 pb-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-gray-400">No centers found</p>
              <p className="text-[12px] text-gray-400 mt-1">Try adjusting your filters or search</p>
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSearch("");
                }}
                className="mt-4 text-[13px] text-[#327F74] font-semibold"
              >
                Reset search
              </button>
            </div>
          ) : (
            filtered.map((c) => (
              <CenterCard
                key={c.id}
                center={c}
                onViewDetails={handleViewDetails}
                onBuyMembership={handleBuyMembership}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {view === "detail" && selectedCenter && (
        <CenterDetail
          center={selectedCenter}
          onClose={() => setView("listing")}
          onBuyMembership={handleBuyMembership}
        />
      )}

      {view === "purchase" && selectedCenter && (
        <PurchaseFlow
          center={selectedCenter}
          onClose={() => setView(selectedCenter ? "detail" : "listing")}
          onSuccess={handleSuccess}
        />
      )}

      {view === "confirm" && selectedCenter && (
        <SuccessScreen center={selectedCenter} onDone={handleDone} />
      )}
    </div>
  );
}
