import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { platformLeadService } from "../utils/supabase/platform-lead-service";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  X,
  Building2,
  MapPin,
  Settings,
  Target,
  CheckCircle,
  ArrowRight,
  Dumbbell,
} from "lucide-react";

// Business Onboarding Data Types
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

function SelectIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
        active ? "border-primary bg-primary" : "border-slate-200"
      }`}
    >
      {active && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15 }}
          viewBox="0 0 12 12"
          style={{ height: "0.625rem", width: "0.625rem" }}
          fill="none"
        >
          <path
            d="M2.5 6l2.5 2.5L9.5 3.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      )}
    </span>
  );
}

export function BusinessOnboardingFullscreen({
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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!data.businessName.trim()) {
      toast.error("Business name is required");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      await platformLeadService.submitLead({
        businessName: data.businessName,
        planInterest: data.plan || "Not specified",
        businessTypes: data.businessTypes,
        yearsInBusiness: data.yearsInBusiness,
        country: data.country,
        state: data.state,
        cityArea: data.cityArea,
        address: data.address,
        branches: data.branches,
        memberCount: data.memberCount,
        staffCount: data.staffCount,
        services: data.services,
        currentSoftware: data.currentSoftware,
        reasonsToSwitch: data.reasonsToSwitch,
        goals: data.goals,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        contactWhatsapp: data.contactWhatsApp,
        notes: data.notes,
      });
      toast.success("Thanks! We've received your details.", {
        description: "Our team will reach out shortly to get you onboarded.",
      });
      onOpenChange(false);
    } catch (error: any) {
      const status = error?.response?.status;
      const description = status === 429
        ? "Too many submissions from this device — please try again in a few minutes."
        : "Please check your connection and try again.";
      toast.error("Couldn't submit your details", { description });
    } finally {
      setSubmitting(false);
    }
  };

  const stepConfig = [
    {
      number: 1,
      title: "Business basics",
      description: "Tell us about your fitness business",
      icon: Building2,
    },
    {
      number: 2,
      title: "Location & scale",
      description: "Where you operate and team size",
      icon: MapPin,
    },
    {
      number: 3,
      title: "Services & system",
      description: "What you offer and current software",
      icon: Settings,
    },
    {
      number: 4,
      title: "Goals & contact",
      description: "Your objectives and how to reach you",
      icon: Target,
    },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-50 bg-white overflow-hidden"
          style={{ height: "calc(100svh / 0.9)" }}
        >
          <style>{`
            .onboarding-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(15, 23, 42, 0.15) transparent;
            }
            .onboarding-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .onboarding-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .onboarding-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(15, 23, 42, 0.15);
              border-radius: 9999px;
            }
            .onboarding-scroll::-webkit-scrollbar-thumb:hover {
              background-color: rgba(15, 23, 42, 0.28);
            }
            .ob-sidebar {
              background-color: #f8fafc;
            }
            .ob-track {
              background-color: #e2e8f0;
            }
            .ob-muted-icon {
              background-color: #e2e8f0;
              color: #94a3b8;
            }
            .ob-input {
              border-color: #cbd5e1;
              transition: border-color 150ms;
            }
            .ob-input:hover {
              border-color: #94a3b8;
            }
            .ob-input:focus {
              border-color: var(--primary);
              outline: none;
            }
            .ob-option {
              border-color: #e2e8f0;
              background-color: #ffffff;
              color: #334155;
              transition: border-color 150ms, background-color 150ms, box-shadow 150ms;
            }
            .ob-option:hover {
              border-color: #cbd5e1;
              background-color: #f8fafc;
              box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
            }
            .ob-close-btn {
              color: #94a3b8;
              transition: background-color 150ms, color 150ms;
            }
            .ob-close-btn:hover {
              background-color: #f1f5f9;
              color: #475569;
            }
            .ob-back-btn {
              color: #475569;
              transition: background-color 150ms, color 150ms;
            }
            .ob-back-btn:hover {
              background-color: #f1f5f9;
              color: #0f172a;
            }
            .ob-title {
              color: #0f172a;
            }
          `}</style>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
            className="flex"
            style={{ height: "calc(100svh / 0.9)" }}
          >
            {/* LEFT SIDEBAR - Stepper */}
            <div className="w-80 ob-sidebar border-r border-slate-200 flex flex-col">
              {/* Header */}
              <div className="px-6 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-800">GymBios</h1>
                    <p className="text-xs text-slate-500">Business onboarding</p>
                  </div>
                </div>

                {data.plan && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 shadow-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {data.plan} plan selected
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Stepper */}
              <div className="flex-1 px-6 py-8 overflow-y-auto onboarding-scroll">
                <div className="space-y-1">
                  {stepConfig.map((item, index) => {
                    const StepIcon = item.icon;
                    const active = step === item.number;
                    const completed = step > item.number;

                    return (
                      <div key={item.number} className="relative">
                        <motion.div
                          initial={false}
                          animate={{
                            backgroundColor: active
                              ? "rgba(43, 122, 120, 0.08)"
                              : "transparent",
                            boxShadow: active
                              ? "0 0 0 1px rgba(43, 122, 120, 0.15), 0 1px 2px rgba(15, 23, 42, 0.06)"
                              : "0 0 0 0 transparent",
                          }}
                          whileHover={
                            !active
                              ? { backgroundColor: "rgba(15, 23, 42, 0.03)" }
                              : undefined
                          }
                          transition={{ duration: 0.2 }}
                          className="rounded-xl p-4"
                        >
                          <div className="flex items-start gap-4">
                            {/* Step indicator */}
                            <motion.div
                              animate={{ scale: active ? 1.06 : 1 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                                active
                                  ? "bg-primary text-white shadow-md"
                                  : completed
                                  ? "bg-primary text-white"
                                  : "ob-muted-icon"
                              }`}
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {completed ? (
                                  <motion.span
                                    key="check"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <CheckCircle className="h-5 w-5" />
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key="icon"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <StepIcon className="h-5 w-5" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0" style={{ paddingTop: "0.125rem" }}>
                              <span
                                className={`text-xs font-medium tracking-wide transition-colors duration-300 ${
                                  active || completed
                                    ? "text-primary"
                                    : "text-slate-500"
                                }`}
                              >
                                STEP {item.number}
                              </span>
                              <h3
                                className={`font-medium mt-1 transition-colors duration-300 ${
                                  active
                                    ? "text-slate-800"
                                    : completed
                                    ? "text-slate-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.title}
                              </h3>
                              <p
                                className={`text-xs mt-1 leading-relaxed transition-colors duration-300 ${
                                  active
                                    ? "text-slate-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Connector line */}
                        {index < stepConfig.length - 1 && (
                          <div
                            className="overflow-hidden ob-track"
                            style={{ marginLeft: "2.25rem", width: "2px", height: "1.5rem" }}
                          >
                            <motion.div
                              className="bg-primary"
                              style={{ width: "2px" }}
                              initial={false}
                              animate={{ height: completed ? "100%" : "0%" }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>Progress</span>
                  <span className="font-medium text-slate-700">
                    {Math.round((step / totalSteps) * 100)}%
                  </span>
                </div>
                <div
                  className="w-full rounded-full ob-track overflow-hidden"
                  style={{ height: "0.375rem" }}
                >
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Top bar */}
              <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium tracking-wide text-primary">
                    STEP {step} OF {totalSteps}
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-800 mt-1">
                    {stepConfig[step - 1].title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {stepConfig[step - 1].description}
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg ob-close-btn"
                  aria-label="Close onboarding"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 onboarding-scroll">
                <div className="max-w-3xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {step === 1 && (
                        <>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="col-span-2">
                              <Label className="text-sm font-medium text-slate-700">
                                Business name
                              </Label>
                              <Input
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm ob-input"
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
                                className="mt-2 h-11 ob-input"
                                placeholder="Eg. 1, 3, 5+"
                                value={data.branches}
                                onChange={(e) =>
                                  handleChange("branches", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-700 mb-3 block">
                              Business type{" "}
                              <span className="text-slate-500 font-normal">
                                (select all that apply)
                              </span>
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {BUSINESS_TYPE_OPTIONS.map((opt) => {
                                const active = data.businessTypes.includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                      toggleMultiSelect("businessTypes", opt.value)
                                    }
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm text-left ${
                                      active
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "ob-option"
                                    }`}
                                  >
                                    <span className="leading-tight">{opt.label}</span>
                                    <SelectIndicator active={active} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                              <Label className="text-sm font-medium text-slate-700">
                                Country
                              </Label>
                              <Input
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
                                placeholder="Eg. 6 trainers + 2 reception"
                                value={data.staffCount}
                                onChange={(e) =>
                                  handleChange("staffCount", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-700">
                              Full address
                            </Label>
                            <Textarea
                              className="mt-2 ob-input resize-none"
                              rows={3}
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
                            <Label className="text-sm font-medium text-slate-700 mb-3 block">
                              Services & facilities{" "}
                              <span className="text-slate-500 font-normal">
                                (select all that apply)
                              </span>
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {SERVICE_OPTIONS.map((service) => {
                                const active = data.services.includes(service);
                                return (
                                  <button
                                    key={service}
                                    type="button"
                                    onClick={() =>
                                      toggleMultiSelect("services", service)
                                    }
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm text-left ${
                                      active
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "ob-option"
                                    }`}
                                  >
                                    <span className="leading-tight">{service}</span>
                                    <SelectIndicator active={active} />
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
                              className="mt-2 h-11 ob-input"
                              placeholder="Eg. No / Yes, using XYZ"
                              value={data.currentSoftware}
                              onChange={(e) =>
                                handleChange("currentSoftware", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-700 mb-3 block">
                              Why are you looking for GymBios?{" "}
                              <span className="text-slate-500 font-normal">
                                (select all that apply)
                              </span>
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {REASON_OPTIONS.map((reason) => {
                                const active = data.reasonsToSwitch.includes(reason);
                                return (
                                  <button
                                    key={reason}
                                    type="button"
                                    onClick={() =>
                                      toggleMultiSelect("reasonsToSwitch", reason)
                                    }
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm text-left ${
                                      active
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "ob-option"
                                    }`}
                                  >
                                    <span className="leading-tight">{reason}</span>
                                    <SelectIndicator active={active} />
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
                            <Label className="text-sm font-medium text-slate-700 mb-3 block">
                              What are your main goals with GymBios?{" "}
                              <span className="text-slate-500 font-normal">
                                (select all that apply)
                              </span>
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {GOAL_OPTIONS.map((goal) => {
                                const active = data.goals.includes(goal);
                                return (
                                  <button
                                    key={goal}
                                    type="button"
                                    onClick={() => toggleMultiSelect("goals", goal)}
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm text-left ${
                                      active
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "ob-option"
                                    }`}
                                  >
                                    <span className="leading-tight">{goal}</span>
                                    <SelectIndicator active={active} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                              <Label className="text-sm font-medium text-slate-700">
                                Contact person name
                              </Label>
                              <Input
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
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
                                className="mt-2 h-11 ob-input"
                                placeholder="Primary contact number"
                                value={data.contactPhone}
                                onChange={(e) =>
                                  handleChange("contactPhone", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-slate-700">
                                WhatsApp{" "}
                                <span className="text-slate-500 font-normal">
                                  (optional)
                                </span>
                              </Label>
                              <Input
                                className="mt-2 h-11 ob-input"
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
                              className="mt-2 ob-input resize-none"
                              rows={4}
                              placeholder="Eg. Planned new branches, special requirements, access control hardware, etc."
                              value={data.notes}
                              onChange={(e) =>
                                handleChange("notes", e.target.value)
                              }
                            />
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer with navigation */}
              <div
                className="px-8 py-6 border-t border-slate-200 backdrop-blur-sm"
                style={{
                  backgroundColor: "rgba(248, 250, 252, 0.8)",
                  boxShadow: "0 -4px 12px -8px rgba(15, 23, 42, 0.08)",
                }}
              >
                <div className="max-w-3xl flex items-center justify-between">
                  <button
                    type="button"
                    onClick={step === 1 ? () => onOpenChange(false) : handleBack}
                    className="text-sm font-medium px-4 py-2 rounded-lg ob-back-btn"
                  >
                    {step === 1 ? "← Exit onboarding" : "← Back"}
                  </button>

                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-500">
                      Your data is secure and private
                    </p>
                    {step < totalSteps && (
                      <Button
                        type="button"
                        className="bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all duration-200 px-6"
                        onClick={handleNext}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                    {step === totalSteps && (
                      <Button
                        type="button"
                        className="bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all duration-200 px-6"
                        onClick={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting ? "Submitting…" : "Complete onboarding"}
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
