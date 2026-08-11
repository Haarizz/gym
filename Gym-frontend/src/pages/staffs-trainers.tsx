import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { toast } from 'sonner';
import { staffService, Staff, CommissionRule, StaffCertification } from '../utils/supabase/staff-service';
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


interface StaffsTrainersProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

// ── Certifications sub-component ──────────────────────────────────────────
function AddCertificationsTab() {
  const [certs, setCerts] = React.useState([
    { name: '', issuer: '', issueDate: '', expiryDate: '' }
  ]);

  const addCert = () =>
    setCerts(prev => [...prev, { name: '', issuer: '', issueDate: '', expiryDate: '' }]);

  const removeCert = (i: number) =>
    setCerts(prev => prev.filter((_, idx) => idx !== i));

  const updateCert = (i: number, field: string, value: string) =>
    setCerts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Add professional certifications and qualifications</p>
        <Button size="sm" variant="outline" onClick={addCert} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Certification
        </Button>
      </div>

      {certs.map((cert, i) => (
        <div key={i} className="p-4 rounded-lg border border-primary/10 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Certification {i + 1}</span>
            </div>
            {certs.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => removeCert(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Certification Name</Label>
              <Input
                placeholder="e.g. CPT, ACE, NASM"
                value={cert.name}
                onChange={e => updateCert(i, 'name', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Issuing Body</Label>
              <Input
                placeholder="e.g. NASM, ACE, CrossFit"
                value={cert.issuer}
                onChange={e => updateCert(i, 'issuer', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Issue Date</Label>
              <Input
                type="date"
                value={cert.issueDate}
                onChange={e => updateCert(i, 'issueDate', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input
                type="date"
                value={cert.expiryDate}
                onChange={e => updateCert(i, 'expiryDate', e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Upload Document</Label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 text-xs text-primary cursor-pointer hover:bg-primary/10 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                Choose file (PDF / Image)
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Schedule sub-component ─────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['Morning (6am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–10pm)'];
// Single set of roles used both as the employee's job role and their app login/RBAC role,
// so Add/Edit Employee only asks for one "Role" instead of two confusingly similar fields.
const SECURITY_ROLES = ['Admin', 'Receptionist', 'Trainer', 'Accountant', 'Manager'];

function AddScheduleTab() {
  const [schedule, setSchedule] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(DAYS.map(d => [d, []]))
  );

  const toggle = (day: string, slot: string) => {
    setSchedule(prev => {
      const current = prev[day];
      return {
        ...prev,
        [day]: current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot]
      };
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select the working days and time slots for this employee</p>
      <div className="rounded-lg border border-primary/10 overflow-hidden">
        {/* Header row */}
        <div className="grid bg-slate-50/80" style={{ gridTemplateColumns: '140px repeat(3, 1fr)' }}>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-primary/10">Day</div>
          {SLOTS.map(slot => (
            <div key={slot} className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-l border-primary/10 text-center">{slot}</div>
          ))}
        </div>
        {/* Day rows */}
        {DAYS.map((day, di) => (
          <div
            key={day}
            className={`grid items-center ${di % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}
            style={{ gridTemplateColumns: '140px repeat(3, 1fr)' }}
          >
            <div className="px-3 py-3 text-sm font-medium text-foreground border-r border-primary/10">{day}</div>
            {SLOTS.map(slot => {
              const active = schedule[day].includes(slot);
              return (
                <div key={slot} className="flex justify-center px-3 py-3 border-l border-primary/10">
                  <button
                    type="button"
                    onClick={() => toggle(day, slot)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-muted-foreground/30 hover:border-primary/50'
                    }`}
                  >
                    {active && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-md bg-primary inline-block" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-md border-2 border-muted-foreground/30 inline-block" />
          Not working
        </span>
      </div>
    </div>
  );
}

// ── Controlled Certifications tab (for Edit modal) ─────────────────────────
interface EditCertificationsTabProps {
  certifications: StaffCertification[];
  onChange: (certs: StaffCertification[]) => void;
}
function EditCertificationsTab({ certifications, onChange }: EditCertificationsTabProps) {
  const addCert = () =>
    onChange([...certifications, { cert_name: '', issuer: '', issue_date: '', expiry_date: '' }]);

  const removeCert = (i: number) => onChange(certifications.filter((_, idx) => idx !== i));

  const updateCert = (i: number, field: keyof StaffCertification, value: string) =>
    onChange(certifications.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Edit professional certifications</p>
        <Button size="sm" variant="outline" onClick={addCert} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Certification
        </Button>
      </div>
      {certifications.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No certifications on file.</p>
      )}
      {certifications.map((cert, i) => (
        <div key={i} className="p-4 rounded-lg border border-primary/10 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Certification {i + 1}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeCert(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Certification Name</Label>
              <Input placeholder="e.g. CPT, ACE" value={cert.cert_name} className="mt-1 h-8 text-sm"
                onChange={e => updateCert(i, 'cert_name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Issuing Body</Label>
              <Input placeholder="e.g. NASM, ACE" value={cert.issuer} className="mt-1 h-8 text-sm"
                onChange={e => updateCert(i, 'issuer', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Issue Date</Label>
              <Input type="date" value={cert.issue_date} className="mt-1 h-8 text-sm"
                onChange={e => updateCert(i, 'issue_date', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" value={cert.expiry_date} className="mt-1 h-8 text-sm"
                onChange={e => updateCert(i, 'expiry_date', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Controlled Schedule tab (for Edit modal) ────────────────────────────────
interface EditScheduleTabProps {
  schedule: Record<string, string[]>;
  onChange: (schedule: Record<string, string[]>) => void;
}
function EditScheduleTab({ schedule, onChange }: EditScheduleTabProps) {
  const toggle = (day: string, slot: string) => {
    const current = schedule[day] || [];
    onChange({
      ...schedule,
      [day]: current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot]
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select working days and time slots</p>
      <div className="rounded-lg border border-primary/10 overflow-hidden">
        <div className="grid bg-slate-50/80" style={{ gridTemplateColumns: '140px repeat(3, 1fr)' }}>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-primary/10">Day</div>
          {SLOTS.map(slot => (
            <div key={slot} className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-l border-primary/10 text-center">{slot}</div>
          ))}
        </div>
        {DAYS.map((day, di) => (
          <div key={day} className={`grid items-center ${di % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}
            style={{ gridTemplateColumns: '140px repeat(3, 1fr)' }}>
            <div className="px-3 py-3 text-sm font-medium border-r border-primary/10">{day}</div>
            {SLOTS.map(slot => {
              const active = (schedule[day] || []).includes(slot);
              return (
                <div key={slot} className="flex justify-center px-3 py-3 border-l border-primary/10">
                  <button type="button" onClick={() => toggle(day, slot)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${active ? 'bg-primary border-primary text-white' : 'bg-white border-muted-foreground/30 hover:border-primary/50'}`}>
                    {active && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffsTrainers({ onNavigate }: StaffsTrainersProps = {}) {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('all-staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [commissionRulesList, setCommissionRulesList] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [commissionRulesEdits, setCommissionRulesEdits] = useState<Record<string, {baseCommission: number; targetBonuses: Array<{threshold: number; bonus: number}>}>>({});
  const [pendingNewRules, setPendingNewRules] = useState<Array<{tempId: string; role: string; baseCommission: number; targetBonuses: Array<{threshold: number; bonus: number}>}>>([]);
  const [roleTargets, setRoleTargets] = useState<Record<string, { revenue: number; sessions: number; newClients: number }>>({});
  const [newEmployeeBasicInfo, setNewEmployeeBasicInfo] = useState<{
    name: string; email: string; phone: string; role: string; department: string;
    branch: string; monthly_target: number; base_salary: number; address: string; photo_url?: string;
    appUsername?: string; appPassword?: string;
  }>({
    name: '', email: '', phone: '', role: '', department: '', branch: '',
    monthly_target: 0, base_salary: 0, address: '', appUsername: '', appPassword: ''
  });
  const [showNewEmpPassword, setShowNewEmpPassword] = useState(false);
  const [isTogglingStaffAccess, setIsTogglingStaffAccess] = useState(false);
  const [editAppUsername, setEditAppUsername] = useState('');
  const [editAppPassword, setEditAppPassword] = useState('');
  const [showEditAppPassword, setShowEditAppPassword] = useState(false);
  const [isSavingStaffCredentials, setIsSavingStaffCredentials] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [editEmployeeData, setEditEmployeeData] = useState<Staff | null>(null);
  const [showViewSchedule, setShowViewSchedule] = useState(false);
  const [scheduleViewEmployee, setScheduleViewEmployee] = useState<Staff | null>(null);
  const [showSetTarget, setShowSetTarget] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<Staff | null>(null);
  const [targetForm, setTargetForm] = useState({ revenue_target: '', sessions_target: '', new_clients_target: '', timeframe: 'monthly' });
  const [existingTargetId, setExistingTargetId] = useState<string | null>(null);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState<Staff | null>(null);
  const [statusEmployee, setStatusEmployee] = useState<Staff | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Photo states
  const [photoAdjustMode, setPhotoAdjustMode] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState([1]);
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [photoTarget, setPhotoTarget] = useState<'add' | 'edit'>('add');
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerSrc, setPhotoViewerSrc] = useState<string | null>(null);
  const [photoViewerName, setPhotoViewerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadStaff();
    loadCommissionRules();
  }, []);

  // Reload settings data whenever the dialog opens
  useEffect(() => {
    if (!showTargetSettings) return;
    loadCommissionRules();
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
      const edits: Record<string, {baseCommission: number; targetBonuses: Array<{threshold:number;bonus:number}>}> = {};
      rules.forEach(r => {
        let bonuses: Array<{threshold:number;bonus:number}> = [];
        try { bonuses = JSON.parse(r.target_bonuses_json || '[]'); } catch {}
        edits[r.id] = { baseCommission: r.base_commission, targetBonuses: bonuses };
      });
      setCommissionRulesEdits(edits);
    } catch (e) { console.error('Failed to load commission rules', e); }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeBasicInfo.name || !newEmployeeBasicInfo.email) return;
    try {
      await staffService.createStaff({
        ...newEmployeeBasicInfo,
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        certifications: [],
        schedule: {},
        photo_url: newEmployeeBasicInfo.photo_url,
        ...(newEmployeeBasicInfo.appUsername && newEmployeeBasicInfo.appPassword ? {
          app_username: newEmployeeBasicInfo.appUsername,
          app_password: newEmployeeBasicInfo.appPassword,
          app_role: newEmployeeBasicInfo.role || undefined,
        } : {}),
      });
      setShowAddEmployee(false);
      setNewEmployeeBasicInfo({ name: '', email: '', phone: '', role: '', department: '', branch: '', monthly_target: 0, base_salary: 0, address: '', appUsername: '', appPassword: '' });
      await loadStaff();
    } catch (e) { console.error('Failed to create employee', e); }
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

  const handleUpdateEmployee = async () => {
    if (!editEmployeeData) return;
    try {
      await staffService.updateStaff(editEmployeeData.id, {
        name: editEmployeeData.name,
        email: editEmployeeData.email,
        phone: editEmployeeData.phone,
        role: editEmployeeData.role,
        department: editEmployeeData.department,
        branch: editEmployeeData.branch,
        monthly_target: editEmployeeData.monthly_target,
        base_salary: editEmployeeData.base_salary,
        address: editEmployeeData.address,
        status: editEmployeeData.status,
        photo_url: editEmployeeData.photo_url,
        certifications: editEmployeeData.certifications || [],
        schedule: editEmployeeData.schedule || {},
      });
      setShowEditEmployee(false);
      setEditEmployeeData(null);
      await loadStaff();
    } catch (e) { console.error('Failed to update employee', e); }
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

  // ── Photo handlers ──────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setCameraDialogOpen(true);
    } catch { alert('Camera unavailable. Please use Upload Photo instead.'); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraDialogOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        setSelectedPhoto(canvas.toDataURL('image/jpeg', 0.8));
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        stopCamera();
        setPhotoAdjustMode(true);
      }
    }
  };

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setSelectedPhoto(ev.target?.result as string);
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        setPhotoAdjustMode(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePhotoSave = () => {
    if (!selectedPhoto) return;
    const previewSize = 192;
    const outputSize = 300;
    const ratio = outputSize / previewSize;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const zoom = photoZoom[0];
      // Replicate object-cover: scale image to cover previewSize x previewSize
      const coverScale = Math.max(previewSize / img.naturalWidth, previewSize / img.naturalHeight);
      const covW = img.naturalWidth * coverScale;
      const covH = img.naturalHeight * coverScale;
      // object-cover centers the content within the element box
      const covX = (previewSize - covW) / 2;
      const covY = (previewSize - covH) / 2;
      // CSS transform: translate(px,py) scale(zoom) with transform-origin center
      // A point (x,y) in element space moves to:
      //   ((x - previewSize/2) * zoom + previewSize/2 + px)
      const outputX = (covX - previewSize / 2) * zoom + previewSize / 2 + photoPosition.x;
      const outputY = (covY - previewSize / 2) * zoom + previewSize / 2 + photoPosition.y;
      ctx.drawImage(img, outputX * ratio, outputY * ratio, covW * zoom * ratio, covH * zoom * ratio);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (photoTarget === 'add') {
        setNewEmployeeBasicInfo(p => ({ ...p, photo_url: croppedDataUrl }));
      } else {
        setEditEmployeeData(p => p ? { ...p, photo_url: croppedDataUrl } : p);
      }
      setPhotoAdjustMode(false);
    };
    img.src = selectedPhoto;
  };

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - photoPosition.x, y: e.clientY - photoPosition.y });
  };
  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPhotoPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handlePhotoMouseUp = () => setIsDragging(false);

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
          aVal = 0;
          bVal = 0;
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
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'on_leave') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

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
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('set-targets')}>
            <Target className="h-4 w-4 mr-2" />
            Set Targets
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('targets-overview')}>
            <Gauge className="h-4 w-4 mr-2" />
            Targets Overview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTargetSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setShowAddEmployee(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
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
            <div className="text-2xl font-bold text-green-600">{staffList.filter(s => s.status === 'active').length}</div>
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
                <SelectItem value="admin">Admin</SelectItem>
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
                <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                <SelectItem value="Marina Branch">Marina Branch</SelectItem>
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
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">—</span>
                              <Badge className={`text-xs ${getTargetColor(0)}`}>
                                <CurrencyGlyph /> 0
                              </Badge>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getTargetProgressColor(0)}`}
                                style={{ width: `0%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Target: <CurrencyGlyph /> {(employee.monthly_target || 0).toLocaleString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium"><CurrencyGlyph /> 0</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee.status)}>
                            {employee.status}
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
                              <DropdownMenuItem onClick={() => { setEditEmployeeData({...employee}); setEditAppUsername(''); setEditAppPassword(''); setShowEditAppPassword(false); setShowEditEmployee(true); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusEmployee(employee)}>
                                <Activity className="h-4 w-4 mr-2" />
                                Change Status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setScheduleViewEmployee(employee); setShowViewSchedule(true); }}>
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                View Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onNavigate?.('set-targets', { staffId: employee.id })}>
                                <Target className="h-4 w-4 mr-2" />
                                Set Target
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteConfirmEmployee(employee)} className="text-destructive focus:text-destructive">
                                <X className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
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
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-base">Certifications</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selectedEmployee.certifications || []).length === 0 ? (
                            <span className="text-sm text-muted-foreground">No certifications on file</span>
                          ) : (selectedEmployee.certifications || []).map((cert: any, index: number) => (
                            <Badge key={index} variant="secondary">
                              <Award className="h-3 w-3 mr-1" />
                              {cert.cert_name || cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
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
                            <div className="text-lg font-bold text-purple-600"><CurrencyGlyph /> 0</div>
                            <div className="text-sm text-gray-600">Revenue Generated</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-lg font-bold text-yellow-600"><CurrencyGlyph /> 0</div>
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

      {/* Add Employee Modal */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add New Employee</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Fill in details across all tabs before creating the profile
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-3" />

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="bg-muted/50 p-1 w-full">
              <TabsTrigger value="basic" className="flex-1 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="certifications" className="flex-1 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Certifications
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Schedule
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Photo section — inline adjust when photoAdjustMode & photoTarget=add */}
              {photoAdjustMode && photoTarget === 'add' ? (
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-primary/10 bg-muted/20">
                  <p className="text-sm font-medium self-start">Adjust Photo — drag to reposition</p>
                  <div
                    style={{ width: 192, height: 192, borderRadius: '50%', overflow: 'hidden', border: '3px solid #d1d5db', background: '#e5e7eb', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', flexShrink: 0 }}
                    onMouseDown={handlePhotoMouseDown}
                    onMouseMove={handlePhotoMouseMove}
                    onMouseUp={handlePhotoMouseUp}
                    onMouseLeave={handlePhotoMouseUp}
                  >
                    {selectedPhoto && (
                      <img src={selectedPhoto} alt="Adjust" draggable={false}
                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${photoPosition.x}px,${photoPosition.y}px) scale(${photoZoom[0]})`, transformOrigin: 'center', pointerEvents: 'none', userSelect: 'none' }} />
                    )}
                  </div>
                  <div className="w-full space-y-1 px-1">
                    <Label className="text-xs">Zoom: {photoZoom[0].toFixed(1)}x</Label>
                    <Slider value={photoZoom} onValueChange={setPhotoZoom} min={0.5} max={3} step={0.1} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setPhotoZoom([1]); setPhotoPosition({ x: 0, y: 0 }); }}>Reset</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setPhotoAdjustMode(false); setSelectedPhoto(null); }}>Cancel</Button>
                    <Button type="button" size="sm" onClick={handlePhotoSave}>Use Photo</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 p-4 rounded-lg border border-primary/10 bg-muted/20">
                  <button
                    type="button"
                    style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,71,171,0.2)', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: newEmployeeBasicInfo.photo_url ? 'pointer' : 'default' }}
                    onClick={() => { if (newEmployeeBasicInfo.photo_url) { setPhotoViewerSrc(newEmployeeBasicInfo.photo_url); setPhotoViewerName(newEmployeeBasicInfo.name || 'Employee'); setPhotoViewerOpen(true); } }}
                  >
                    {newEmployeeBasicInfo.photo_url
                      ? <img src={newEmployeeBasicInfo.photo_url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <Camera className="h-8 w-8 text-muted-foreground/50" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium mb-2">Employee Photo</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => { setPhotoTarget('add'); startCamera(); }}>
                        <Camera className="h-3.5 w-3.5" /> Camera
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => { setPhotoTarget('add'); fileInputRef.current?.click(); }}>
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </Button>
                      {newEmployeeBasicInfo.photo_url && (
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setNewEmployeeBasicInfo(p => ({ ...p, photo_url: undefined }))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Enter full name"
                    className="mt-1"
                    value={newEmployeeBasicInfo.name}
                    onChange={e => setNewEmployeeBasicInfo(p => ({...p, name: e.target.value}))}
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="employee@gymbios.com"
                    className="mt-1"
                    value={newEmployeeBasicInfo.email}
                    onChange={e => setNewEmployeeBasicInfo(p => ({...p, email: e.target.value}))}
                  />
                </div>
                <div>
                  <Label>Role <span className="text-muted-foreground font-normal">(also controls app access)</span></Label>
                  <Select
                    value={newEmployeeBasicInfo.role}
                    onValueChange={v => setNewEmployeeBasicInfo(p => ({...p, role: v}))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECURITY_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={newEmployeeBasicInfo.department}
                    onValueChange={v => setNewEmployeeBasicInfo(p => ({...p, department: v}))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal Training">Personal Training</SelectItem>
                      <SelectItem value="Group Classes">Group Classes</SelectItem>
                      <SelectItem value="Customer Service">Customer Service</SelectItem>
                      <SelectItem value="Specialized Training">Specialized Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select
                    value={newEmployeeBasicInfo.branch}
                    onValueChange={v => setNewEmployeeBasicInfo(p => ({...p, branch: v}))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                      <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Monthly Target ({currencyCode})</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    className="mt-1"
                    value={newEmployeeBasicInfo.monthly_target || ''}
                    onChange={e => setNewEmployeeBasicInfo(p => ({...p, monthly_target: Number(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Base Salary ({currencyCode})</Label>
                  <Input
                    type="number"
                    placeholder="8000"
                    className="mt-1"
                    value={newEmployeeBasicInfo.base_salary || ''}
                    onChange={e => setNewEmployeeBasicInfo(p => ({...p, base_salary: Number(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+971 50 123 4567"
                    className="mt-1"
                    value={newEmployeeBasicInfo.phone}
                    onChange={e => setNewEmployeeBasicInfo(p => ({...p, phone: e.target.value}))}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  placeholder="Enter address"
                  rows={2}
                  className="mt-1"
                  value={newEmployeeBasicInfo.address}
                  onChange={e => setNewEmployeeBasicInfo(p => ({...p, address: e.target.value}))}
                />
              </div>

              {/* App Access Section */}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3">App Access <span className="text-muted-foreground font-normal">(Optional — leave blank to skip)</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>App Username</Label>
                    <Input
                      placeholder="e.g. john.trainer"
                      className="mt-1"
                      value={newEmployeeBasicInfo.appUsername || ''}
                      onChange={e => setNewEmployeeBasicInfo(p => ({...p, appUsername: e.target.value}))}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label>App Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showNewEmpPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        className="pr-10"
                        value={newEmployeeBasicInfo.appPassword || ''}
                        onChange={e => setNewEmployeeBasicInfo(p => ({...p, appPassword: e.target.value}))}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewEmpPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewEmpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-4 mt-0">
              <AddCertificationsTab />
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 mt-0">
              <AddScheduleTab />
            </TabsContent>
          </Tabs>

          <Separator className="my-3" />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={!newEmployeeBasicInfo.name || !newEmployeeBasicInfo.email}>
              Create Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={showEditEmployee} onOpenChange={v => { setShowEditEmployee(v); if (!v) setEditEmployeeData(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Edit Employee Details</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Update employee information, certifications and schedule
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-3" />
          {editEmployeeData && (
            <>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="bg-muted/50 p-1 w-full">
                <TabsTrigger value="basic" className="flex-1 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="certifications" className="flex-1 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Certifications
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Schedule
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-0">
                {/* Photo section — inline adjust when photoAdjustMode & photoTarget=edit */}
                {photoAdjustMode && photoTarget === 'edit' ? (
                  <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-primary/10 bg-muted/20">
                    <p className="text-sm font-medium self-start">Adjust Photo — drag to reposition</p>
                    <div
                      style={{ width: 192, height: 192, borderRadius: '50%', overflow: 'hidden', border: '3px solid #d1d5db', background: '#e5e7eb', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', flexShrink: 0 }}
                      onMouseDown={handlePhotoMouseDown}
                      onMouseMove={handlePhotoMouseMove}
                      onMouseUp={handlePhotoMouseUp}
                      onMouseLeave={handlePhotoMouseUp}
                    >
                      {selectedPhoto && (
                        <img src={selectedPhoto} alt="Adjust" draggable={false}
                          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${photoPosition.x}px,${photoPosition.y}px) scale(${photoZoom[0]})`, transformOrigin: 'center', pointerEvents: 'none', userSelect: 'none' }} />
                      )}
                    </div>
                    <div className="w-full space-y-1 px-1">
                      <Label className="text-xs">Zoom: {photoZoom[0].toFixed(1)}x</Label>
                      <Slider value={photoZoom} onValueChange={setPhotoZoom} min={0.5} max={3} step={0.1} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setPhotoZoom([1]); setPhotoPosition({ x: 0, y: 0 }); }}>Reset</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setPhotoAdjustMode(false); setSelectedPhoto(null); }}>Cancel</Button>
                      <Button type="button" size="sm" onClick={handlePhotoSave}>Use Photo</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 p-4 rounded-lg border border-primary/10 bg-muted/20">
                    <button
                      type="button"
                      style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,71,171,0.2)', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: editEmployeeData.photo_url ? 'pointer' : 'default' }}
                      onClick={() => { if (editEmployeeData.photo_url) { setPhotoViewerSrc(editEmployeeData.photo_url); setPhotoViewerName(editEmployeeData.name); setPhotoViewerOpen(true); } }}
                    >
                      {editEmployeeData.photo_url
                        ? <img src={editEmployeeData.photo_url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <Camera className="h-8 w-8 text-muted-foreground/50" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium mb-2">Employee Photo</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => { setPhotoTarget('edit'); startCamera(); }}>
                          <Camera className="h-3.5 w-3.5" /> Camera
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => { setPhotoTarget('edit'); fileInputRef.current?.click(); }}>
                          <Upload className="h-3.5 w-3.5" /> Upload
                        </Button>
                        {editEmployeeData.photo_url && (
                          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setEditEmployeeData(p => p ? { ...p, photo_url: undefined } : p)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input className="mt-1" value={editEmployeeData.name}
                      onChange={e => setEditEmployeeData(p => p ? {...p, name: e.target.value} : p)} />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input type="email" className="mt-1" value={editEmployeeData.email}
                      onChange={e => setEditEmployeeData(p => p ? {...p, email: e.target.value} : p)} />
                  </div>
                  <div>
                    <Label>Role <span className="text-muted-foreground font-normal">(also controls app access)</span></Label>
                    <Select value={editEmployeeData.role} onValueChange={v => setEditEmployeeData(p => p ? {...p, role: v} : p)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SECURITY_ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={editEmployeeData.department} onValueChange={v => setEditEmployeeData(p => p ? {...p, department: v} : p)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal Training">Personal Training</SelectItem>
                        <SelectItem value="Group Classes">Group Classes</SelectItem>
                        <SelectItem value="Customer Service">Customer Service</SelectItem>
                        <SelectItem value="Specialized Training">Specialized Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Select value={editEmployeeData.branch} onValueChange={v => setEditEmployeeData(p => p ? {...p, branch: v} : p)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                        <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editEmployeeData.status} onValueChange={v => setEditEmployeeData(p => p ? {...p, status: v as any} : p)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monthly Target ({currencyCode})</Label>
                    <Input type="number" className="mt-1" value={editEmployeeData.monthly_target || ''}
                      onChange={e => setEditEmployeeData(p => p ? {...p, monthly_target: Number(e.target.value)} : p)} />
                  </div>
                  <div>
                    <Label>Base Salary ({currencyCode})</Label>
                    <Input type="number" className="mt-1" value={editEmployeeData.base_salary || ''}
                      onChange={e => setEditEmployeeData(p => p ? {...p, base_salary: Number(e.target.value)} : p)} />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input className="mt-1" value={editEmployeeData.phone}
                      onChange={e => setEditEmployeeData(p => p ? {...p, phone: e.target.value} : p)} />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea rows={2} className="mt-1" value={editEmployeeData.address}
                    onChange={e => setEditEmployeeData(p => p ? {...p, address: e.target.value} : p)} />
                </div>
              </TabsContent>

              <TabsContent value="certifications" className="mt-0">
                <EditCertificationsTab
                  certifications={editEmployeeData.certifications || []}
                  onChange={certs => setEditEmployeeData(p => p ? {...p, certifications: certs} : p)}
                />
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <EditScheduleTab
                  schedule={editEmployeeData.schedule || {}}
                  onChange={sched => setEditEmployeeData(p => p ? {...p, schedule: sched} : p)}
                />
              </TabsContent>
            </Tabs>

            {/* App Access Section */}
            <div className="pt-3 mt-2 border-t space-y-3">
              <p className="text-sm font-medium">App Access</p>

              {editEmployeeData.user_id ? (
                <>
                  {/* Toggle row */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Username: <span className="font-mono">{editEmployeeData.app_username}</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {editEmployeeData.app_access_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch
                        checked={editEmployeeData.app_access_enabled ?? false}
                        disabled={isTogglingStaffAccess}
                        onCheckedChange={async (checked) => {
                          setIsTogglingStaffAccess(true);
                          try {
                            const updated = await staffService.toggleStaffAccess(editEmployeeData.id, checked);
                            setEditEmployeeData(p => p ? { ...p, app_access_enabled: updated.app_access_enabled } : p);
                          } catch (e) { console.error('Failed to toggle staff access', e); }
                          finally { setIsTogglingStaffAccess(false); }
                        }}
                      />
                    </div>
                  </div>
                  {/* Change password */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Change Password <span className="font-normal">(also applies the Role selected above)</span></Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input
                          type={showEditAppPassword ? 'text' : 'password'}
                          placeholder="New password"
                          className="pr-9"
                          value={editAppPassword}
                          onChange={e => setEditAppPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditAppPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showEditAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!editAppPassword || isSavingStaffCredentials}
                        onClick={async () => {
                          setIsSavingStaffCredentials(true);
                          try {
                            await staffService.setStaffCredentials(editEmployeeData.id, editEmployeeData.app_username!, editAppPassword, editEmployeeData.role || undefined);
                            setEditAppPassword('');
                            toast.success('Password updated');
                          } catch (e: any) {
                            toast.error(e.message || 'Failed to update password');
                          } finally { setIsSavingStaffCredentials(false); }
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* No credentials yet — set new ones */
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">This staff member has no app login. Set credentials below.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Username</Label>
                      <Input
                        placeholder="e.g. john.trainer"
                        className="mt-1"
                        value={editAppUsername}
                        onChange={e => setEditAppUsername(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Password</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showEditAppPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          className="pr-9"
                          value={editAppPassword}
                          onChange={e => setEditAppPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditAppPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showEditAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!editAppUsername || !editAppPassword || isSavingStaffCredentials}
                    onClick={async () => {
                      setIsSavingStaffCredentials(true);
                      try {
                        const updated = await staffService.setStaffCredentials(editEmployeeData.id, editAppUsername, editAppPassword, editEmployeeData.role || undefined);
                        setEditEmployeeData(p => p ? { ...p, user_id: updated.user_id, app_username: updated.app_username, app_access_enabled: updated.app_access_enabled } : p);
                        setEditAppUsername('');
                        setEditAppPassword('');
                        toast.success('App access created');
                      } catch (e: any) {
                        toast.error(e.message || 'Failed to set credentials');
                      } finally { setIsSavingStaffCredentials(false); }
                    }}
                  >
                    Set App Access
                  </Button>
                </div>
              )}
            </div>
            </>
          )}
          <Separator className="my-3" />

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditEmployee(false)}>Cancel</Button>
            <Button onClick={handleUpdateEmployee} disabled={!editEmployeeData?.name || !editEmployeeData?.email}>
              Save Changes
            </Button>
          </div>
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
              <Label>Revenue Target ({currencyCode}) <span className="text-destructive">*</span></Label>
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

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Dialog */}
      <Dialog open={cameraDialogOpen} onOpenChange={open => !open && stopCamera()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Take Employee Photo</DialogTitle>
            <DialogDescription>Position the face in the frame, then capture.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-80 h-60 bg-gray-900 rounded-xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-white border-dashed rounded-full bg-white/10 pointer-events-none" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={stopCamera}>Cancel</Button>
              <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Camera className="h-4 w-4 mr-2" /> Capture
              </Button>
            </div>
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
                          <Label className="text-xs text-muted-foreground mb-1 block">Revenue Target ({currencyCode})</Label>
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
                const edits = commissionRulesEdits[rule.id] || { baseCommission: rule.base_commission, targetBonuses: [] };
                return (
                  <Card key={rule.id} className="border-primary/10 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <CardTitle className="text-sm font-semibold text-primary">{rule.role}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Base Commission (%)</Label>
                        <Input type="number" value={edits.baseCommission} step="0.1" className="h-8 text-sm"
                          onChange={e => setCommissionRulesEdits(prev => ({ ...prev, [rule.id]: { ...edits, baseCommission: Number(e.target.value) } }))}
                        />
                        <p className="text-xs text-muted-foreground">Base percentage of revenue generated</p>
                      </div>
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
              {pendingNewRules.map((nr) => (
                <Card key={nr.tempId} className="border-primary/20 shadow-sm border-dashed">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Role Name</Label>
                        <Input placeholder="e.g. Senior Trainer"
                          value={nr.role}
                          className="h-8 text-sm font-medium"
                          onChange={e => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, role: e.target.value } : r))}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 mt-5 flex-shrink-0"
                        onClick={() => setPendingNewRules(prev => prev.filter(r => r.tempId !== nr.tempId))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Base Commission (%)</Label>
                      <Input type="number" value={nr.baseCommission} step="0.1" className="h-8 text-sm"
                        onChange={e => setPendingNewRules(prev => prev.map(r => r.tempId === nr.tempId ? { ...r, baseCommission: Number(e.target.value) } : r))}
                      />
                    </div>
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
              ))}

              {/* Add Rule button */}
              <Button variant="outline" className="w-full border-dashed text-primary border-primary/30 hover:bg-primary/5"
                onClick={() => setPendingNewRules(prev => [...prev, { tempId: Date.now().toString(), role: '', baseCommission: 5, targetBonuses: [] }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Commission Rule
              </Button>
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
              const isCurrent = statusEmployee?.status === opt.value;
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

