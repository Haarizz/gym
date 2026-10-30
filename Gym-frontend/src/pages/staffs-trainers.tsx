import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { toast } from 'sonner';
import { staffService, Staff, CommissionRule, StaffCertification, StaffListPerformance } from '../utils/supabase/staff-service';
import { rolesService, Role, AssignableRole } from '../utils/supabase/roles-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Progress } from "../components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  Edit,
  Calendar as CalendarIcon,
  Target,
  DollarSign,
  Users,
  Award,
  Clock,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  X,
  Star,
  MessageSquare,
  FileText,
  Camera,
  UserCheck,
  UserX,
  Activity,
  BarChart3,
  PieChart,
  Calendar as CalendarDays,
  Banknote,
  Crown,
  Zap,
  Shield,
  Dumbbell,
  Home,
  Building,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  Gauge
} from 'lucide-react';
import { PermissionGate, hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { useGlobalSearchPrefill } from "../components/global-search/use-global-search";
import { EmployeeForm } from "../components/workforce/EmployeeForm";
import { StaffRatingsPanel } from "../components/staff/staff-ratings-panel";


interface StaffsTrainersProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

/** Money for the list: whole numbers stay whole, otherwise two decimals. */
const formatMoney = (value?: number | null) =>
  Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// ── POS commission inputs (Target & Commission Settings) ───────────────────
/** A role's POS commission: % of each completed POS sale and/or a fixed amount per sale. */
function PosCommissionFields({ percent, perSale, onChange }: {
  percent: number;
  perSale: number;
  onChange: (pos: { posCommission: number; posCommissionPerSale: number }) => void;
}) {
  const clamp = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="space-y-2 rounded-md bg-muted/30 p-3">
      <Label className="text-xs font-semibold text-muted-foreground">POS Sales</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">POS Commission (%)</Label>
          <Input type="number" min="0" step="0.1" value={percent} className="h-8 text-sm"
            onChange={e => onChange({ posCommission: clamp(e.target.value), posCommissionPerSale: perSale })}
          />
          <p className="text-xs text-muted-foreground">Of each POS sale (after refunds)</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fixed per Sale (<CurrencyGlyph />)</Label>
          <Input type="number" min="0" step="0.5" value={perSale} className="h-8 text-sm"
            onChange={e => onChange({ posCommission: percent, posCommissionPerSale: clamp(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Added for every completed sale</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Credited to the cashier who rang up the sale. Leave both at 0 for no POS commission.</p>
    </div>
  );
}

export function StaffsTrainers({ onNavigate }: StaffsTrainersProps = {}) {
  const { currencyCode, currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('all-staff');
  const [searchQuery, setSearchQuery] = useState('');
  useGlobalSearchPrefill(setSearchQuery);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  // This month's live target progress + commission (membership and POS sales) per staff id.
  const [perfById, setPerfById] = useState<Record<string, StaffListPerformance>>({});
  const [commissionRulesList, setCommissionRulesList] = useState<CommissionRule[]>([]);
  // All roles from Roles & Permissions (system + user-created) — the source of truth
  // for which roles a commission rule can target.
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  // Roles this user may give a staff member (Add/Edit Employee role picker).
  const [assignableRoles, setAssignableRoles] = useState<AssignableRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [commissionRulesEdits, setCommissionRulesEdits] = useState<Record<string, {baseCommission: number; admissionCommission: number; posCommission: number; posCommissionPerSale: number; targetBonuses: Array<{threshold: number; bonus: number}>}>>({});
  const [pendingNewRules, setPendingNewRules] = useState<Array<{tempId: string; role: string; baseCommission: number; admissionCommission: number; posCommission: number; posCommissionPerSale: number; targetBonuses: Array<{threshold: number; bonus: number}>}>>([]);
  const [roleTargets, setRoleTargets] = useState<Record<string, { revenue: number; sessions: number; newClients: number }>>({});
  const [showViewSchedule, setShowViewSchedule] = useState(false);
  const [scheduleViewEmployee, setScheduleViewEmployee] = useState<Staff | null>(null);
  const [showSetTarget, setShowSetTarget] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<Staff | null>(null);
  const [targetForm, setTargetForm] = useState({ revenue_target: '', sessions_target: '', new_clients_target: '', timeframe: 'monthly' });
  const [existingTargetId, setExistingTargetId] = useState<string | null>(null);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerSrc, setPhotoViewerSrc] = useState<string | null>(null);
  const [photoViewerName, setPhotoViewerName] = useState('');
  // Full-page Add / Edit Employee form (replaces the list while open).
  const [formMode, setFormMode] = useState<null | { mode: 'add' } | { mode: 'edit'; staff: Staff }>(null);
  const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState<Staff | null>(null);
  const [statusEmployee, setStatusEmployee] = useState<Staff | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const { accessibleBranches, activeBranchId, isAllBranches } = useBranch();
  
  // Only show the active branch if not in "All Branches" mode
  const dropdownBranches = isAllBranches 
    ? accessibleBranches 
    : accessibleBranches.filter(b => b.id === activeBranchId);

  useEffect(() => {
    loadStaff();
    loadCommissionRules();
    rolesService.getAssignableRoles().then(setAssignableRoles).catch(e => console.error('Failed to load roles', e));
  }, []);

  // Reload settings data whenever the dialog opens
  useEffect(() => {
    if (!showTargetSettings) return;
    loadCommissionRules();
    rolesService.getRoles('', 1, 200).then(res => setAllRoles(res.data)).catch(e => console.error('Failed to load roles', e));
    // Build role targets from current staff list
    const roles: Record<string, { revenue: number; sessions: number; newClients: number }> = {};
    const seen = new Set<string>();
    staffList.forEach(s => {
      if (s.role && !seen.has(s.role)) {
        seen.add(s.role);
        roles[s.role] = { revenue: s.monthly_target || 0, sessions: 0, newClients: 0 };
      }
    });
    setRoleTargets(roles);
  }, [showTargetSettings]);

  useEffect(() => {
    const ids = staffList.map(s => String(s.id)).slice(0, 100);
    if (ids.length === 0) { setPerfById({}); return; }
    let cancelled = false;
    staffService.getStaffListPerformance(ids)
      .then(list => {
        if (cancelled) return;
        const map: Record<string, StaffListPerformance> = {};
        list.forEach(p => { map[String(p.staff_id)] = p; });
        setPerfById(map);
      })
      .catch(e => console.error('Failed to load staff performance', e));
    return () => { cancelled = true; };
  }, [staffList]);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const res = await staffService.getStaff({}, 1, 100);
      setStaffList(res.items);
    } catch (e) { console.error('Failed to load staff', e); }
    finally { setIsLoading(false); }
  };

  const loadCommissionRules = async () => {
    try {
      const rules = await staffService.getCommissionRules();
      setCommissionRulesList(rules);
      const edits: typeof commissionRulesEdits = {};
      rules.forEach(r => {
        let bonuses: Array<{threshold:number;bonus:number}> = [];
        try { bonuses = JSON.parse(r.target_bonuses_json || '[]'); } catch {}
        edits[r.id] = {
          baseCommission: r.base_commission,
          admissionCommission: r.admission_commission ?? r.base_commission,
          posCommission: r.pos_commission ?? 0,
          posCommissionPerSale: r.pos_commission_per_sale ?? 0,
          targetBonuses: bonuses,
        };
      });
      setCommissionRulesEdits(edits);
    } catch (e) { console.error('Failed to load commission rules', e); }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteConfirmEmployee) return;
    try {
      await staffService.deleteStaff(deleteConfirmEmployee.id);
      setDeleteConfirmEmployee(null);
      await loadStaff();
    } catch (e) { console.error('Failed to delete employee', e); }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!statusEmployee) return;
    setIsChangingStatus(true);
    try {
      await staffService.updateStaff(statusEmployee.id, {
        name: statusEmployee.name,
        email: statusEmployee.email,
        phone: statusEmployee.phone,
        role: statusEmployee.role,
        department: statusEmployee.department,
        branch: statusEmployee.branch,
        monthly_target: statusEmployee.monthly_target,
        base_salary: statusEmployee.base_salary,
        address: statusEmployee.address,
        status: newStatus,
        photo_url: statusEmployee.photo_url,
        certifications: statusEmployee.certifications || [],
        schedule: statusEmployee.schedule || {},
      });
      setStatusEmployee(null);
      await loadStaff();
    } catch (e) { console.error('Failed to change status', e); }
    finally { setIsChangingStatus(false); }
  };

  const handleSaveTarget = async () => {
    if (!targetEmployee || !targetForm.revenue_target) return;
    setIsSavingTarget(true);
    try {
      const now = new Date();
      if (existingTargetId) {
        await staffService.updateTarget(existingTargetId, {
          revenue_target: Number(targetForm.revenue_target),
          sessions_target: targetForm.sessions_target ? Number(targetForm.sessions_target) : undefined,
          new_clients_target: targetForm.new_clients_target ? Number(targetForm.new_clients_target) : undefined,
          timeframe: targetForm.timeframe,
        } as any);
      } else {
        await staffService.createTarget({
          staff_db_id: Number(targetEmployee.id),
          scope: 'individual',
          timeframe: targetForm.timeframe,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          revenue_target: Number(targetForm.revenue_target),
          sessions_target: targetForm.sessions_target ? Number(targetForm.sessions_target) : undefined,
          new_clients_target: targetForm.new_clients_target ? Number(targetForm.new_clients_target) : undefined,
        });
      }
      setShowSetTarget(false);
      setTargetEmployee(null);
      setExistingTargetId(null);
      setTargetForm({ revenue_target: '', sessions_target: '', new_clients_target: '', timeframe: 'monthly' });
    } catch (e) { console.error('Failed to save target', e); }
    finally { setIsSavingTarget(false); }
  };

  const openSetTarget = async (employee: Staff) => {
    setTargetEmployee(employee);
    setTargetForm({ revenue_target: '', sessions_target: '', new_clients_target: '', timeframe: 'monthly' });
    setExistingTargetId(null);
    try {
      const now = new Date();
      const existing = await staffService.getTargets(now.getFullYear(), now.getMonth() + 1, 'individual', Number(employee.id));
      if (existing.length > 0) {
        const t = existing[0];
        setExistingTargetId(t.id);
        setTargetForm({
          revenue_target: String(t.revenue_target || ''),
          sessions_target: String(t.sessions_target || ''),
          new_clients_target: String(t.new_clients_target || ''),
          timeframe: t.timeframe || 'monthly',
        });
      }
    } catch { /* ignore */ }
    setShowSetTarget(true);
  };

  const handleSaveSettings = async () => {
    setIsSavingRules(true);
    try {
      // Save monthly targets: update each staff's monthly_target by role
      for (const [role, targets] of Object.entries(roleTargets)) {
        const staffInRole = staffList.filter(s => s.role === role);
        for (const staff of staffInRole) {
          await staffService.updateStaff(staff.id, { monthly_target: targets.revenue });
        }
      }
      // Update existing commission rules
      for (const rule of commissionRulesList) {
        const edits = commissionRulesEdits[rule.id];
        if (edits) {
          await staffService.updateCommissionRule(rule.id, {
            base_commission: edits.baseCommission,
            admission_commission: edits.admissionCommission,
            pos_commission: edits.posCommission,
            pos_commission_per_sale: edits.posCommissionPerSale,
            target_bonuses_json: JSON.stringify(edits.targetBonuses)
          });
        }
      }
      // Create new pending commission rules
      for (const nr of pendingNewRules) {
        if (nr.role.trim()) {
          await staffService.createCommissionRule({
            role: nr.role.trim(),
            base_commission: nr.baseCommission,
            admission_commission: nr.admissionCommission,
            pos_commission: nr.posCommission,
            pos_commission_per_sale: nr.posCommissionPerSale,
            target_bonuses_json: JSON.stringify(nr.targetBonuses)
          });
        }
      }
      setPendingNewRules([]);
      await Promise.all([loadCommissionRules(), loadStaff()]);
      setShowTargetSettings(false);
    } catch (e) { console.error('Failed to save settings', e); }
    finally { setIsSavingRules(false); }
  };

  // Filter and sort staff data
  const filteredStaff = staffList
    .filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          staff.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'all' || staff.role.toLowerCase().includes(selectedRole.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || staff.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesBranch = selectedBranch === 'all' || staff.branch === selectedBranch;

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'target':
          aVal = a.monthly_target;
          bVal = b.monthly_target;
          break;
        case 'joinDate':
          aVal = new Date(a.join_date);
          bVal = new Date(b.join_date);
          break;
        case 'commission':
          aVal = Number(perfById[String(a.id)]?.commission_earned ?? 0);
          bVal = Number(perfById[String(b.id)]?.commission_earned ?? 0);
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

  // Filter staff by tab
  const getStaffByTab = () => {
    switch (activeTab) {
      case 'trainers':
        return filteredStaff.filter(s => s.role.toLowerCase().includes('trainer'));
      case 'sales-reception':
        return filteredStaff.filter(s => s.role.toLowerCase().includes('reception') || s.role.toLowerCase().includes('sales'));
      case 'performance':
        return [...filteredStaff].sort((a, b) => b.monthly_target - a.monthly_target);
      case 'certifications':
        return filteredStaff.filter(s => s.certifications.length > 0);
      default:
        return filteredStaff;
    }
  };

  const currentStaff = getStaffByTab();

  // Calculate KPIs
  const totalStaff = staffList.length;
  const trainersWithCerts = staffList.filter(s => s.role.toLowerCase().includes('trainer') && s.certifications.length > 0).length;
  const avgTargetAchievement = 0; // computed from targets API - not available in Staff interface
  const pendingCertifications = 3; // Mock data

  const getTargetColor = (percentage: number) => {
    if (percentage >= 120) return 'text-emerald-600 bg-emerald-50';
    if (percentage >= 100) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTargetProgressColor = (percentage: number) => {
    if (percentage >= 120) return 'bg-emerald-500';
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    const normalized = status?.toLowerCase();
    if (normalized === 'active') return 'bg-green-100 text-green-800';
    if (normalized === 'on_leave') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusLabel = (status: string) => {
    return status
      ?.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (formMode) {
    return (
      <EmployeeForm
        mode={formMode.mode}
        employee={formMode.mode === 'edit' ? formMode.staff : null}
        assignableRoles={assignableRoles}
        branches={dropdownBranches}
        departments={Array.from(new Set(staffList.map(x => x.department).filter(Boolean)))}
        staffList={staffList}
        onCancel={() => setFormMode(null)}
        onSaved={() => { setFormMode(null); loadStaff(); }}
        onNavigate={onNavigate}
      />
    );
  }

  if (!hasPermission("STAFF_VIEW")) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">
          You don't have permission to view this page.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staffs & Trainers</h1>
          <p className="text-gray-600 mt-1">
            Manage employee profiles, performance, targets, and commissions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('shifts-schedules')}>
            <Clock className="h-4 w-4 mr-2" />
            Shifts & Schedules
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('set-targets')}>
            <Target className="h-4 w-4 mr-2" />
            Targets & Commission
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('targets-overview')}>
            <Gauge className="h-4 w-4 mr-2" />
            Targets Overview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTargetSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <PermissionGate permission="STAFF_CREATE">
            <Button onClick={() => setFormMode({ mode: 'add' })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Key Metrics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Staff</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalStaff}</div>
            <p className="text-xs text-muted-foreground">Registered employees</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Staff</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{staffList.filter(s => s.status?.toLowerCase() === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Certified Trainers</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Award className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trainersWithCerts}</div>
            <p className="text-xs text-muted-foreground">With certifications</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Target</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgTargetAchievement}%</div>
            <p className="text-xs text-muted-foreground">Achievement rate</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Certs</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCertifications}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="gymbios_admin">Gymbios_Admin</SelectItem>
                <SelectItem value="trainer">Trainers</SelectItem>
                <SelectItem value="reception">Reception</SelectItem>
                <SelectItem value="accountant">Accountants</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {accessibleBranches.map(b => (
                  <SelectItem key={b.id} value={b.branchName}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort: {sortBy} <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('target')}>Target Achievement</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('joinDate')}>Join Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('commission')}>Commission</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Left Sidebar Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Button
                variant={activeTab === 'all-staff' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('all-staff')}
              >
                <Users className="h-4 w-4 mr-2" />
                All Staff ({staffList.length})
              </Button>
              <Button
                variant={activeTab === 'trainers' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('trainers')}
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Trainers ({staffList.filter(s => s.role.toLowerCase().includes('trainer')).length})
              </Button>
              <Button
                variant={activeTab === 'sales-reception' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('sales-reception')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Sales & Reception ({staffList.filter(s => s.role.toLowerCase().includes('reception')).length})
              </Button>
              <Separator className="my-3" />
              <Button
                variant={activeTab === 'performance' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('performance')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance & Targets
              </Button>
              <Button
                variant={activeTab === 'certifications' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('certifications')}
              >
                <Award className="h-4 w-4 mr-2" />
                Certifications & Skills
              </Button>
              <Button
                variant={activeTab === 'ratings' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('ratings')}
              >
                <Star className="h-4 w-4 mr-2" />
                Ratings & Reviews
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'ratings' ? (
            <StaffRatingsPanel staff={filteredStaff} isLoading={isLoading} />
          ) : (
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_tr]:border-0">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead>Employee</TableHead>
                      <TableHead>Role & Department</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Target Progress</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading staff...
                        </TableCell>
                      </TableRow>
                    ) : currentStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No staff found.
                        </TableCell>
                      </TableRow>
                    ) : currentStaff.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-50/50 transition-colors border-0">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <button
                              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                              onClick={() => { if (employee.photo_url) { setPhotoViewerSrc(employee.photo_url); setPhotoViewerName(employee.name); setPhotoViewerOpen(true); } }}
                            >
                              <Avatar className="h-10 w-10">
                                {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.name} />}
                                <AvatarFallback>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-muted-foreground">{employee.staff_id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.role}</div>
                            <div className="text-sm text-muted-foreground">{employee.department}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{employee.branch}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const perf = perfById[String(employee.id)];
                            const pct = perf?.achievement_percentage ?? 0;
                            const target = Number(perf?.revenue_target || employee.monthly_target || 0);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{perf ? `${pct}%` : '—'}</span>
                                  <Badge className={`text-xs ${getTargetColor(pct)}`}>
                                    <CurrencyGlyph /> {formatMoney(perf?.revenue_achieved)}
                                  </Badge>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getTargetProgressColor(pct)}`}
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Target: <CurrencyGlyph /> {target.toLocaleString()}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1" title="This month: membership sales + POS sales">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium"><CurrencyGlyph /> {formatMoney(perfById[String(employee.id)]?.commission_earned)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee.status)}>
                            {getStatusLabel(employee.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedEmployee(employee)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <PermissionGate permission="STAFF_EDIT">
                                <DropdownMenuItem onClick={() => setFormMode({ mode: 'edit', staff: employee })}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusEmployee(employee)}>
                                  <Activity className="h-4 w-4 mr-2" />
                                  Change Status
                                </DropdownMenuItem>
                              </PermissionGate>
                              <DropdownMenuItem onClick={() => { setScheduleViewEmployee(employee); setShowViewSchedule(true); }}>
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                View Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onNavigate?.('set-targets', { staffId: employee.id })}>
                                <Target className="h-4 w-4 mr-2" />
                                Set Target
                              </DropdownMenuItem>
                              <PermissionGate permission="STAFF_DELETE">
                                <DropdownMenuItem onClick={() => setDeleteConfirmEmployee(employee)} className="text-destructive focus:text-destructive">
                                  <X className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </PermissionGate>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      {/* Employee Profile Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl font-bold">{selectedEmployee.name}</div>
                    <div className="text-sm text-gray-600">{selectedEmployee.role} • {selectedEmployee.department}</div>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  View detailed employee profile including personal information, certifications, schedule, and performance metrics.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="personal" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="certifications">Certifications</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Employee ID</Label>
                          <div className="text-sm font-medium">{selectedEmployee.staff_id}</div>
                        </div>
                        <div>
                          <Label>Join Date</Label>
                          <div className="text-sm">{selectedEmployee.join_date ? new Date(selectedEmployee.join_date).toLocaleDateString() : '—'}</div>
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <div className="text-sm flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{selectedEmployee.phone}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Email</Label>
                          <div className="text-sm flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{selectedEmployee.email}</span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label>Address</Label>
                          <div className="text-sm flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{selectedEmployee.address}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="certifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Certifications & Skills</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(selectedEmployee.certifications || []).length === 0 ? (
                        <span className="text-sm text-muted-foreground">No certifications on file</span>
                      ) : (selectedEmployee.certifications as StaffCertification[]).map((cert, index) => (
                        <div key={cert.id ?? index} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-primary/10">
                          <div className="flex items-start gap-2 min-w-0">
                            <Award className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{cert.cert_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {[cert.issuer,
                                  cert.issue_date && `Issued ${new Date(cert.issue_date).toLocaleDateString()}`,
                                  cert.expiry_date && `Expires ${new Date(cert.expiry_date).toLocaleDateString()}`,
                                ].filter(Boolean).join(' • ')}
                              </div>
                            </div>
                          </div>
                          {cert.document_url ? (
                            <a href={staffService.resolveDocumentUrl(cert.document_url)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                              <FileText className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">No file</span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.keys(selectedEmployee.schedule || {}).length === 0 ? (
                          <div className="text-sm text-muted-foreground">No schedule configured</div>
                        ) : Object.entries(selectedEmployee.schedule).map(([day, slots]) => (
                          <div key={day} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium capitalize">{day}</div>
                            <div className="text-sm text-gray-600">
                              {Array.isArray(slots) && slots.length > 0 ? slots.join(', ') : 'Off'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Performance data is available in the Targets Overview. Set a target to start tracking performance.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Monthly Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">—</div>
                            <div className="text-sm text-gray-600">Sessions Completed</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">—</div>
                            <div className="text-sm text-gray-600">New Clients</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600"><CurrencyGlyph /> {formatMoney(perfById[String(selectedEmployee.id)]?.revenue_achieved)}</div>
                            <div className="text-sm text-gray-600">Revenue Generated</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-lg font-bold text-yellow-600"><CurrencyGlyph /> {formatMoney(perfById[String(selectedEmployee.id)]?.commission_earned)}</div>
                            <div className="text-sm text-gray-600">Commission Earned</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Schedule Modal */}
      <Dialog open={showViewSchedule} onOpenChange={v => { setShowViewSchedule(v); if (!v) setScheduleViewEmployee(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {scheduleViewEmployee?.name}'s Schedule
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {scheduleViewEmployee?.role} • {scheduleViewEmployee?.department}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-3" />
          {scheduleViewEmployee && (
            <div className="space-y-2">
              {Object.keys(scheduleViewEmployee.schedule || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No schedule configured for this employee.</p>
              ) : (
                Object.entries(scheduleViewEmployee.schedule).map(([day, slots]) => (
                  <div key={day} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium capitalize text-sm">{day}</div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(slots as string[]).map((slot, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{slot}</Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowViewSchedule(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Target Modal */}
      <Dialog open={showSetTarget} onOpenChange={v => { setShowSetTarget(v); if (!v) setTargetEmployee(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{existingTargetId ? 'Update Target' : 'Set Target'}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {targetEmployee?.name} • {targetEmployee?.role}
                  {existingTargetId && <span className="ml-2 text-orange-500 text-xs font-medium">Existing target loaded</span>}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-3" />
          <div className="space-y-4">
            <div>
              <Label>Timeframe</Label>
              <Select value={targetForm.timeframe} onValueChange={v => setTargetForm(p => ({...p, timeframe: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Revenue Target ({currencySymbol}) <span className="text-destructive">*</span></Label>
              <Input type="number" placeholder="e.g. 50000" className="mt-1"
                value={targetForm.revenue_target}
                onChange={e => setTargetForm(p => ({...p, revenue_target: e.target.value}))} />
            </div>
            <div>
              <Label>Sessions Target</Label>
              <Input type="number" placeholder="e.g. 120" className="mt-1"
                value={targetForm.sessions_target}
                onChange={e => setTargetForm(p => ({...p, sessions_target: e.target.value}))} />
            </div>
            <div>
              <Label>New Clients Target</Label>
              <Input type="number" placeholder="e.g. 8" className="mt-1"
                value={targetForm.new_clients_target}
                onChange={e => setTargetForm(p => ({...p, new_clients_target: e.target.value}))} />
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSetTarget(false)}>Cancel</Button>
            <Button onClick={handleSaveTarget} disabled={!targetForm.revenue_target || isSavingTarget}>
              {isSavingTarget ? 'Saving...' : 'Save Target'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{photoViewerName}</DialogTitle>
          </DialogHeader>
          {photoViewerSrc && (
            <div className="flex justify-center py-2">
              <img src={photoViewerSrc} alt={photoViewerName} className="h-52 w-52 rounded-full object-cover shadow-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Target & Commission Settings Modal */}
      <Dialog open={showTargetSettings} onOpenChange={v => { setShowTargetSettings(v); if (!v) setPendingNewRules([]); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Target & Commission Settings</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Configure monthly targets and commission rules for different roles
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-4" />

          <Tabs defaultValue="targets" className="space-y-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="targets" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Monthly Targets
              </TabsTrigger>
              <TabsTrigger value="commissions" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Commission Rules
              </TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="space-y-4">
              {Object.keys(roleTargets).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No staff roles found. Add employees first to configure role-based targets.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(roleTargets).map(([role, targets]) => (
                    <Card key={role} className="border-primary/10 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <CardTitle className="text-base font-semibold text-primary">{role}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Revenue Target ({currencySymbol})</Label>
                          <Input type="number" value={targets.revenue} className="h-8 text-sm"
                            onChange={e => setRoleTargets(prev => ({ ...prev, [role]: { ...prev[role], revenue: Number(e.target.value) } }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Sessions Target</Label>
                          <Input type="number" value={targets.sessions} className="h-8 text-sm"
                            onChange={e => setRoleTargets(prev => ({ ...prev, [role]: { ...prev[role], sessions: Number(e.target.value) } }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">New Clients Target</Label>
                          <Input type="number" value={targets.newClients} className="h-8 text-sm"
                            onChange={e => setRoleTargets(prev => ({ ...prev, [role]: { ...prev[role], newClients: Number(e.target.value) } }))}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="commissions" className="space-y-3">
              {commissionRulesList.length === 0 && pendingNewRules.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">No commission rules configured yet. Add a rule below.</div>
              )}

              {/* Existing rules */}
              {commissionRulesList.map((rule) => {
                const edits = commissionRulesEdits[rule.id] || { baseCommission: rule.base_commission, admissionCommission: rule.admission_commission ?? rule.base_commission, posCommission: rule.pos_commission ?? 0, posCommissionPerSale: rule.pos_commission_per_sale ?? 0, targetBonuses: [] };
                return (
                  <Card key={rule.id} className="border-primary/10 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <CardTitle className="text-sm font-semibold text-primary">{rule.role}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Base Commission (%)</Label>
                          <Input type="number" value={edits.baseCommission} step="0.1" className="h-8 text-sm"
                            onChange={e => setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, baseCommission: Number(e.target.value) } }))}
                          />
                          <p className="text-xs text-muted-foreground">Renewals, add-ons, walk-ins</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Admission Commission (%)</Label>
                          <Input type="number" value={edits.admissionCommission} step="0.1" className="h-8 text-sm"
                            onChange={e => setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, admissionCommission: Number(e.target.value) } }))}
                          />
                          <p className="text-xs text-muted-foreground">New member signups</p>
                        </div>
                      </div>
                      <PosCommissionFields
                        percent={edits.posCommission}
                        perSale={edits.posCommissionPerSale}
                        onChange={(pos) => setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, ...pos } }))}
                      />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Target Achievement Bonuses</Label>
                        {edits.targetBonuses.map((bonus, index) => (
                          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-muted/30 rounded-md p-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">At target (%)</Label>
                              <Input type="number" value={bonus.threshold} placeholder="100"
                                onChange={e => { const u = [...edits.targetBonuses]; u[index] = { ...u[index], threshold: Number(e.target.value) }; setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, targetBonuses: u } })); }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Bonus (%)</Label>
                              <Input type="number" value={bonus.bonus} step="0.1"
                                onChange={e => { const u = [...edits.targetBonuses]; u[index] = { ...u[index], bonus: Number(e.target.value) }; setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, targetBonuses: u } })); }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { const u = edits.targetBonuses.filter((_, i) => i !== index); setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, targetBonuses: u } })); }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="w-full text-xs h-7 border-dashed"
                          onClick={() => setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, targetBonuses: [...edits.targetBonuses, { threshold: 100, bonus: 5 }] } }))}>
                          <Plus className="h-3 w-3 mr-1" /> Add Bonus Tier
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Pending new rules */}
              {pendingNewRules.map((nr) => {
                // Offer every role from Roles & Permissions (system + user-created), not
                // just roles among currently-hired staff — otherwise you couldn't set up a
                // commission rule for a role before anyone's been hired into it. Excludes
                // roles that already have a rule, since the backend enforces one per role.
                // (Matching against Staff.role at commission-computation time is
                // case-insensitive, so "RECEPTIONIST" here still matches a staff member's
                // "Receptionist" job title.)
                const usedRoles = new Set([
                  ...commissionRulesList.map(r => r.role),
                  ...pendingNewRules.filter(r => r.tempId !== nr.tempId).map(r => r.role).filter(Boolean),
                ]);
                const availableRoles = allRoles.map(r => r.role_name).filter(role => !usedRoles.has(role));
                return (
                <Card key={nr.tempId} className="border-primary/20 shadow-sm border-dashed">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <Select
                          value={nr.role || undefined}
                          onValueChange={v => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, role: v } : r))}
                        >
                          <SelectTrigger className="h-8 text-sm font-medium">
                            <SelectValue placeholder={availableRoles.length ? "Select a role" : "No roles without a rule"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 mt-5 flex-shrink-0"
                        onClick={() => setPendingNewRules(prev => prev.filter(r => r.tempId !== nr.tempId))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Base Commission (%)</Label>
                        <Input type="number" value={nr.baseCommission} step="0.1" className="h-8 text-sm"
                          onChange={e => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, baseCommission: Number(e.target.value) } : r))}
                        />
                        <p className="text-xs text-muted-foreground">Renewals, add-ons, walk-ins</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Admission Commission (%)</Label>
                        <Input type="number" value={nr.admissionCommission} step="0.1" className="h-8 text-sm"
                          onChange={e => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, admissionCommission: Number(e.target.value) } : r))}
                        />
                        <p className="text-xs text-muted-foreground">New member signups</p>
                      </div>
                    </div>
                    <PosCommissionFields
                      percent={nr.posCommission}
                      perSale={nr.posCommissionPerSale}
                      onChange={(pos) => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, ...pos } : r))}
                    />
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Target Achievement Bonuses</Label>
                      {nr.targetBonuses.map((bonus, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-muted/30 rounded-md p-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">At target (%)</Label>
                            <Input type="number" value={bonus.threshold} placeholder="100"
                              onChange={e => setPendingNewRules(prev => prev.map(r => { if (r.tempId !== nr.tempId) return r; const u = [...r.targetBonuses]; u[index] = { ...u[index], threshold: Number(e.target.value) }; return { ...r, targetBonuses: u }; }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Bonus (%)</Label>
                            <Input type="number" value={bonus.bonus} step="0.1"
                              onChange={e => setPendingNewRules(prev => prev.map(r => { if (r.tempId !== nr.tempId) return r; const u = [...r.targetBonuses]; u[index] = { ...u[index], bonus: Number(e.target.value) }; return { ...r, targetBonuses: u }; }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, targetBonuses: r.targetBonuses.filter((_, i) => i !== index) } : r))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="w-full text-xs h-7 border-dashed"
                        onClick={() => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, targetBonuses: [...r.targetBonuses, { threshold: 100, bonus: 5 }] } : r))}>
                        <Plus className="h-3 w-3 mr-1" /> Add Bonus Tier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}

              {/* Add Rule button — only when a role still lacks a commission rule */}
              {allRoles.map(r => r.role_name).some(role =>
                !commissionRulesList.some(r => r.role === role) && !pendingNewRules.some(r => r.role === role)
              ) ? (
                <Button variant="outline" className="w-full border-dashed text-primary border-primary/30 hover:bg-primary/5"
                  onClick={() => setPendingNewRules(prev => [...prev, { tempId: Date.now().toString(), role: '', baseCommission: 5, admissionCommission: 5, posCommission: 0, posCommissionPerSale: 0, targetBonuses: [] }])}>
                  <Plus className="h-4 w-4 mr-2" /> Add Commission Rule
                </Button>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-2">Every role already has a commission rule.</p>
              )}
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowTargetSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSavingRules}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSavingRules ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmEmployee} onOpenChange={v => { if (!v) setDeleteConfirmEmployee(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl">Delete Employee</DialogTitle>
                <DialogDescription className="mt-0.5">This action cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-3" />
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-foreground">{deleteConfirmEmployee?.name}</span>?
            All their data including targets and certifications will be removed.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmEmployee(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>Delete Employee</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={!!statusEmployee} onOpenChange={v => { if (!v) setStatusEmployee(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Change Status</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {statusEmployee?.name} · {statusEmployee?.role}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-3" />
          <div className="space-y-2">
            {([
              { value: 'active',   label: 'Active',   icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600',  bg: 'bg-green-50 border-green-200 hover:bg-green-100' },
              { value: 'inactive', label: 'Inactive', icon: <UserX       className="h-4 w-4" />, color: 'text-red-600',    bg: 'bg-red-50 border-red-200 hover:bg-red-100' },
              { value: 'on_leave', label: 'On Leave', icon: <Clock       className="h-4 w-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
            ] as const).map(opt => {
              const isCurrent = statusEmployee?.status?.toLowerCase() === opt.value;
              return (
                <button
                  key={opt.value}
                  disabled={isCurrent || isChangingStatus}
                  onClick={() => handleChangeStatus(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'border-primary bg-primary text-white cursor-default'
                      : `${opt.bg} ${opt.color} cursor-pointer`
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                  {isCurrent && <span className="ml-auto text-xs opacity-80">Current</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="outline" size="sm" onClick={() => setStatusEmployee(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

