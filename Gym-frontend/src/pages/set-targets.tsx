import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { staffService, Staff, StaffTarget } from '../utils/supabase/staff-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Target,
  Plus,
  X,
  Calendar as CalendarIcon,
  Users,
  Building2,
  DollarSign,
  CheckCircle,
  ArrowLeft,
  Save,
  RotateCcw,
  TrendingUp
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { format } from "date-fns";

interface UnitTarget {
  id: string;
  service: string;
  targetUnits: number;
}

interface TargetFormData {
  scope: "individual" | "institution";
  staffMember: string;
  timeframe: "monthly" | "quarterly" | "yearly" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  revenueTarget: number;
  unitTargets: UnitTarget[];
}

// Static services list (could be fetched from API in the future)
const services = [
  { id: "karate", name: "Karate", category: "Martial Arts" },
  { id: "martial-arts", name: "Martial Arts", category: "Martial Arts" },
  { id: "yoga", name: "Yoga", category: "Wellness" },
  { id: "swimming", name: "Swimming", category: "Aquatic" },
  { id: "mma", name: "MMA", category: "Martial Arts" },
  { id: "hiit", name: "HIIT", category: "Fitness" },
  { id: "personal-training", name: "Personal Training", category: "Training" },
  { id: "group-fitness", name: "Group Fitness", category: "Fitness" },
  { id: "membership-basic", name: "Basic Membership", category: "Membership" },
  { id: "membership-premium", name: "Premium Membership", category: "Membership" },
  { id: "membership-vip", name: "VIP Membership", category: "Membership" },
  { id: "protein-shake", name: "Protein Shake", category: "POS Product" },
  { id: "energy-drink", name: "Energy Drink", category: "POS Product" },
  { id: "gym-gear", name: "Gym Gear", category: "POS Product" }
];

interface SetTargetsProps {
  onNavigate: (section: string) => void;
}

export function SetTargets({ onNavigate }: SetTargetsProps) {
  const location = useLocation();
  const preselectedStaffId: string | undefined = (location.state as any)?.staffId;

  const [formData, setFormData] = useState<TargetFormData>({
    scope: "individual",
    staffMember: preselectedStaffId ?? "",
    timeframe: "monthly",
    revenueTarget: 0,
    unitTargets: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTargets, setCurrentTargets] = useState<StaffTarget[]>([]);

  useEffect(() => {
    staffService.getStaff({}, 1, 100).then(res => setStaffList(res.items)).catch(console.error);
  }, []);

  // Apply preselected staff once staff list is loaded
  useEffect(() => {
    if (preselectedStaffId && staffList.length > 0) {
      setFormData(prev => ({ ...prev, staffMember: preselectedStaffId, scope: "individual" }));
    }
  }, [staffList, preselectedStaffId]);

  // Fetch current targets whenever selected staff changes
  useEffect(() => {
    if (formData.staffMember && formData.scope === "individual") {
      const selectedStaff = staffList.find(s => s.id === formData.staffMember);
      staffService.getTargets().then(all => {
        const filtered = all.filter(t =>
          t.staff_db_id === formData.staffMember ||
          (selectedStaff && t.staff_name === selectedStaff.name)
        );
        setCurrentTargets(filtered);
      }).catch(console.error);
    } else if (formData.scope === "institution") {
      staffService.getTargets().then(all => {
        setCurrentTargets(all.filter(t => t.scope === "institution"));
      }).catch(console.error);
    } else {
      setCurrentTargets([]);
    }
  }, [formData.staffMember, formData.scope, staffList]);

  const handleScopeChange = (value: "individual" | "institution") => {
    setFormData(prev => ({
      ...prev,
      scope: value,
      staffMember: value === "institution" ? "" : prev.staffMember
    }));
  };

  const handleTimeframeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      timeframe: value as TargetFormData["timeframe"],
      customStartDate: undefined,
      customEndDate: undefined
    }));
  };

  const addUnitTarget = () => {
    const newTarget: UnitTarget = {
      id: Date.now().toString(),
      service: "",
      targetUnits: 0
    };
    setFormData(prev => ({
      ...prev,
      unitTargets: [...prev.unitTargets, newTarget]
    }));
  };

  const removeUnitTarget = (id: string) => {
    setFormData(prev => ({
      ...prev,
      unitTargets: prev.unitTargets.filter(target => target.id !== id)
    }));
  };

  const updateUnitTarget = (id: string, field: keyof UnitTarget, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      unitTargets: prev.unitTargets.map(target =>
        target.id === id ? { ...target, [field]: value } : target
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.scope === "individual" && !formData.staffMember) {
      newErrors.staffMember = "Please select a staff member";
    }

    if (formData.revenueTarget <= 0) {
      newErrors.revenueTarget = "Revenue target must be greater than 0";
    }

    if (formData.timeframe === "custom") {
      if (!formData.customStartDate) {
        newErrors.customStartDate = "Please select start date";
      }
      if (!formData.customEndDate) {
        newErrors.customEndDate = "Please select end date";
      }
      if (formData.customStartDate && formData.customEndDate && 
          formData.customStartDate >= formData.customEndDate) {
        newErrors.customEndDate = "End date must be after start date";
      }
    }

    // Validate unit targets
    formData.unitTargets.forEach((target, index) => {
      if (!target.service) {
        newErrors[`unitTarget_${index}_service`] = "Please select a service";
      }
      if (target.targetUnits <= 0) {
        newErrors[`unitTarget_${index}_units`] = "Target units must be greater than 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const now = new Date();
      const payload: any = {
        scope: formData.scope,
        timeframe: formData.timeframe,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        revenue_target: formData.revenueTarget,
        unit_targets_json: JSON.stringify(formData.unitTargets.map(u => ({
          service: u.service,
          target_units: u.targetUnits,
          achieved_units: 0
        }))),
      };
      if (formData.scope === "individual" && formData.staffMember) {
        payload.staff_db_id = Number(formData.staffMember);
      }
      if (formData.timeframe === "custom" && formData.customStartDate) {
        payload.start_date = formData.customStartDate.toISOString().split('T')[0];
        payload.end_date = formData.customEndDate?.toISOString().split('T')[0];
      }
      await staffService.createTarget(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save target', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onNavigate("staffs-trainers");
  };

  const getTimeframePeriod = () => {
    switch (formData.timeframe) {
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "yearly": return "Yearly";
      case "custom": 
        if (formData.customStartDate && formData.customEndDate) {
          return `${format(formData.customStartDate, "MMM dd")} - ${format(formData.customEndDate, "MMM dd, yyyy")}`;
        }
        return "Custom Range";
      default: return "";
    }
  };

  const selectedStaff = staffList.find(staff => staff.id === formData.staffMember);

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Set Targets</h1>
            </div>
            <p className="text-muted-foreground">
              Assign revenue and unit-based targets for staff or institution-wide goals.
            </p>
          </div>

          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Select Scope */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Scope
              </CardTitle>
              <CardDescription>Choose whether to set targets for individual staff or institution-wide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.scope}
                onValueChange={handleScopeChange}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="cursor-pointer">Individual Staff</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="institution" id="institution" />
                  <Label htmlFor="institution" className="cursor-pointer">Institution-wide</Label>
                </div>
              </RadioGroup>

              {formData.scope === "individual" && (
                <div className="space-y-2">
                  <Label>Select Staff Member</Label>
                  <Select value={formData.staffMember} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, staffMember: value }))
                  }>
                    <SelectTrigger className={cn(errors.staffMember && "border-destructive")}>
                      <SelectValue placeholder="Choose a staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{staff.name}</span>
                            {staff.role && (
                              <span className="text-xs text-muted-foreground">({staff.role})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.staffMember && (
                    <p className="text-sm text-destructive">{errors.staffMember}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Timeframe */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                Timeframe
              </CardTitle>
              <CardDescription>Select the period for this target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={formData.timeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {formData.timeframe === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.customStartDate && "text-muted-foreground",
                            errors.customStartDate && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.customStartDate ? format(formData.customStartDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.customStartDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, customStartDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.customStartDate && (
                      <p className="text-sm text-destructive">{errors.customStartDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.customEndDate && "text-muted-foreground",
                            errors.customEndDate && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.customEndDate ? format(formData.customEndDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.customEndDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, customEndDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.customEndDate && (
                      <p className="text-sm text-destructive">{errors.customEndDate}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Revenue Target */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-primary" />
                Revenue Target
              </CardTitle>
              <CardDescription>Set the revenue target amount in AED</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Target Amount (AED)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={formData.revenueTarget || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    revenueTarget: parseFloat(e.target.value) || 0 
                  }))}
                  className={cn(errors.revenueTarget && "border-destructive")}
                />
                {errors.revenueTarget && (
                  <p className="text-sm text-destructive">{errors.revenueTarget}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Unit Targets */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                Unit Targets
              </CardTitle>
              <CardDescription>Set specific unit targets for services and products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.unitTargets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No unit targets set yet.</p>
                  <p className="text-sm">Click "Add Service/Product Target" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.unitTargets.map((target, index) => (
                    <div key={target.id} className="flex items-center space-x-3 p-4 border border-primary/10 shadow-md hover:shadow-lg transition-shadow rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Service/Product</Label>
                          <Select
                            value={target.service}
                            onValueChange={(value) => updateUnitTarget(target.id, "service", value)}
                          >
                            <SelectTrigger className={cn(
                              "h-8",
                              errors[`unitTarget_${index}_service`] && "border-destructive"
                            )}>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  <div className="flex flex-col">
                                    <span>{service.name}</span>
                                    <span className="text-xs text-muted-foreground">{service.category}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors[`unitTarget_${index}_service`] && (
                            <p className="text-xs text-destructive">{errors[`unitTarget_${index}_service`]}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Target Units</Label>
                          <Input
                            type="number"
                            placeholder="Units"
                            value={target.targetUnits || ""}
                            onChange={(e) => updateUnitTarget(target.id, "targetUnits", parseInt(e.target.value) || 0)}
                            className={cn(
                              "h-8",
                              errors[`unitTarget_${index}_units`] && "border-destructive"
                            )}
                          />
                          {errors[`unitTarget_${index}_units`] && (
                            <p className="text-xs text-destructive">{errors[`unitTarget_${index}_units`]}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUnitTarget(target.id)}
                        className="text-destructive hover:text-destructive p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={addUnitTarget}
                className="w-full text-primary border-primary/20 hover:bg-primary/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service/Product Target
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section 5: Summary Preview - Right Side */}
        <div className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow bg-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                Preview
              </CardTitle>
              <CardDescription>Summary of the target configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scope Summary */}
              <div>
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <div className="flex items-center space-x-2 mt-1">
                  {formData.scope === "individual" ? (
                    <Users className="h-4 w-4 text-primary" />
                  ) : (
                    <Building2 className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium">
                    {formData.scope === "individual"
                      ? (selectedStaff ? selectedStaff.name : "No staff selected")
                      : "Institution-wide"
                    }
                  </span>
                </div>
                {formData.scope === "individual" && selectedStaff && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedStaff.role}
                  </p>
                )}
              </div>

              <Separator />

              {/* Timeframe Summary */}
              <div>
                <Label className="text-xs text-muted-foreground">Period</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{getTimeframePeriod()}</span>
                </div>
              </div>

              <Separator />

              {/* Revenue Target Summary */}
              <div>
                <Label className="text-xs text-muted-foreground">Revenue Target</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-medium text-lg">
                    AED {formData.revenueTarget.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Unit Targets Summary */}
              {formData.unitTargets.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Unit Targets</Label>
                    <div className="space-y-2">
                      {formData.unitTargets.map((target) => {
                        const service = services.find(s => s.id === target.service);
                        return (
                          <div key={target.id} className="flex justify-between items-center">
                            <span className="text-sm">
                              {service ? service.name : "Unknown Service"}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {target.targetUnits} units
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Current Targets */}
          {currentTargets.length > 0 && (
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Current Targets
                </CardTitle>
                <CardDescription>Existing targets for the selected scope</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentTargets.map(t => {
                  const pct = Math.min(100, Math.round(t.percentage || 0));
                  const period = t.timeframe === 'monthly' && t.year && t.month
                    ? `${new Date(t.year, t.month - 1).toLocaleString('default', { month: 'short' })} ${t.year}`
                    : t.timeframe === 'yearly' ? String(t.year)
                    : t.start_date && t.end_date
                      ? `${t.start_date} – ${t.end_date}`
                      : t.timeframe;
                  return (
                    <div key={t.id} className="p-3 rounded-lg border border-primary/10 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{period}</span>
                        <Badge variant={pct >= 100 ? 'default' : pct >= 50 ? 'secondary' : 'outline'} className="text-xs">
                          {pct}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Target: AED {(t.revenue_target || 0).toLocaleString()}</span>
                        <span>Achieved: AED {(t.revenue_achieved || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary' : 'bg-orange-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Section 6: Action Buttons */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-3">
                {saveSuccess && (
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Target saved successfully!</span>
                  </div>
                )}
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={isSaving || !formData.revenueTarget || (formData.scope === "individual" && !formData.staffMember)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Target'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Card */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow bg-muted/20">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">Target Integration</p>
                    <p className="text-muted-foreground text-xs">
                      Targets will appear in analytics dashboards and commission calculations.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Progress Tracking</p>
                    <p className="text-muted-foreground text-xs">
                      Real-time progress updates will be available in staff performance reports.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

