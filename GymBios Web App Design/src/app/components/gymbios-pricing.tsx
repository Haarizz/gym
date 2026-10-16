import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import {
  Dumbbell,
  Star,
  Crown,
  ArrowRight,
  CheckCircle,
  Users,
  BarChart3,
  Shield,
  Smartphone,
  Globe,
  Headphones,
  Phone,
  Mail,
  MessageSquare,
  X,
  Building2,
  MapPin,
  Settings,
  Target,
} from "lucide-react";
import { BusinessOnboardingFullscreen } from "./business-onboarding-fullscreen";

const plans = [
  {
    name: "Essentials",
    price: "AED 960 / year",
    tagline: "Start strong with core automation",
    description: "Ideal for independent gyms and studios getting started with GymBios.",
    highlight: false,
    badge: null as string | null,
    cta: "Start with Essentials",
    features: [
      "Member onboarding & profiles",
      "Scheduling & bookings",
      "Billing and payments",
      "POS & basic inventory",
      "Financial snapshots & reports",
      "Basic marketing & CRM",
      "Access control integration",
      "Standard support",
    ],
  },
  {
    name: "Standard",
    price: "AED 2,940 / year",
    tagline: "Best balance of growth & control",
    description: "Perfect for growing gyms that need multi-branch control and smart budgeting.",
    highlight: true,
    badge: "Most Popular",
    cta: "Choose Standard",
    features: [
      "Everything in Essentials",
      "White-labelled GymBios app",
      "Workforce & shift management",
      "Budget Intelligence (Financial control)",
      "Multi-Branch & franchise management",
      "Equipment & maintenance management",
      "Member Experience Tracker",
      "Service & plans portfolio control",
      "Priority support",
    ],
  },
  {
    name: "Professional",
    price: "AED 4,670 / year",
    tagline: "Deep intelligence for serious scale",
    description: "Advanced analytics, growth tools, and automation for high-performance fitness brands.",
    highlight: false,
    badge: null as string | null,
    cta: "Go Professional",
    features: [
      "Everything in Standard",
      "Revenue-optimized payment flows",
      "Advanced BI dashboards & analytics",
      "Marketing & sales growth toolkit",
      "Automation for daily operations",
      "Member retention & personalization",
      "Upsell-ready premium add-ons",
      "Account manager support",
    ],
  },
];

const enterprisePlan = {
  name: "Enterprise",
  price: "Custom enterprise pricing",
  tagline: "Designed for chains, franchises & large fitness ecosystems.",
  description:
    "Partner with GymBios to build a connected fitness business operating system across locations, brands, and countries.",
  cta: "Talk to Sales",
  features: [
    "Everything in Professional",
    "AI-driven revenue & churn intelligence",
    "Computer Vision & biometric AI integration",
    "Wearables, e-commerce & partner ecosystem integrations",
    "Smart workforce & trainer performance AI",
    "Executive AI assistant dashboards",
    "Multi-branch intelligence & benchmarking",
    "Tailored onboarding & dedicated success team",
  ],
};

const featureHighlights = [
  {
    icon: Users,
    title: "Member Lifecycle Intelligence",
    description:
      "Track the full member journey from lead to loyal customer with smart engagement triggers and workflows.",
  },
  {
    icon: BarChart3,
    title: "Business Command Center",
    description:
      "Single dashboard for revenue, attendance, utilization, and performance across locations and teams.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description:
      "Enterprise-grade security, role-based access, and activity logs keep your business and members protected.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Experience",
    description:
      "Operators, trainers, and members get a seamless experience across web and mobile — anywhere, anytime.",
  },
  {
    icon: Globe,
    title: "Multi-Branch Ready",
    description:
      "Built for single gyms to multi-country franchises with unified reporting and centralized control.",
  },
  {
    icon: Headphones,
    title: "Human + Tech Support",
    description:
      "Onboarding assistance, training, and responsive support from people who understand fitness businesses.",
  },
];

const faqs = [
  {
    question: "Is there a setup or onboarding fee?",
    answer:
      "For most gyms, onboarding is included in the subscription. For complex multi-branch rollouts, we'll quote a one-time onboarding project if needed.",
  },
  {
    question: "Can I migrate from my existing system?",
    answer:
      "Yes. We support guided data migration for members, plans, payments, and more. Our team will help you structure the import.",
  },
  {
    question: "Is GymBios suitable for multi-branch or franchise setups?",
    answer:
      "Absolutely. Standard, Professional, and Enterprise plans are designed with multi-location control and intelligence in mind.",
  },
  {
    question: "Can I upgrade between plans later?",
    answer:
      "Yes, you can upgrade at any time as your business grows. We'll pro-rate and align your billing cycle.",
  },
  {
    question: "Do you offer support and training?",
    answer:
      "All plans include support. Higher tiers include priority support, training sessions, and a dedicated success manager on Enterprise.",
  },
];

// Business Onboarding Modal Types and Data
type BusinessOnboardingData = {
  plan: string | null;
  businessName: string;
  businessTypes: string[];
  yearsInBusiness: string;
  country: string;
  state: string;
  cityArea: string;
  address: string;
  branches: string;
  memberCount: string;
  staffCount: string;
  services: string[];
  currentSoftware: string;
  reasonsToSwitch: string[];
  goals: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  notes: string;
};

const BUSINESS_TYPE_OPTIONS: { label: string; value: string; group: string }[] = [
  // Fitness & Gym
  { label: "Gym / Fitness Center", value: "gym", group: "Fitness & Gym" },
  { label: "CrossFit Box", value: "crossfit", group: "Fitness & Gym" },
  { label: "Personal Training Studio", value: "pt_studio", group: "Fitness & Gym" },
  { label: "Strength & Conditioning Center", value: "strength_conditioning", group: "Fitness & Gym" },
  { label: "Functional Fitness Studio", value: "functional_fitness", group: "Fitness & Gym" },

  // Wellness & Holistic
  { label: "Wellness Center", value: "wellness_center", group: "Wellness & Holistic" },
  { label: "Yoga Studio", value: "yoga", group: "Wellness & Holistic" },
  { label: "Pilates Studio", value: "pilates", group: "Wellness & Holistic" },
  { label: "Meditation / Mindfulness Studio", value: "meditation", group: "Wellness & Holistic" },
  { label: "Rehab / Physiotherapy Center", value: "rehab", group: "Wellness & Holistic" },
  { label: "Spa & Therapy Center", value: "spa", group: "Wellness & Holistic" },

  // Martial Arts & Combat
  { label: "MMA Club", value: "mma_club", group: "Martial Arts & Combat" },
  { label: "Boxing Gym", value: "boxing", group: "Martial Arts & Combat" },
  { label: "Muay Thai Center", value: "muay_thai", group: "Martial Arts & Combat" },
  { label: "Karate Dojo", value: "karate", group: "Martial Arts & Combat" },
  { label: "Taekwondo Academy", value: "taekwondo", group: "Martial Arts & Combat" },
  { label: "Jiu-Jitsu Academy (BJJ)", value: "bjj", group: "Martial Arts & Combat" },
  { label: "Kickboxing Studio", value: "kickboxing", group: "Martial Arts & Combat" },

  // Dance & Movement
  { label: "Dance Academy", value: "dance_academy", group: "Dance & Movement" },
  { label: "Zumba / Aerobics Studio", value: "zumba", group: "Dance & Movement" },

  // Sports & Hybrid
  { label: "Sports Academy / Club", value: "sports_academy", group: "Sports & Hybrid" },
  { label: "Swimming Academy", value: "swimming", group: "Sports & Hybrid" },
  { label: "Multi-Sport Facility", value: "multi_sport", group: "Sports & Hybrid" },
  { label: "Boutique Fitness Studio", value: "boutique_fitness", group: "Sports & Hybrid" },
  { label: "Corporate Fitness Center", value: "corporate_fitness", group: "Sports & Hybrid" },
  { label: "Outdoor Bootcamp / Training", value: "outdoor_bootcamp", group: "Sports & Hybrid" },

  // Kids & Family
  { label: "Kids Gymnastics / Athletics", value: "kids_fitness", group: "Kids & Family" },
  { label: "Family Fitness & Activity Center", value: "family_fitness", group: "Kids & Family" },

  // Virtual
  { label: "Online / Hybrid Fitness Program", value: "online_program", group: "Virtual & Hybrid" },
];

const YEARS_IN_BUSINESS_OPTIONS = [
  "Newly launched (0–3 months)",
  "3–11 months",
  "1 year",
  "2–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

const SERVICE_OPTIONS = [
  "Gym floor access",
  "Group classes",
  "Personal training",
  "CrossFit / functional training",
  "Martial arts / combat sports",
  "Yoga / Pilates",
  "Kids training",
  "Swimming pool",
  "Sauna / steam",
  "Café / juice bar",
  "Supplement store",
  "Merchandise store",
];

const REASON_OPTIONS = [
  "Currently not using any software",
  "Existing software is too complex",
  "Existing software is too expensive",
  "Billing / payments issues",
  "No automation or workflows",
  "No multi-branch support",
  "Weak reporting / analytics",
  "Want AI & smart intelligence",
];

const GOAL_OPTIONS = [
  "Increase member retention",
  "Automate daily operations",
  "Improve financial control",
  "Scale to more branches",
  "Implement access control",
  "Improve member experience",
  "Grow revenue",
  "Reduce manual work / spreadsheets",
];

// Business Onboarding Modal Component
function BusinessOnboardingModal({
  open,
  onOpenChange,
  selectedPlan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: string | null;
}) {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  const [data, setData] = useState<BusinessOnboardingData>({
    plan: selectedPlan ?? null,
    businessName: "",
    businessTypes: [],
    yearsInBusiness: "",
    country: "",
    state: "",
    cityArea: "",
    address: "",
    branches: "",
    memberCount: "",
    staffCount: "",
    services: [],
    currentSoftware: "",
    reasonsToSwitch: [],
    goals: [],
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactWhatsApp: "",
    notes: "",
  });

  // Sync selected plan when modal opens again
  React.useEffect(() => {
    if (open) {
      setData((prev) => ({ ...prev, plan: selectedPlan ?? prev.plan }));
      setStep(1);
    }
  }, [open, selectedPlan]);

  const toggleMultiSelect = (field: keyof BusinessOnboardingData, value: string) => {
    setData((prev) => {
      const current = prev[field] as string[];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const handleChange = (field: keyof BusinessOnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // TODO: send data to API / backend
    console.log("Business onboarding data:", data);

    onOpenChange(false);
  };

  const stepTitles = [
    "Business basics",
    "Location & scale",
    "Services & system",
    "Goals & contact",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-white border border-slate-200 shadow-xl" aria-describedby={undefined}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col"
        >
          {/* Header with progress */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <DialogTitle className="sr-only">
              Business onboarding - Step {step} of {totalSteps}: {stepTitles[step - 1]}
            </DialogTitle>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Business onboarding
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Step {step} of {totalSteps}: {stepTitles[step - 1]}
                </p>
              </div>
              {data.plan && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#327F74] px-3 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-medium text-white">
                    {data.plan}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative h-1 w-full rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-[#327F74]"
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-between mt-4">
              {stepTitles.map((title, index) => {
                const s = index + 1;
                const active = s === step;
                const completed = s < step;
                return (
                  <div
                    key={title}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                        active
                          ? "bg-[#327F74] text-white shadow-sm"
                          : completed
                          ? "bg-[#327F74] text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {completed ? <CheckCircle className="h-4 w-4" /> : s}
                    </div>
                    <span
                      className={`hidden sm:inline text-xs font-medium ${
                        active
                          ? "text-slate-900"
                          : completed
                          ? "text-[#327F74]"
                          : "text-slate-400"
                      }`}
                    >
                      {title}
                    </span>
                    {s < totalSteps && (
                      <div className="hidden lg:block h-px w-12 bg-slate-200 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 max-h-[460px] overflow-y-auto">

            <div className="space-y-5">
              {step === 1 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium text-slate-700">Business name</Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. EMMA Fitness Club"
                        value={data.businessName}
                        onChange={(e) =>
                          handleChange("businessName", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Years in business
                      </Label>
                      <select
                        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#327F74] focus:outline-none focus:ring-1 focus:ring-[#327F74]"
                        value={data.yearsInBusiness}
                        onChange={(e) =>
                          handleChange("yearsInBusiness", e.target.value)
                        }
                      >
                        <option value="">Select years in business</option>
                        {YEARS_IN_BUSINESS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Number of branches
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. 1, 3, 5+"
                        value={data.branches}
                        onChange={(e) =>
                          handleChange("branches", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Business type <span className="text-slate-400 font-normal">(select all that apply)</span>
                    </Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {BUSINESS_TYPE_OPTIONS.map((opt) => {
                        const active = data.businessTypes.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              toggleMultiSelect("businessTypes", opt.value)
                            }
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                              active
                                ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74] shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {active && (
                              <CheckCircle className="h-4 w-4 text-[#327F74]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Country</Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. United Arab Emirates"
                        value={data.country}
                        onChange={(e) =>
                          handleChange("country", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        State / Province / Emirate
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. Dubai"
                        value={data.state}
                        onChange={(e) =>
                          handleChange("state", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        City / Area
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. Al Qusais"
                        value={data.cityArea}
                        onChange={(e) =>
                          handleChange("cityArea", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Approx. member count
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. 150 active members"
                        value={data.memberCount}
                        onChange={(e) =>
                          handleChange("memberCount", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Approx. staff / trainers
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Eg. 6 trainers + 2 reception"
                        value={data.staffCount}
                        onChange={(e) =>
                          handleChange("staffCount", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">Full address</Label>
                    <Textarea
                      className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                      rows={2}
                      placeholder="Building, street, landmark, etc."
                      value={data.address}
                      onChange={(e) =>
                        handleChange("address", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Services & facilities <span className="text-slate-400 font-normal">(select all that apply)</span>
                    </Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {SERVICE_OPTIONS.map((service) => {
                        const active = data.services.includes(service);
                        return (
                          <button
                            key={service}
                            type="button"
                            onClick={() =>
                              toggleMultiSelect("services", service)
                            }
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                              active
                                ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74] shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span>{service}</span>
                            {active && (
                              <CheckCircle className="h-4 w-4 text-[#327F74]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Are you using any software today?
                    </Label>
                    <Input
                      className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                      placeholder="Eg. No / Yes, using XYZ"
                      value={data.currentSoftware}
                      onChange={(e) =>
                        handleChange("currentSoftware", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Why are you looking for GymBios? <span className="text-slate-400 font-normal">(select all that apply)</span>
                    </Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {REASON_OPTIONS.map((reason) => {
                        const active = data.reasonsToSwitch.includes(reason);
                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() =>
                              toggleMultiSelect("reasonsToSwitch", reason)
                            }
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                              active
                                ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74] shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span>{reason}</span>
                            {active && (
                              <CheckCircle className="h-4 w-4 text-[#327F74]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      What are your main goals with GymBios? <span className="text-slate-400 font-normal">(select all that apply)</span>
                    </Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {GOAL_OPTIONS.map((goal) => {
                        const active = data.goals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => toggleMultiSelect("goals", goal)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                              active
                                ? "border-[#327F74] bg-[#327F74]/5 text-[#327F74] shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span>{goal}</span>
                            {active && (
                              <CheckCircle className="h-4 w-4 text-[#327F74]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Contact person name
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Owner / Manager name"
                        value={data.contactName}
                        onChange={(e) =>
                          handleChange("contactName", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Contact email
                      </Label>
                      <Input
                        type="email"
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="name@business.com"
                        value={data.contactEmail}
                        onChange={(e) =>
                          handleChange("contactEmail", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        Phone number
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="Primary contact number"
                        value={data.contactPhone}
                        onChange={(e) =>
                          handleChange("contactPhone", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">
                        WhatsApp <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                        placeholder="For faster coordination"
                        value={data.contactWhatsApp}
                        onChange={(e) =>
                          handleChange("contactWhatsApp", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Anything else we should know?
                    </Label>
                    <Textarea
                      className="mt-1.5 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
                      rows={3}
                      placeholder="Eg. Planned new branches, special requirements, access control hardware, etc."
                      value={data.notes}
                      onChange={(e) =>
                        handleChange("notes", e.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={step === 1 ? () => onOpenChange(false) : handleBack}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                {step === 1 ? "Cancel" : "← Back"}
              </button>

              <div className="flex items-center gap-3">
                {step < totalSteps && (
                  <Button
                    type="button"
                    className="bg-[#327F74] hover:bg-[#2a6b62] text-white shadow-sm"
                    onClick={handleNext}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                {step === totalSteps && (
                  <Button
                    type="button"
                    className="bg-[#327F74] hover:bg-[#2a6b62] text-white shadow-sm"
                    onClick={handleSubmit}
                  >
                    Complete onboarding
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Privacy note */}
            <p className="mt-4 text-xs text-slate-500 text-center">
              Your information is kept private and used only for onboarding, configuration, and support.
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export function GymBiosPricing() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planName: string) => {
    setSelectedPlan(planName);
    setOnboardingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* PAGE CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 lg:mb-16"
        >
          <div className="flex flex-col items-center text-center gap-4">
            {/* Brand */}
            <div className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#327F74] text-white">
                <Dumbbell className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                GymBios • Business Operating System for Fitness
              </span>
            </div>

            {/* Title */}
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
                Simple, scalable pricing for{" "}
                <span className="text-[#327F74]">
                  modern fitness businesses
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                Choose the plan that matches your stage — from single-site gyms to enterprise
                fitness brands with multiple locations.
              </p>
            </div>

            {/* Trust Strip */}
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {[
                "No setup fees for most gyms",
                "Free guided onboarding",
                "Cancel or upgrade as you grow",
                "Secure & cloud-hosted",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs sm:text-sm text-slate-600 border border-slate-100 shadow-sm"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button 
                className="px-6 py-2.5 text-sm sm:text-base font-medium bg-[#327F74] hover:bg-[#2a6b62] text-white shadow-md"
                onClick={() => handlePlanSelect("Trial")}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="px-6 py-2.5 text-sm sm:text-base font-medium border-slate-300 text-slate-800 hover:bg-white/60"
                onClick={() => handlePlanSelect("Enterprise")}
              >
                Talk to Sales
              </Button>
            </div>
          </div>
        </motion.section>

        {/* PRICING GRID */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-14 lg:mb-16"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col h-full border border-slate-200/80 shadow-sm rounded-2xl bg-white ${
                  plan.highlight
                    ? "ring-2 ring-[#327F74]/60 shadow-md relative"
                    : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="flex items-center gap-1 rounded-full bg-[#327F74] text-white text-xs px-3 py-1 shadow-md">
                      <Star className="h-3 w-3" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      {plan.name}
                    </CardTitle>
                    {plan.highlight && (
                      <span className="text-xs font-medium text-[#327F74] bg-[#327F74]/5 px-2 py-1 rounded-full">
                        Growth-ready
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500">
                      Billed annually • 1 location
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-800">
                    {plan.tagline}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 justify-between pt-0 pb-5">
                  <ul className="space-y-2 mt-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <Button
                      onClick={() => handlePlanSelect(plan.name)}
                      className={`w-full text-sm font-medium py-2.5 ${
                        plan.highlight
                          ? "bg-[#327F74] hover:bg-[#2a6b62] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enterprise Card */}
          <Card className="mt-6 border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-2xl shadow-sm">
            <CardContent className="py-6 px-5 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1">
                  <Crown className="h-3.5 w-3.5" />
                  Enterprise • Custom rollouts
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  {enterprisePlan.name}
                </h2>
                <p className="text-sm text-slate-600">{enterprisePlan.tagline}</p>
                <p className="text-xs text-slate-500">{enterprisePlan.description}</p>
                <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                  {enterprisePlan.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <span className="text-sm font-medium text-slate-800">
                  {enterprisePlan.price}
                </span>
                <Button 
                  className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
                  onClick={() => handlePlanSelect("Enterprise")}
                >
                  {enterprisePlan.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* QUICK COMPARISON */}
        <section className="mb-14 lg:mb-16">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Quick comparison
            </h2>
            <span className="text-xs text-slate-500">
              A high-level view of what changes as you scale
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm">
            <div className="grid grid-cols-4 bg-slate-50/60 border-b border-slate-200">
              <div className="px-3 py-2 font-medium text-slate-500">Capability</div>
              <div className="px-3 py-2 font-semibold text-slate-900">Essentials</div>
              <div className="px-3 py-2 font-semibold text-slate-900">Standard</div>
              <div className="px-3 py-2 font-semibold text-slate-900">Professional</div>
            </div>
            {[
              {
                label: "Multi-branch & franchise control",
                values: ["—", "✓", "✓"],
              },
              {
                label: "Advanced BI & Intelligence",
                values: ["—", "Limited", "Full"],
              },
              {
                label: "Workforce & performance management",
                values: ["Basic", "Advanced", "Advanced + AI insights"],
              },
              {
                label: "Marketing & revenue growth tools",
                values: ["Basic campaigns", "Enhanced", "Full suite"],
              },
              {
                label: "Automation & workflows",
                values: ["Core workflows", "Extended", "Advanced automation"],
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-4 border-t border-slate-100"
              >
                <div className="px-3 py-2.5 text-slate-600">{row.label}</div>
                {row.values.map((val, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2.5 text-slate-800 text-xs sm:text-sm"
                  >
                    {val === "✓" ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Included</span>
                      </span>
                    ) : (
                      val
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE HIGHLIGHTS */}
        <section className="mb-14 lg:mb-16">
          <div className="mb-6 flex flex-col gap-2 text-left">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Built for real-world gym operations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
              GymBios is more than a membership system — it's a full business operating
              system for fitness brands, designed from the ground up for modern operators.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border border-slate-200/80 bg-white rounded-2xl shadow-sm h-full"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#327F74] text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ + CONTACT */}
        <section className="mb-10 lg:mb-12 grid gap-10 lg:grid-cols-[2fr,1.2fr]">
          {/* FAQ */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">
              Frequently asked questions
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              If you have more questions, our team is happy to walk you through the best fit
              for your gym.
            </p>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      <CheckCircle className="h-4 w-4 text-[#327F74]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {faq.question}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Talk to a GymBios specialist
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Not sure which plan fits you best? Share your current setup and growth goals —
              we'll recommend the right starting point.
            </p>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-slate-300 text-slate-800 text-sm"
              >
                <Phone className="h-4 w-4" />
                Call Sales: +971 525 135 865
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-slate-300 text-slate-800 text-sm"
              >
                <Mail className="h-4 w-4" />
                sales@gymbios.com
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-slate-300 text-slate-800 text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Talk to us on live chat
              </Button>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-3">
              <p className="text-[11px] text-slate-500">
                Average onboarding time for a single-location gym is 5–10 working days,
                including data migration and training.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="rounded-2xl bg-[#327F74] px-6 py-6 text-center text-white shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">
            Ready to make GymBios your gym's operating system?
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mb-4 max-w-xl mx-auto">
            Start with a plan that fits today — and upgrade as your business grows. Our team
            will support you at every stage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              className="bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium px-6"
              onClick={() => handlePlanSelect("Trial")}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-white/70 text-white hover:bg-white/10 text-sm font-medium px-6"
              onClick={() => handlePlanSelect("Enterprise")}
            >
              Book a Product Walkthrough
            </Button>
          </div>
        </section>
      </div>

      {/* Business Onboarding Full-Screen */}
      <BusinessOnboardingFullscreen
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}

export default GymBiosPricing;