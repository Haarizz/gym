import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Button } from "../components/ui/button";
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
  Clock,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Info,
  Loader2,
  AlertCircle,
  Search,
  Ban
} from 'lucide-react';
import { toast } from "sonner";
import { facilitiesService, FacilityApi, FacilityRequest } from '../utils/supabase/facilities-service';
import { MemberStatCards } from "../components/members/MemberStatCards";
import t from "../components/plans/plan-tabs.module.css";

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
  embedded?: boolean;
  /** Embedded only: element to render the summary cards into (e.g. above the parent's tabs) */
  summaryContainer?: HTMLElement | null;
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

export function Facilities({ onNavigate, embedded, summaryContainer }: FacilitiesProps) {
  const { currencyCode, currencySymbol } = useCurrency();
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

  const statusCounts = {
    all: facilities.length,
    active: activeFacilitiesCount,
    inactive: facilities.length - activeFacilitiesCount,
  };

  const summaryCards = (
    <MemberStatCards
      cards={[
        { key: 'all', label: 'Total Facilities', value: facilities.length, sub: 'All facilities', icon: Building2, tone: 'primary' },
        { key: 'active', label: 'Active', value: activeFacilitiesCount, sub: 'Open for bookings', icon: CheckCircle, tone: 'green' },
        { key: 'inactive', label: 'Inactive', value: statusCounts.inactive, sub: 'Hidden from bookings', icon: Ban, tone: 'red' },
        { key: 'bookings', label: 'Bookings This Month', value: totalBookings, sub: 'Across all facilities', icon: Calendar, tone: 'blue' },
        { key: 'capacity', label: 'Avg. Capacity', value: avgOccupancy, sub: 'People per facility', icon: Users, tone: 'purple' },
      ]}
      activeKey={statusFilter}
      onSelect={key => setStatusFilter(key === 'active' || key === 'inactive' ? key : 'all')}
    />
  );

  const facilityList = (
    <>
      <div className={t.panel}>
        <div className={t.panelHead}>
          <div>
            <div className={t.titleRow}>
              <span className={t.title}>Facilities</span>
              <span className={t.count}>{filteredFacilities.length}</span>
            </div>
            <p className={t.subtitle}>Courts, pools and rooms members can book, with their rates</p>
          </div>
          <div className={t.headActions}>
            <Button onClick={handleAddFacility} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Facility
            </Button>
          </div>
        </div>
        <div className={t.toolbar}>
          <div className={t.search}>
            <Search />
            <Input
              placeholder="Search facilities by name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={t.segmented} role="group" aria-label="Filter by status">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={t.segBtn}
                data-active={statusFilter === f}
                aria-pressed={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className={t.segCount}>{statusCounts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredFacilities.length === 0 ? (
        <div className={t.panel}>
          <div className={t.empty}>
            <div className={t.emptyIcon}><Building2 /></div>
            <p className={t.emptyTitle}>{facilities.length === 0 ? 'No facilities yet' : 'No facilities match'}</p>
            <p className={t.emptyText}>
              {facilities.length === 0
                ? 'Add a court, pool or studio so members can book it and you can sell access as an add-on.'
                : 'Try a different search or status filter.'}
            </p>
            {facilities.length === 0 && (
              <Button onClick={handleAddFacility} size="sm" className={`gap-2 ${t.emptyAction}`}>
                <Plus className="h-4 w-4" /> Add Facility
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={t.facilityGrid}>
          {filteredFacilities.map(facility => {
            const Icon = getIcon(facility.icon_name);
            const isActive = facility.status === 'Active';
            const rates = Object.entries(facility.rates);
            return (
              <div key={facility.id} className={t.facility} data-inactive={!isActive}>
                <div className={t.facilityTop}>
                  <div className={t.facilityIcon}><Icon /></div>
                  <div className={t.facilityMain}>
                    <p className={t.facilityName}>{facility.name}</p>
                    <p className={t.facilityId}>{facility.facility_id ?? `ID: ${facility.id}`}</p>
                  </div>
                  <div className={t.facilityToggle}>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleStatus(facility)}
                      aria-label={isActive ? `Deactivate ${facility.name}` : `Activate ${facility.name}`}
                    />
                    <span className={t.pill} data-tone={isActive ? 'green' : 'gray'}>{facility.status}</span>
                  </div>
                </div>

                <div className={t.facilityBody}>
                <div className={t.metrics}>
                  <div className={t.metric}>
                    <p className={t.metricLabel}><Users /> Capacity</p>
                    <p className={t.metricValue}>{facility.occupancy_limit} <span className={t.metricUnit}>people</span></p>
                  </div>
                  <div className={t.metric}>
                    <p className={t.metricLabel}><Calendar /> This month</p>
                    <p className={t.metricValue}>
                      {facility.bookings_this_month} <span className={t.metricUnit}>{facility.bookings_this_month === 1 ? 'booking' : 'bookings'}</span>
                    </p>
                  </div>
                </div>

                <div className={t.rates}>
                  <p className={t.sectionLabel}>Rates</p>
                  <div className={t.rateList}>
                    {rates.length === 0 ? (
                      <span className={t.rateType}>No rates set</span>
                    ) : rates.map(([rateType, rate]) => (
                      <span key={rateType} className={t.rate}>
                        <span className={t.rateType}>{rateType}</span>
                        <span className={t.rateValue}><CurrencyGlyph /> {rate}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {facility.description && <p className={t.description}>{facility.description}</p>}
                </div>

                <div className={t.facilityFoot}>
                  <Button variant="outline" size="sm" onClick={() => handleEditFacility(facility)} className="gap-2">
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <button
                    type="button"
                    className={`${t.iconBtn} ${t.iconBtnDanger}`}
                    title="Delete facility"
                    aria-label={`Delete ${facility.name}`}
                    onClick={() => handleDeleteFacility(facility.id, facility.name)}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const facilityDialog = (
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
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Rate ({currencySymbol}):</Label>
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
  );

  if (embedded) {
    return (
      <>
        {summaryContainer ? createPortal(summaryCards, summaryContainer) : summaryCards}
        {facilityList}
        {facilityDialog}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facilities Management</h1>
          <p className="text-gray-600 mt-1">Define and manage all physical facilities with rates and availability</p>
        </div>
        {summaryCards}
        {facilityList}
      </div>
      {facilityDialog}
    </div>
  );
}
