import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Building2,
  Activity,
  Snowflake,
  Target,
  Dumbbell,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  Clock,
  Calendar,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";

// Mock data for facilities
const mockFacilities = [
  {
    id: "FAC-001",
    name: "Basketball Court",
    icon: Activity,
    occupancyLimit: 10,
    rateTypes: ["Per Hour", "Per Half Day", "Per Full Day"],
    rates: {
      "Per Hour": 100,
      "Per Half Day": 400,
      "Per Full Day": 700
    },
    status: "Active",
    description: "Full-size indoor basketball court with professional flooring",
    bookingsThisMonth: 45
  },
  {
    id: "FAC-002",
    name: "Swimming Pool",
    icon: Snowflake,
    occupancyLimit: 20,
    rateTypes: ["Per Hour", "Per Month"],
    rates: {
      "Per Hour": 150,
      "Per Month": 2500
    },
    status: "Active",
    description: "Olympic-sized swimming pool with temperature control",
    bookingsThisMonth: 120
  },
  {
    id: "FAC-003",
    name: "Padel Court",
    icon: Target,
    occupancyLimit: 4,
    rateTypes: ["Per Hour"],
    rates: {
      "Per Hour": 200
    },
    status: "Active",
    description: "Professional padel court with high-quality glass walls",
    bookingsThisMonth: 78
  },
  {
    id: "FAC-004",
    name: "Football Ground",
    icon: Users,
    occupancyLimit: 22,
    rateTypes: ["Per Hour", "Per Half Day", "Per Full Day"],
    rates: {
      "Per Hour": 300,
      "Per Half Day": 1200,
      "Per Full Day": 2000
    },
    status: "Active",
    description: "Full-size artificial turf football ground with floodlights",
    bookingsThisMonth: 34
  },
  {
    id: "FAC-005",
    name: "Cricket Ground",
    icon: Trophy,
    occupancyLimit: 22,
    rateTypes: ["Per Hour", "Per Half Day"],
    rates: {
      "Per Hour": 250,
      "Per Half Day": 1000
    },
    status: "Inactive",
    description: "Cricket ground with practice nets (Currently under maintenance)",
    bookingsThisMonth: 0
  }
];

const rateTypeOptions = ["Per Hour", "Per Half Day", "Per Full Day", "Per Month"];

const facilityIcons = [
  { icon: Activity, label: "Basketball" },
  { icon: Snowflake, label: "Swimming" },
  { icon: Target, label: "Tennis/Padel" },
  { icon: Users, label: "Football" },
  { icon: Trophy, label: "Cricket" },
  { icon: Dumbbell, label: "Gym" },
  { icon: Activity, label: "Yoga" },
  { icon: Trophy, label: "Boxing" },
  { icon: Building2, label: "Other" }
];

interface FacilitiesProps {
  onNavigate?: (section: string) => void;
}

export function Facilities({ onNavigate }: FacilitiesProps) {
  const [facilities, setFacilities] = useState(mockFacilities);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    icon: Dumbbell,
    occupancyLimit: "",
    selectedRateTypes: [] as string[],
    rates: {} as Record<string, string>,
    status: "Active",
    description: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      icon: Dumbbell,
      occupancyLimit: "",
      selectedRateTypes: [],
      rates: {},
      status: "Active",
      description: ""
    });
  };

  const handleAddFacility = () => {
    setShowAddDialog(true);
    resetForm();
  };

  const handleEditFacility = (facility: any) => {
    setSelectedFacility(facility);
    setFormData({
      name: facility.name,
      icon: facility.icon,
      occupancyLimit: facility.occupancyLimit.toString(),
      selectedRateTypes: facility.rateTypes,
      rates: Object.fromEntries(
        Object.entries(facility.rates).map(([key, value]) => [key, value.toString()])
      ),
      status: facility.status,
      description: facility.description
    });
    setShowEditDialog(true);
  };

  const handleDeleteFacility = (facilityId: string) => {
    setFacilities(facilities.filter(f => f.id !== facilityId));
    toast.success("Facility Deleted", {
      description: "Facility has been removed from the system"
    });
  };

  const handleToggleRateType = (rateType: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedRateTypes.includes(rateType);
      const newSelectedTypes = isSelected
        ? prev.selectedRateTypes.filter(t => t !== rateType)
        : [...prev.selectedRateTypes, rateType];
      
      // Remove rate if deselecting
      if (isSelected) {
        const newRates = { ...prev.rates };
        delete newRates[rateType];
        return { ...prev, selectedRateTypes: newSelectedTypes, rates: newRates };
      }
      
      return { ...prev, selectedRateTypes: newSelectedTypes };
    });
  };

  const handleRateChange = (rateType: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        rates: { ...prev.rates, [rateType]: value }
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Facility name is required");
      return false;
    }
    if (!formData.occupancyLimit || parseInt(formData.occupancyLimit) <= 0) {
      toast.error("Valid occupancy limit is required");
      return false;
    }
    if (formData.selectedRateTypes.length === 0) {
      toast.error("Select at least one rate type");
      return false;
    }
    for (const rateType of formData.selectedRateTypes) {
      if (!formData.rates[rateType] || parseFloat(formData.rates[rateType]) <= 0) {
        toast.error(`Enter a valid rate for ${rateType}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveFacility = () => {
    if (!validateForm()) return;

    const facilityData = {
      id: selectedFacility?.id || `FAC-${String(facilities.length + 1).padStart(3, '0')}`,
      name: formData.name,
      icon: formData.icon,
      occupancyLimit: parseInt(formData.occupancyLimit),
      rateTypes: formData.selectedRateTypes,
      rates: Object.fromEntries(
        Object.entries(formData.rates).map(([key, value]) => [key, parseFloat(value)])
      ),
      status: formData.status,
      description: formData.description,
      bookingsThisMonth: selectedFacility?.bookingsThisMonth || 0
    };

    if (showEditDialog) {
      setFacilities(facilities.map(f => f.id === facilityData.id ? facilityData : f));
      toast.success("Facility Updated", {
        description: `${facilityData.name} has been updated successfully`
      });
    } else {
      setFacilities([...facilities, facilityData]);
      toast.success("Facility Added", {
        description: `${facilityData.name} has been added to your facilities`
      });
    }

    setShowAddDialog(false);
    setShowEditDialog(false);
    resetForm();
  };

  const handleToggleStatus = (facilityId: string) => {
    setFacilities(facilities.map(f => 
      f.id === facilityId 
        ? { ...f, status: f.status === "Active" ? "Inactive" : "Active" }
        : f
    ));
    const facility = facilities.find(f => f.id === facilityId);
    toast.success("Status Updated", {
      description: `${facility?.name} is now ${facility?.status === "Active" ? "Inactive" : "Active"}`
    });
  };

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || facility.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeFacilitiesCount = facilities.filter(f => f.status === "Active").length;
  const totalBookings = facilities.reduce((sum, f) => sum + f.bookingsThisMonth, 0);
  const avgOccupancy = Math.round(facilities.reduce((sum, f) => sum + f.occupancyLimit, 0) / facilities.length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Facilities Management</h1>
              <p className="text-gray-600 mt-1">
                Define and manage all physical facilities with rates and availability
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onNavigate && onNavigate("training-streams")}
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Training Streams
              </Button>
              <Button
                onClick={handleAddFacility}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Facility
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Total Facilities</CardTitle>
                <div className="bg-emerald-50 p-2 rounded-lg">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{facilities.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All facilities</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Active Facilities</CardTitle>
                <div className="bg-green-50 p-2 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{activeFacilitiesCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently available</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Bookings This Month</CardTitle>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{totalBookings}</div>
                <p className="text-xs text-muted-foreground mt-1">Monthly activity</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Avg. Occupancy Limit</CardTitle>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{avgOccupancy}</div>
                <p className="text-xs text-muted-foreground mt-1">Across facilities</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filters */}
          <Card className="mt-6 bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search facilities by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => setStatusFilter("all")}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "active" ? "default" : "outline"}
                    onClick={() => setStatusFilter("active")}
                    size="sm"
                    className={statusFilter === "active" ? "bg-primary hover:bg-primary/90 text-white" : ""}
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === "inactive" ? "default" : "outline"}
                    onClick={() => setStatusFilter("inactive")}
                    size="sm"
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="p-6">
        {filteredFacilities.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg mb-1">No Facilities Found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search" : "Get started by adding your first facility"}
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddFacility} style={{ backgroundColor: '#2B7A78' }} className="text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Facility
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((facility) => (
              <Card 
                key={facility.id} 
                className={`bg-white border-0 shadow-sm hover:shadow-lg transition-shadow ${facility.status === "Active" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = facility.icon;
                        return (
                          <div className="p-3 rounded-lg bg-slate-50">
                            <Icon className="h-6 w-6 text-slate-600" />
                          </div>
                        );
                      })()}
                      <div>
                        <CardTitle>{facility.name}</CardTitle>
                        <CardDescription>{facility.id}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={facility.status === "Active"}
                      onCheckedChange={() => handleToggleStatus(facility.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={facility.status === "Active" ? "default" : "secondary"}
                        className={facility.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {facility.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{facility.bookingsThisMonth} bookings</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Facility Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Occupancy Limit:
                        </span>
                        <span className="font-medium">{facility.occupancyLimit} people</span>
                      </div>

                      {facility.description && (
                        <div className="pt-2">
                          <p className="text-muted-foreground text-xs line-clamp-2">
                            {facility.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Rates */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Pricing
                      </p>
                      <div className="space-y-1">
                        {facility.rateTypes.map((rateType) => (
                          <div key={rateType} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{rateType}:</span>
                            <span className="font-medium">AED {facility.rates[rateType]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFacility(facility)}
                        className="flex-1 gap-2 shadow-sm hover:shadow-md transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFacility(facility.id)}
                        className="gap-2 shadow-sm hover:shadow-md transition-all text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Facility Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-6 w-6" style={{ color: '#2B7A78' }} />
              {showEditDialog ? "Edit Facility" : "Add New Facility"}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Update facility details and rates" : "Configure your new facility with rates and availability"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Facility Name & Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="facilityName">Facility Name *</Label>
                <Input
                  id="facilityName"
                  placeholder="e.g., Basketball Court, Swimming Pool"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="col-span-2">
                <Label>Select Icon</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mt-2">
                  {facilityIcons.map((icon) => {
                    const Icon = icon.icon;
                    return (
                      <button
                        key={icon.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: icon.icon })}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                          formData.icon === icon.icon
                            ? "border-[#2B7A78] bg-[#DFF5F4]"
                            : "border-gray-200 hover:border-[#2B7A78]"
                        }`}
                        title={icon.label}
                      >
                        <Icon className="h-5 w-5 text-gray-700" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator />

            {/* Occupancy Limit */}
            <div>
              <Label htmlFor="occupancy">Occupancy Limit (Max People) *</Label>
              <div className="relative mt-2">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="occupancy"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.occupancyLimit}
                  onChange={(e) => setFormData({ ...formData, occupancyLimit: e.target.value })}
                  className="pl-10"
                  min="1"
                />
              </div>
            </div>

            <Separator />

            {/* Rate Types & Rates */}
            <div>
              <Label className="text-base mb-3 block">Rate Configuration *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select applicable rate types and set pricing for each
              </p>

              <div className="space-y-3">
                {rateTypeOptions.map((rateType) => (
                  <div key={rateType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.selectedRateTypes.includes(rateType)}
                          onCheckedChange={() => handleToggleRateType(rateType)}
                        />
                        <Label className="cursor-pointer" onClick={() => handleToggleRateType(rateType)}>
                          {rateType}
                        </Label>
                      </div>
                      {formData.selectedRateTypes.includes(rateType) && (
                        <Clock className="h-4 w-4" style={{ color: '#2B7A78' }} />
                      )}
                    </div>

                    {formData.selectedRateTypes.includes(rateType) && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">
                          Rate (AED):
                        </Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formData.rates[rateType] || ""}
                          onChange={(e) => handleRateChange(rateType, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {formData.selectedRateTypes.length === 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Please select at least one rate type
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Status</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.status === "Active" 
                    ? "Facility is available for bookings and plans" 
                    : "Facility is hidden from bookings and plans"}
                </p>
              </div>
              <Switch
                checked={formData.status === "Active"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "Active" : "Inactive" })}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add facility guidelines, amenities, or special notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
              style={{ borderColor: '#E63946', color: '#E63946' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFacility}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {showEditDialog ? "Update Facility" : "Add Facility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



