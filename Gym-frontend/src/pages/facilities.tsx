import { useState, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
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
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from "sonner";
import { facilitiesService, FacilityApi, FacilityRequest } from '../utils/supabase/facilities-service';

const RATE_TYPE_OPTIONS = ["Per Hour", "Per Half Day", "Per Full Day", "Per Month"];

const FACILITY_ICONS = [
  { icon: Activity,  label: "Basketball" },
  { icon: Snowflake, label: "Swimming" },
  { icon: Target,    label: "Tennis/Padel" },
  { icon: Users,     label: "Football" },
  { icon: Trophy,    label: "Cricket" },
  { icon: Dumbbell,  label: "Gym" },
  { icon: Activity,  label: "Yoga" },
  { icon: Trophy,    label: "Boxing" },
  { icon: Building2, label: "Other" },
];

// Map icon_name string → Lucide component
const ICON_MAP: Record<string, React.ElementType> = {
  Basketball:    Activity,
  Swimming:      Snowflake,
  "Tennis/Padel": Target,
  Football:      Users,
  Cricket:       Trophy,
  Gym:           Dumbbell,
  Yoga:          Activity,
  Boxing:        Trophy,
  Other:         Building2,
};

const getIcon = (iconName: string | null): React.ElementType =>
  (iconName && ICON_MAP[iconName]) ? ICON_MAP[iconName] : Building2;

interface FacilitiesProps {
  onNavigate?: (section: string) => void;
}

const emptyForm = () => ({
  name: '',
  iconName: 'Other',
  occupancyLimit: '',
  selectedRateTypes: [] as string[],
  rates: {} as Record<string, string>,
  status: 'Active',
  description: '',
});

export function Facilities({ onNavigate }: FacilitiesProps) {
  const { currencyCode } = useCurrency();
  const [facilities, setFacilities] = useState<FacilityApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FacilityApi | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(emptyForm());

  const loadFacilities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await facilitiesService.getFacilities();
      setFacilities(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  const resetForm = () => setFormData(emptyForm());

  const handleAddFacility = () => {
    resetForm();
    setSelectedFacility(null);
    setShowAddDialog(true);
  };

  const handleEditFacility = (facility: FacilityApi) => {
    setSelectedFacility(facility);
    const rateTypes = Object.keys(facility.rates);
    setFormData({
      name: facility.name,
      iconName: facility.icon_name ?? 'Other',
      occupancyLimit: String(facility.occupancy_limit),
      selectedRateTypes: rateTypes,
      rates: Object.fromEntries(
        Object.entries(facility.rates).map(([k, v]) => [k, String(v)])
      ),
      status: facility.status,
      description: facility.description ?? '',
    });
    setShowEditDialog(true);
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await facilitiesService.deleteFacility(id);
      setFacilities(prev => prev.filter(f => f.id !== id));
      toast.success('Facility Deleted', { description: `${name} has been removed` });
    } catch (e: any) {
      toast.error('Delete Failed', { description: e.message });
    }
  };

  const handleToggleStatus = async (facility: FacilityApi) => {
    try {
      const updated = await facilitiesService.toggleStatus(facility.id);
      setFacilities(prev => prev.map(f => f.id === updated.id ? updated : f));
      toast.success('Status Updated', {
        description: `${updated.name} is now ${updated.status}`
      });
    } catch (e: any) {
      toast.error('Failed to update status', { description: e.message });
    }
  };

  const handleToggleRateType = (rateType: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedRateTypes.includes(rateType);
      if (isSelected) {
        const newRates = { ...prev.rates };
        delete newRates[rateType];
        return { ...prev, selectedRateTypes: prev.selectedRateTypes.filter(t => t !== rateType), rates: newRates };
      }
      return { ...prev, selectedRateTypes: [...prev.selectedRateTypes, rateType] };
    });
  };

  const handleRateChange = (rateType: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, rates: { ...prev.rates, [rateType]: value } }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) { toast.error('Facility name is required'); return false; }
    if (!formData.occupancyLimit || parseInt(formData.occupancyLimit) <= 0) { toast.error('Valid occupancy limit is required'); return false; }
    if (formData.selectedRateTypes.length === 0) { toast.error('Select at least one rate type'); return false; }
    for (const rt of formData.selectedRateTypes) {
      if (!formData.rates[rt] || parseFloat(formData.rates[rt]) <= 0) {
        toast.error(`Enter a valid rate for ${rt}`); return false;
      }
    }
    return true;
  };

  const handleSaveFacility = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload: FacilityRequest = {
        name: formData.name,
        occupancy_limit: parseInt(formData.occupancyLimit),
        status: formData.status,
        description: formData.description,
        icon_name: formData.iconName,
        rates: Object.fromEntries(
          formData.selectedRateTypes.map(rt => [rt, parseFloat(formData.rates[rt])])
        ),
      };

      if (showEditDialog && selectedFacility) {
        const updated = await facilitiesService.updateFacility(selectedFacility.id, payload);
        setFacilities(prev => prev.map(f => f.id === updated.id ? updated : f));
        toast.success('Facility Updated', { description: `${updated.name} updated successfully` });
      } else {
        const created = await facilitiesService.createFacility(payload);
        setFacilities(prev => [...prev, created]);
        toast.success('Facility Added', { description: `${created.name} added successfully` });
      }

      setShowAddDialog(false);
      setShowEditDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error('Save Failed', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    resetForm();
  };

  // Derived stats
  const activeFacilitiesCount = facilities.filter(f => f.status === 'Active').length;
  const totalBookings = facilities.reduce((sum, f) => sum + f.bookings_this_month, 0);
  const avgOccupancy = facilities.length > 0
    ? Math.round(facilities.reduce((sum, f) => sum + f.occupancy_limit, 0) / facilities.length)
    : 0;

  const filteredFacilities = facilities.filter(f => {
    const matchSearch = !searchTerm
      || f.name.toLowerCase().includes(searchTerm.toLowerCase())
      || (f.facility_id ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={loadFacilities}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Facilities Management</h1>
              <p className="text-gray-600 mt-1">Define and manage all physical facilities with rates and availability</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onNavigate && onNavigate('training-streams')}
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
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  {(['all', 'active', 'inactive'] as const).map(f => (
                    <Button
                      key={f}
                      variant={statusFilter === f ? 'default' : 'outline'}
                      onClick={() => setStatusFilter(f)}
                      size="sm"
                      className={statusFilter === f ? 'bg-primary hover:bg-primary/90 text-white' : ''}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
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
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg mb-1">No Facilities Found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first facility'}
              </p>
              {!searchTerm && (
                <Button onClick={handleAddFacility} className="bg-primary text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Facility
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map(facility => {
              const Icon = getIcon(facility.icon_name);
              return (
                <Card
                  key={facility.id}
                  className={`bg-white border-0 shadow-sm hover:shadow-lg transition-shadow ${
                    facility.status === 'Active' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-slate-50">
                          <Icon className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle>{facility.name}</CardTitle>
                          <CardDescription>{facility.facility_id ?? `ID: ${facility.id}`}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={facility.status === 'Active'}
                        onCheckedChange={() => handleToggleStatus(facility)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className={facility.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {facility.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{facility.bookings_this_month} bookings</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" /> Occupancy Limit:
                          </span>
                          <span className="font-medium">{facility.occupancy_limit} people</span>
                        </div>
                        {facility.description && (
                          <p className="text-muted-foreground text-xs line-clamp-2 pt-1">{facility.description}</p>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" /> Pricing
                        </p>
                        <div className="space-y-1">
                          {Object.entries(facility.rates).map(([rateType, rate]) => (
                            <div key={rateType} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{rateType}:</span>
                              <span className="font-medium"><CurrencyGlyph /> {rate}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFacility(facility)}
                          className="flex-1 gap-2 shadow-sm hover:shadow-md transition-all"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFacility(facility.id, facility.name)}
                          className="gap-2 shadow-sm hover:shadow-md transition-all text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {showEditDialog ? 'Edit Facility' : 'Add New Facility'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog ? 'Update facility details and rates' : 'Configure your new facility with rates and availability'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="facilityName">Facility Name *</Label>
              <Input
                id="facilityName"
                placeholder="e.g., Basketball Court, Swimming Pool"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="mt-2"
              />
            </div>

            {/* Icon */}
            <div>
              <Label>Select Icon</Label>
              <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 mt-2">
                {FACILITY_ICONS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      title={item.label}
                      onClick={() => setFormData(f => ({ ...f, iconName: item.label }))}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                        formData.iconName === item.label
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      <Icon className="h-5 w-5 text-gray-700" />
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Occupancy */}
            <div>
              <Label htmlFor="occupancy">Occupancy Limit (Max People) *</Label>
              <div className="relative mt-2">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="occupancy"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.occupancyLimit}
                  onChange={e => setFormData(f => ({ ...f, occupancyLimit: e.target.value }))}
                  className="pl-10"
                  min="1"
                />
              </div>
            </div>

            <Separator />

            {/* Rate Configuration */}
            <div>
              <Label className="text-base mb-1 block">Rate Configuration *</Label>
              <p className="text-sm text-muted-foreground mb-3">Select applicable rate types and set pricing for each</p>
              <div className="space-y-3">
                {RATE_TYPE_OPTIONS.map(rateType => (
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
                        <Clock className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    {formData.selectedRateTypes.includes(rateType) && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Rate ({currencyCode}):</Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formData.rates[rateType] || ''}
                          onChange={e => handleRateChange(rateType, e.target.value)}
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
                    <Info className="h-4 w-4" /> Please select at least one rate type
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
                  {formData.status === 'Active'
                    ? 'Facility is available for bookings'
                    : 'Facility is hidden from bookings'}
                </p>
              </div>
              <Switch
                checked={formData.status === 'Active'}
                onCheckedChange={checked => setFormData(f => ({ ...f, status: checked ? 'Active' : 'Inactive' }))}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add facility guidelines, amenities, or special notes..."
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={closeDialog} className="border-red-300 text-red-600 hover:bg-red-50">
              Cancel
            </Button>
            <Button onClick={handleSaveFacility} disabled={saving} className="bg-primary text-white gap-2">
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle className="h-4 w-4" />}
              {showEditDialog ? 'Update Facility' : 'Add Facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
