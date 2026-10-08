import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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

  const handleSubmit = () => {
    // TODO: send data to API / backend
    console.log("Business onboarding data:", data);
    onOpenChange(false);
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-white"
        >
          <div className="h-screen flex">
            {/* LEFT SIDEBAR - Stepper */}
            <div className="w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col">
              {/* Header */}
              <div className="px-6 py-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#327F74] text-white">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-900">GymBios</h1>
                    <p className="text-xs text-slate-500">Business onboarding</p>
                  </div>
                </div>

                {data.plan && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#327F74] px-3 py-2">
                    <CheckCircle className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {data.plan} plan selected
                    </span>
                  </div>
                )}
              </div>

              {/* Stepper */}
              <div className="flex-1 px-6 py-8 overflow-y-auto">
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
                              ? "rgba(50, 127, 116, 0.1)"
                              : "transparent",
                          }}
                          transition={{ duration: 0.2 }}
                          className={`rounded-xl p-4 cursor-pointer transition-all ${
                            active ? "shadow-sm" : ""
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Step indicator */}
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                                active
                                  ? "bg-[#327F74] text-white shadow-md"
                                  : completed
                                  ? "bg-[#327F74] text-white"
                                  : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              {completed ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <StepIcon className="h-5 w-5" />
                              )}
                            </div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-medium ${
                                    active || completed
                                      ? "text-[#327F74]"
                                      : "text-slate-400"
                                  }`}
                                >
                                  Step {item.number}
                                </span>
                              </div>
                              <h3
                                className={`font-medium mt-1 ${
                                  active
                                    ? "text-slate-900"
                                    : completed
                                    ? "text-slate-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.title}
                              </h3>
                              <p
                                className={`text-xs mt-0.5 ${
                                  active
                                    ? "text-slate-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Connector line */}
                        {index < stepConfig.length - 1 && (
                          <div className="ml-9 h-6 w-0.5 bg-slate-200" />
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
                  <span className="font-medium">
                    {Math.round((step / totalSteps) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#327F74]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Top bar */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {stepConfig[step - 1].title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {stepConfig[step - 1].description}
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-3xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {step === 1 && (
                        <>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Label className="text-sm font-medium text-slate-700">
                                Business name
                              </Label>
                              <Input
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#327F74] focus:outline-none focus:ring-1 focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                              <span className="text-slate-400 font-normal">
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
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
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
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <Label className="text-sm font-medium text-slate-700">
                                Country
                              </Label>
                              <Input
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                              className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                              <span className="text-slate-400 font-normal">
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
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
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
                              className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                              <span className="text-slate-400 font-normal">
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
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
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
                            <Label className="text-sm font-medium text-slate-700 mb-3 block">
                              What are your main goals with GymBios?{" "}
                              <span className="text-slate-400 font-normal">
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
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
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

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <Label className="text-sm font-medium text-slate-700">
                                Contact person name
                              </Label>
                              <Input
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                                <span className="text-slate-400 font-normal">
                                  (optional)
                                </span>
                              </Label>
                              <Input
                                className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
                              className="mt-2 border-slate-300 focus:border-[#327F74] focus:ring-[#327F74]"
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
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50">
                <div className="max-w-3xl flex items-center justify-between">
                  <button
                    type="button"
                    onClick={step === 1 ? () => onOpenChange(false) : handleBack}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
                  >
                    {step === 1 ? "← Exit onboarding" : "← Back"}
                  </button>

                  <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-500">
                      Your data is secure and private
                    </p>
                    {step < totalSteps && (
                      <Button
                        type="button"
                        className="bg-[#327F74] hover:bg-[#2a6b62] text-white shadow-sm px-6"
                        onClick={handleNext}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                    {step === totalSteps && (
                      <Button
                        type="button"
                        className="bg-[#327F74] hover:bg-[#2a6b62] text-white shadow-sm px-6"
                        onClick={handleSubmit}
                      >
                        Complete onboarding
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
