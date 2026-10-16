import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Plus,
  MoreVertical,
  Eye,
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
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  Gauge,
  Save,
  UserPlus,
  Trash2,
  CreditCard,
  Landmark,
  FileCheck,
  FilePlus,
  CalendarCheck,
  Info,
  AlertTriangle as AlertTriangleIcon,
  ExternalLink,
} from 'lucide-react';

// Sample data - in real app, this would come from staff-service.tsx
const staffData = [
  {
    id: 'EMP001',
    avatar: '/staff/ahmed.jpg',
    name: 'Ahmed Al-Rashid',
    role: 'Senior Trainer',
    department: 'Personal Training',
    branch: 'Downtown Dubai',
    monthlyTarget: 50000,
    targetAchieved: 65000,
    targetPercentage: 130,
    commissionEarned: 3250,
    status: 'Active',
    joinDate: '2022-03-15',
    phone: '+971 50 123 4567',
    email: 'ahmed@gymbios.com',
    address: 'Jumeirah, Dubai, UAE',
    certifications: ['ACSM-CPT', 'NASM-PES', 'First Aid CPR'],
    specializations: ['Weight Loss', 'Strength Training', 'Athletic Performance'],
    schedule: {
      monday: '6:00 AM - 2:00 PM',
      tuesday: '6:00 AM - 2:00 PM',
      wednesday: '6:00 AM - 2:00 PM',
      thursday: '6:00 AM - 2:00 PM',
      friday: '6:00 AM - 2:00 PM',
      saturday: '8:00 AM - 4:00 PM',
      sunday: 'Off'
    },
    performance: {
      clientRetention: 95,
      sessionRating: 4.8,
      punctuality: 98,
      salesConversion: 85
    },
    monthlyStats: {
      sessionsCompleted: 124,
      newClients: 8,
      revenue: 65000,
      commissions: 3250
    }
  },
  {
    id: 'EMP002',
    avatar: '/staff/sarah.jpg',
    name: 'Sarah Johnson',
    role: 'Fitness Trainer',
    department: 'Group Classes',
    branch: 'Marina Branch',
    monthlyTarget: 35000,
    targetAchieved: 28000,
    targetPercentage: 80,
    commissionEarned: 1400,
    status: 'Active',
    joinDate: '2023-01-10',
    phone: '+971 55 987 6543',
    email: 'sarah@gymbios.com',
    address: 'Dubai Marina, Dubai, UAE',
    certifications: ['NASM-CPT', 'Yoga RYT-200'],
    specializations: ['Yoga', 'Pilates', 'Weight Loss'],
    schedule: {
      monday: '7:00 AM - 3:00 PM',
      tuesday: '7:00 AM - 3:00 PM',
      wednesday: '7:00 AM - 3:00 PM',
      thursday: '7:00 AM - 3:00 PM',
      friday: '7:00 AM - 3:00 PM',
      saturday: 'Off',
      sunday: '9:00 AM - 5:00 PM'
    },
    performance: {
      clientRetention: 88,
      sessionRating: 4.6,
      punctuality: 92,
      salesConversion: 78
    },
    monthlyStats: {
      sessionsCompleted: 89,
      newClients: 5,
      revenue: 28000,
      commissions: 1400
    }
  },
  {
    id: 'EMP003',
    avatar: '/staff/mohammed.jpg',
    name: 'Mohammed Hassan',
    role: 'Reception Manager',
    department: 'Customer Service',
    branch: 'Downtown Dubai',
    monthlyTarget: 25000,
    targetAchieved: 32000,
    targetPercentage: 128,
    commissionEarned: 1600,
    status: 'Active',
    joinDate: '2021-08-20',
    phone: '+971 52 456 7890',
    email: 'mohammed@gymbios.com',
    address: 'Business Bay, Dubai, UAE',
    certifications: ['Customer Service Excellence', 'Sales Training'],
    specializations: ['Member Relations', 'Sales', 'Administration'],
    schedule: {
      monday: '8:00 AM - 6:00 PM',
      tuesday: '8:00 AM - 6:00 PM',
      wednesday: '8:00 AM - 6:00 PM',
      thursday: '8:00 AM - 6:00 PM',
      friday: '8:00 AM - 6:00 PM',
      saturday: '9:00 AM - 5:00 PM',
      sunday: 'Off'
    },
    performance: {
      clientRetention: 92,
      sessionRating: 4.7,
      punctuality: 96,
      salesConversion: 90
    },
    monthlyStats: {
      sessionsCompleted: 0,
      newClients: 12,
      revenue: 32000,
      commissions: 1600
    }
  },
  {
    id: 'EMP004',
    avatar: '/staff/fatima.jpg',
    name: 'Fatima Al-Zahra',
    role: 'CrossFit Trainer',
    department: 'Specialized Training',
    branch: 'Marina Branch',
    monthlyTarget: 40000,
    targetAchieved: 22000,
    targetPercentage: 55,
    commissionEarned: 1100,
    status: 'Active',
    joinDate: '2023-05-12',
    phone: '+971 56 234 5678',
    email: 'fatima@gymbios.com',
    address: 'Palm Jumeirah, Dubai, UAE',
    certifications: ['CrossFit Level 2', 'Olympic Lifting'],
    specializations: ['CrossFit', 'Olympic Lifting', 'Functional Fitness'],
    schedule: {
      monday: '5:00 AM - 1:00 PM',
      tuesday: '5:00 AM - 1:00 PM',
      wednesday: '5:00 AM - 1:00 PM',
      thursday: '5:00 AM - 1:00 PM',
      friday: '5:00 AM - 1:00 PM',
      saturday: '7:00 AM - 3:00 PM',
      sunday: 'Off'
    },
    performance: {
      clientRetention: 85,
      sessionRating: 4.9,
      punctuality: 100,
      salesConversion: 72
    },
    monthlyStats: {
      sessionsCompleted: 67,
      newClients: 3,
      revenue: 22000,
      commissions: 1100
    }
  }
];

// Commission rules data
const commissionRules = [
  {
    id: 1,
    role: 'Senior Trainer',
    baseCommission: 5,
    targetBonus: [
      { threshold: 100, bonus: 2 },
      { threshold: 120, bonus: 3 },
      { threshold: 150, bonus: 5 }
    ]
  },
  {
    id: 2,
    role: 'Fitness Trainer',
    baseCommission: 4,
    targetBonus: [
      { threshold: 100, bonus: 1.5 },
      { threshold: 120, bonus: 2.5 },
      { threshold: 150, bonus: 4 }
    ]
  },
  {
    id: 3,
    role: 'Reception Manager',
    baseCommission: 3,
    targetBonus: [
      { threshold: 100, bonus: 1 },
      { threshold: 120, bonus: 2 },
      { threshold: 150, bonus: 3 }
    ]
  }
];

interface StaffsTrainersProps {
  onNavigate?: (section: string) => void;
}

export function StaffsTrainers({ onNavigate }: StaffsTrainersProps = {}) {
  const [activeTab, setActiveTab] = useState('all-staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [view, setView] = useState<'list' | 'addEmployee' | 'editEmployee'>('list');
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [empFormTab, setEmpFormTab] = useState('personal');
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort staff data
  const filteredStaff = staffData
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
          aVal = a.targetPercentage;
          bVal = b.targetPercentage;
          break;
        case 'joinDate':
          aVal = new Date(a.joinDate);
          bVal = new Date(b.joinDate);
          break;
        case 'commission':
          aVal = a.commissionEarned;
          bVal = b.commissionEarned;
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
        return filteredStaff.sort((a, b) => b.targetPercentage - a.targetPercentage);
      case 'certifications':
        return filteredStaff.filter(s => s.certifications.length > 0);
      default:
        return filteredStaff;
    }
  };

  const currentStaff = getStaffByTab();

  // Calculate KPIs
  const totalStaff = staffData.length;
  const trainersWithCerts = staffData.filter(s => s.role.toLowerCase().includes('trainer') && s.certifications.length > 0).length;
  const avgTargetAchievement = Math.round(staffData.reduce((acc, s) => acc + s.targetPercentage, 0) / staffData.length);
  const pendingCertifications = 3; // Mock data
  const topPerformer = staffData.reduce((top, current) => 
    current.targetPercentage > top.targetPercentage ? current : top, staffData[0]);

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
    return status === 'Active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  // ── Employee Form Sections ──────────────────────────────────────────────
  const EMP_SECTIONS = [
    { id: 'personal',    label: 'Personal Details',       icon: <UserPlus className="h-4 w-4" /> },
    { id: 'contact',     label: 'Contact Details',         icon: <Phone className="h-4 w-4" /> },
    { id: 'employment',  label: 'Employment & Role',       icon: <Briefcase className="h-4 w-4" /> },
    { id: 'department',  label: 'Department & Reporting',  icon: <Building className="h-4 w-4" /> },
    { id: 'documents',   label: 'Documents',               icon: <FileText className="h-4 w-4" /> },
    { id: 'payroll',     label: 'Payroll & Benefits',      icon: <Banknote className="h-4 w-4" /> },
    { id: 'shifts',      label: 'Shifts & Schedule',       icon: <Clock className="h-4 w-4" /> },
    { id: 'leave',       label: 'Leave Policy',            icon: <CalendarCheck className="h-4 w-4" /> },
    { id: 'emergency',   label: 'Emergency Contact',       icon: <Shield className="h-4 w-4" /> },
    { id: 'additional',  label: 'Additional Details',      icon: <Star className="h-4 w-4" /> },
  ];

  const genEmpId = () => `EMP${String(staffData.length + 1).padStart(3, '0')}`;

  const renderEmpForm = () => {
    const isEdit = view === 'editEmployee';
    const emp = isEdit ? editingEmployee : null;
    const sectionContent: Record<string, React.ReactNode> = {
      personal: (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border/40">
            <div className="h-20 w-20 rounded-full bg-[#2B7A7818] border-2 border-dashed border-[#2B7A7840] flex flex-col items-center justify-center cursor-pointer hover:bg-[#2B7A7825] transition-colors">
              <Camera className="h-5 w-5 text-[#2B7A78]" />
              <span className="text-[10px] text-[#2B7A78] mt-0.5">Photo</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Profile Photo</p>
              <p>JPG, PNG or GIF up to 2MB</p>
              <Button size="sm" variant="outline" className="mt-1.5 h-7 text-xs">Upload Photo</Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[['First Name','firstName','e.g. Ahmed'],['Middle Name','middleName','Optional'],['Last Name','lastName','e.g. Al-Rashid']].map(([l,n,p])=>(
              <div key={n} className="space-y-1"><Label className="text-xs">{l}</Label><Input placeholder={p} defaultValue={emp?.[n]??''} className="h-9 text-sm"/></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label:'Gender', opts:['Male','Female','Other'] },
              { label:'Marital Status', opts:['Single','Married','Divorced','Widowed'] },
              { label:'Nationality', opts:['UAE','India','Pakistan','Philippines','UK','Other'] },
            ].map(f=>(
              <div key={f.label} className="space-y-1"><Label className="text-xs">{f.label}</Label>
                <Select defaultValue={f.opts[0]}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input type="date" className="h-9 text-sm" defaultValue="1990-01-01"/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['Emirates ID / National ID','','784-XXXX-XXXXXXX-X'],['Passport Number','','A12345678'],['Personal Email','email','personal@email.com'],['Mobile Number','tel','+971 50 XXX XXXX']].map(([l,t,p])=>(
              <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label><Input type={t||'text'} placeholder={p} className="h-9 text-sm"/></div>
            ))}
          </div>
        </div>
      ),
      contact: (
        <div className="space-y-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Residential Address</p>
          <div className="grid grid-cols-2 gap-4">
            {[['Address Line 1','Building / Street'],['Address Line 2','Area / Landmark'],['City','e.g. Dubai'],['Emirate / State','e.g. Dubai'],['Country','e.g. UAE'],['Postal Code','']].map(([l,p])=>(
              <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label><Input placeholder={p} className="h-9 text-sm"/></div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#2B7A78] cursor-pointer hover:underline"><FilePlus className="h-3.5 w-3.5"/>Same as Residential Address (for Permanent Address)</div>
          <Separator/>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-4">
            {[['Emergency Contact Name','Full name'],['Relationship','e.g. Spouse'],['Emergency Phone','+971 XX XXX XXXX'],['Emergency Email','Optional']].map(([l,p])=>(
              <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label><Input placeholder={p} className="h-9 text-sm"/></div>
            ))}
          </div>
        </div>
      ),
      employment: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Employee ID</Label><Input value={genEmpId()} readOnly className="h-9 text-sm bg-muted/30"/></div>
            <div className="space-y-1"><Label className="text-xs">Joining Date</Label><Input type="date" className="h-9 text-sm" defaultValue="2026-10-01"/></div>
            {[
              { label:'Employment Type', opts:['Full-Time','Part-Time','Contract','Temporary'] },
              { label:'Employee Category', opts:['Staff','Trainer','Receptionist','Sales','Management','Other'] },
              { label:'Employment Status', opts:['Active','Probation','On Leave','Suspended','Resigned'] },
              { label:'Branch / Center', opts:['Downtown Dubai','Marina Branch','JLT Branch'] },
            ].map(f=>(
              <div key={f.label} className="space-y-1"><Label className="text-xs">{f.label}</Label>
                <Select defaultValue={f.opts[0]}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1"><Label className="text-xs">Designation / Job Title</Label><Input placeholder="e.g. Senior Fitness Trainer" className="h-9 text-sm"/></div>
            <div className="space-y-1"><Label className="text-xs">Contract Start Date</Label><Input type="date" className="h-9 text-sm" defaultValue="2026-10-01"/></div>
            <div className="space-y-1"><Label className="text-xs">Contract End Date</Label><Input type="date" className="h-9 text-sm"/></div>
            <div className="space-y-1"><Label className="text-xs">Probation End Date</Label><Input type="date" className="h-9 text-sm"/></div>
          </div>
        </div>
      ),
      department: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label:'Department', opts:['Personal Training','Group Classes','Customer Service','Specialized Training','Sales','Management'], create:true },
              { label:'Team', opts:['Morning Team','Evening Team','Weekend Team','All Shifts'] },
              { label:'Reporting Manager', opts:['Mohammed Hassan','Ahmed Al-Rashid','Sarah Johnson'] },
              { label:'Direct Supervisor', opts:['Same as Manager','Mohammed Hassan','Ahmed Al-Rashid'] },
              { label:'Cost Center', opts:['Main Gym','PT Studio','Group Classes','Admin'] },
              { label:'Access Role / Permissions', opts:['Staff','Trainer','Manager','Admin','Read Only'] },
            ].map(f=>(
              <div key={f.label} className="space-y-1">
                <div className="flex items-center justify-between"><Label className="text-xs">{f.label}</Label>
                  {f.create && <button className="text-[10px] text-[#2B7A78] hover:underline">+ New</button>}
                </div>
                <Select defaultValue={f.opts[0]}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ),
      documents: (
        <div className="space-y-4">
          {['Emirates ID','Passport','Visa/Residency','Work Permit','Employment Contract','Trainer Certification'].map((docType,i)=>(
            <div key={docType} className="p-3 rounded-xl border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2B7A78]"/>
                  <p className="text-sm font-medium">{docType}</p>
                </div>
                <Badge className={`text-[10px] border ${i===0?'bg-green-50 text-green-700 border-green-200':i===1?'bg-amber-50 text-amber-700 border-amber-200':i===4?'bg-green-50 text-green-700 border-green-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {i===0?'Valid':i===1?'Expiring Soon':i===4?'Valid':'Pending Upload'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Document Number</Label><Input placeholder="Doc number" className="h-8 text-xs"/></div>
                <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Issue Date</Label><Input type="date" className="h-8 text-xs"/></div>
                <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Expiry Date</Label><Input type="date" className="h-8 text-xs"/></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs"><Upload className="h-3 w-3 mr-1"/>Upload</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"><Eye className="h-3 w-3 mr-1"/>Preview</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full text-sm border-dashed h-10">
            <Plus className="h-4 w-4 mr-2 text-[#2B7A78]"/> Add Document
          </Button>
        </div>
      ),
      payroll: (
        <div className="space-y-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salary Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Salary Structure</Label>
              <Select defaultValue="standard"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="standard">Standard — Trainer Grade A</SelectItem><SelectItem value="senior">Senior Trainer Grade B</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Pay Frequency</Label>
              <Select defaultValue="monthly"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Basic Salary (AED)</Label><Input type="number" placeholder="8000" className="h-9 text-sm"/></div>
            <div className="space-y-1"><Label className="text-xs">Currency</Label><Input value="AED" readOnly className="h-9 text-sm bg-muted/30"/></div>
            <div className="space-y-1"><Label className="text-xs">Effective From</Label><Input type="date" defaultValue="2026-10-01" className="h-9 text-sm"/></div>
            <div className="space-y-1"><Label className="text-xs">Payment Method</Label>
              <Select defaultValue="bank"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Bank Name</Label><Input placeholder="Emirates NBD" className="h-9 text-sm"/></div>
            <div className="space-y-1"><Label className="text-xs">Account / IBAN</Label><Input placeholder="AE07 0331 2345 6789 0123 456" className="h-9 text-sm"/></div>
          </div>
          <Separator/>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allowances</p>
          <div className="space-y-2">
            {[['Housing Allowance','2000'],['Food Allowance','500'],['Transport Allowance','500'],['Communication Allowance','200']].map(([l,def])=>(
              <div key={l} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/10">
                <span className="text-sm flex-1">{l}</span>
                <div className="flex items-center gap-2">
                  <Select defaultValue="fixed"><SelectTrigger className="h-7 w-24 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="pct">% of Basic</SelectItem></SelectContent>
                  </Select>
                  <Input type="number" defaultValue={def} className="h-7 w-24 text-xs"/>
                  <span className="text-xs text-muted-foreground">AED</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs h-8 border-dashed"><Plus className="h-3.5 w-3.5 mr-1"/>Add Allowance</Button>
          </div>
          <Separator/>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salary Preview</p>
          <div className="p-4 rounded-xl border border-[#2B7A7830]" style={{backgroundColor:'#2B7A7808'}}>
            {[['Basic Salary','AED 8,000'],['Total Allowances','AED 3,200'],['Gross Salary','AED 11,200'],['Estimated Net (before var.)','AED 11,200']].map(([l,v],i)=>(
              <div key={l} className={`flex justify-between py-1.5 text-sm ${i===3?'font-bold border-t border-[#2B7A7830] mt-1 pt-2':''}`}>
                <span className="text-muted-foreground">{l}</span><span style={i===3?{color:'#2B7A78'}:{}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      shifts: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Assigned Shift</Label>
              <Select defaultValue="morning"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning Shift (06:00–14:00)</SelectItem>
                  <SelectItem value="afternoon">Afternoon Shift (14:00–22:00)</SelectItem>
                  <SelectItem value="evening">Evening Shift (16:00–24:00)</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Expected Daily Hours</Label><Input type="number" defaultValue="8" className="h-9 text-sm"/></div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Work Days</Label>
            <div className="flex gap-2 flex-wrap">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>(
                <label key={d} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium ${i<5?'border-[#2B7A78] bg-[#2B7A7815] text-[#2B7A78]':'border-border text-muted-foreground'}`}>
                  <input type="checkbox" defaultChecked={i<5} className="hidden"/>{d}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:'Break Policy', opts:['1 hour break (13:00-14:00)','30 min break','No break','Flexible break']},
              {label:'Grace Period', opts:['5 minutes','10 minutes','15 minutes','No grace']},
              {label:'Overtime Eligibility', opts:['Eligible','Not Eligible','Manager Approval']},
              {label:'Overtime Policy', opts:['1.25x after 8hrs','1.5x weekends','Fixed rate']},
              {label:'Holiday Calendar', opts:['UAE National Calendar','Custom']},
            ].map(f=>(
              <div key={f.label} className="space-y-1"><Label className="text-xs">{f.label}</Label>
                <Select defaultValue={f.opts[0]}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1"><Label className="text-xs">Effective From</Label><Input type="date" defaultValue="2026-10-01" className="h-9 text-sm"/></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#2B7A78] cursor-pointer hover:underline" onClick={()=>onNavigate?.('shifts-schedules')}>
            <ExternalLink className="h-3.5 w-3.5"/>Manage all Shifts & Schedules
          </div>
        </div>
      ),
      leave: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:'Leave Policy', opts:['Standard UAE Policy','Trainer Policy','Management Policy']},
              {label:'Leave Approval Manager', opts:['Mohammed Hassan','Ahmed Al-Rashid']},
              {label:'Annual Leave', opts:['30 days','24 days','20 days','Custom']},
              {label:'Sick Leave', opts:['15 days','10 days','As per UAE law']},
              {label:'Accrual Method', opts:['Monthly Accrual','Upfront','Custom']},
              {label:'Carry Forward', opts:['Up to 15 days','No carry forward','All unused']},
            ].map(f=>(
              <div key={f.label} className="space-y-1"><Label className="text-xs">{f.label}</Label>
                <Select defaultValue={f.opts[0]}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"/>
            Leave entitlements are calculated from the Joining Date. Any changes to leave policy take effect from the next payroll cycle.
          </div>
        </div>
      ),
      emergency: (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Emergency contacts are used in case of workplace incidents. At least one contact is required.</p>
          {[1,2].map(n=>(
            <div key={n} className="p-4 rounded-xl border border-border/40 space-y-3">
              <p className="text-sm font-medium text-foreground">Contact #{n}</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Full Name','e.g. Ali Hassan'],['Relationship','e.g. Brother'],['Phone Number','+971 XX XXX XXXX'],['Email','Optional']].map(([l,p])=>(
                  <div key={l} className="space-y-0.5"><Label className="text-xs">{l}</Label><Input placeholder={p} className="h-8 text-sm"/></div>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" className="text-xs border-dashed w-full h-8"><Plus className="h-3.5 w-3.5 mr-1"/>Add Another Contact</Button>
        </div>
      ),
      additional: (
        <div className="space-y-5">
          <div className="space-y-1"><Label className="text-xs">Skills / Specialization</Label>
            <Input placeholder="e.g. Weight Loss, HIIT, Yoga, Martial Arts" className="h-9 text-sm"/>
          </div>
          <div className="space-y-1"><Label className="text-xs">Trainer Certifications</Label>
            <Input placeholder="e.g. NASM-CPT, ACSM, First Aid CPR" className="h-9 text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Profile Status</Label>
              <Select defaultValue="active"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">System Login Access</Label>
              <Select defaultValue="yes"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes — Staff Portal</SelectItem><SelectItem value="no">No Access</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Internal Notes</Label>
            <Textarea placeholder="Internal remarks, onboarding notes, manager comments..." rows={3} className="text-sm resize-none"/>
          </div>
        </div>
      ),
    };

    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Form Header */}
        <div className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('list')}>
              <ArrowDownRight className="h-4 w-4 rotate-[135deg] mr-1"/>Back
            </Button>
            <Separator orientation="vertical" className="h-5"/>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Payroll & Employees</span><ChevronRight className="h-3 w-3"/>
              <span>Staffs & Trainers</span><ChevronRight className="h-3 w-3"/>
              <span className="text-foreground font-medium">{isEdit ? 'Edit Employee' : 'Add Employee'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground border rounded px-2 py-1">ID: {genEmpId()}</div>
            <Select defaultValue="active">
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="probation">Probation</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs h-8">Save as Draft</Button>
            <Button size="sm" className="text-xs h-8 text-white" style={{backgroundColor:'#2B7A78'}} onClick={()=>{setView('list');}}>
              <Save className="h-3.5 w-3.5 mr-1"/>Save Employee
            </Button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex flex-1">
          {/* Left section navigator */}
          <div className="w-56 border-r bg-muted/10 p-3 space-y-0.5 flex-shrink-0">
            {EMP_SECTIONS.map((s,i) => (
              <button key={s.id} onClick={() => setEmpFormTab(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${empFormTab===s.id ? 'bg-[#2B7A78] text-white font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <span className={empFormTab===s.id?'text-white':'text-[#2B7A78]'}>{s.icon}</span>
                {s.label}
              </button>
            ))}
            <div className="pt-3 px-3 text-[10px] text-muted-foreground">
              {EMP_SECTIONS.findIndex(s=>s.id===empFormTab)+1} of {EMP_SECTIONS.length}
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold mb-4">{EMP_SECTIONS.find(s=>s.id===empFormTab)?.label}</h2>
              {sectionContent[empFormTab]}
              {/* Navigation buttons */}
              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button variant="outline" size="sm"
                  onClick={() => {
                    const i = EMP_SECTIONS.findIndex(s=>s.id===empFormTab);
                    if (i > 0) setEmpFormTab(EMP_SECTIONS[i-1].id);
                  }}
                  disabled={empFormTab === EMP_SECTIONS[0].id}>
                  ← Previous
                </Button>
                <Button size="sm" style={{backgroundColor:'#2B7A78'}} className="text-white"
                  onClick={() => {
                    const i = EMP_SECTIONS.findIndex(s=>s.id===empFormTab);
                    if (i < EMP_SECTIONS.length-1) setEmpFormTab(EMP_SECTIONS[i+1].id);
                    else setView('list');
                  }}>
                  {empFormTab === EMP_SECTIONS[EMP_SECTIONS.length-1].id ? 'Save Employee' : 'Next →'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (view === 'addEmployee' || view === 'editEmployee') return renderEmpForm();

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>Payroll & Employees</span>
        <span>/</span>
        <span className="font-medium text-gray-900">Staffs & Trainers</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staffs & Trainers</h1>
          <p className="text-gray-600 mt-1">
            Manage employee profiles, performance, targets, and commissions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Employees
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
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
          <Button onClick={() => { setEmpFormTab('personal'); setView('addEmployee'); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Key Metrics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold">{totalStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Certified Trainers</p>
                <p className="text-2xl font-bold">{trainersWithCerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Target Achievement</p>
                <p className="text-2xl font-bold">{avgTargetAchievement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Certifications</p>
                <p className="text-2xl font-bold">{pendingCertifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-sm font-bold truncate">{topPerformer.name}</p>
                <p className="text-xs text-gray-500">{topPerformer.targetPercentage}% Target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
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
                <SelectItem value="trainer">Trainers</SelectItem>
                <SelectItem value="reception">Reception</SelectItem>
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
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Button
                variant={activeTab === 'all-staff' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('all-staff')}
              >
                <Users className="h-4 w-4 mr-2" />
                All Staff ({staffData.length})
              </Button>
              <Button
                variant={activeTab === 'trainers' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('trainers')}
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Trainers ({staffData.filter(s => s.role.toLowerCase().includes('trainer')).length})
              </Button>
              <Button
                variant={activeTab === 'sales-reception' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('sales-reception')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Sales & Reception ({staffData.filter(s => s.role.toLowerCase().includes('reception')).length})
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {currentStaff.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.avatar} />
                              <AvatarFallback>
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-gray-600">{employee.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.role}</div>
                            <div className="text-sm text-gray-600">{employee.department}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{employee.branch}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{employee.targetPercentage}%</span>
                              <Badge className={`text-xs ${getTargetColor(employee.targetPercentage)}`}>
                                {employee.targetAchieved.toLocaleString()} AED
                              </Badge>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getTargetProgressColor(employee.targetPercentage)}`}
                                style={{ width: `${Math.min(employee.targetPercentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Target: {employee.monthlyTarget.toLocaleString()} AED
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{employee.commissionEarned.toLocaleString()} AED</span>
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
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                View Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Target className="h-4 w-4 mr-2" />
                                Set Target
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
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
                    <AvatarImage src={selectedEmployee.avatar} />
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
                          <div className="text-sm font-medium">{selectedEmployee.id}</div>
                        </div>
                        <div>
                          <Label>Join Date</Label>
                          <div className="text-sm">{new Date(selectedEmployee.joinDate).toLocaleDateString()}</div>
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
                          {selectedEmployee.certifications.map((cert: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              <Award className="h-3 w-3 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-base">Specializations</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedEmployee.specializations.map((spec: string, index: number) => (
                            <Badge key={index} variant="outline">
                              <Star className="h-3 w-3 mr-1" />
                              {spec}
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
                        {Object.entries(selectedEmployee.schedule).map(([day, time]) => (
                          <div key={day} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium capitalize">{day}</div>
                            <div className="text-sm text-gray-600">{time}</div>
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
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Client Retention</span>
                            <span className="font-medium">{selectedEmployee.performance.clientRetention}%</span>
                          </div>
                          <Progress value={selectedEmployee.performance.clientRetention} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Session Rating</span>
                            <span className="font-medium">{selectedEmployee.performance.sessionRating}/5.0</span>
                          </div>
                          <Progress value={selectedEmployee.performance.sessionRating * 20} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Punctuality</span>
                            <span className="font-medium">{selectedEmployee.performance.punctuality}%</span>
                          </div>
                          <Progress value={selectedEmployee.performance.punctuality} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Sales Conversion</span>
                            <span className="font-medium">{selectedEmployee.performance.salesConversion}%</span>
                          </div>
                          <Progress value={selectedEmployee.performance.salesConversion} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Monthly Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{selectedEmployee.monthlyStats.sessionsCompleted}</div>
                            <div className="text-sm text-gray-600">Sessions Completed</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{selectedEmployee.monthlyStats.newClients}</div>
                            <div className="text-sm text-gray-600">New Clients</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{selectedEmployee.monthlyStats.revenue.toLocaleString()} AED</div>
                            <div className="text-sm text-gray-600">Revenue Generated</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-lg font-bold text-yellow-600">{selectedEmployee.monthlyStats.commissions.toLocaleString()} AED</div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee profile with basic information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input placeholder="Enter full name" />
              </div>
              <div>
                <Label>Employee ID</Label>
                <Input placeholder="EMP001" />
              </div>
              <div>
                <Label>Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainer">Fitness Trainer</SelectItem>
                    <SelectItem value="senior-trainer">Senior Trainer</SelectItem>
                    <SelectItem value="reception">Reception Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal-training">Personal Training</SelectItem>
                    <SelectItem value="group-classes">Group Classes</SelectItem>
                    <SelectItem value="customer-service">Customer Service</SelectItem>
                    <SelectItem value="specialized-training">Specialized Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="downtown">Downtown Dubai</SelectItem>
                    <SelectItem value="marina">Marina Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monthly Target (AED)</Label>
                <Input type="number" placeholder="25000" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input placeholder="+971 50 123 4567" />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="employee@gymbios.com" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea placeholder="Enter address" rows={2} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddEmployee(false)}>
              Create Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Target & Commission Settings Modal */}
      <Dialog open={showTargetSettings} onOpenChange={setShowTargetSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Target & Commission Settings</DialogTitle>
            <DialogDescription>
              Configure monthly targets and commission rules for different roles
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="targets" className="mt-6">
            <TabsList>
              <TabsTrigger value="targets">Monthly Targets</TabsTrigger>
              <TabsTrigger value="commissions">Commission Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Set Monthly Targets by Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Senior Trainer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Revenue Target (AED)</Label>
                            <Input type="number" defaultValue="50000" />
                          </div>
                          <div>
                            <Label>Sessions Target</Label>
                            <Input type="number" defaultValue="120" />
                          </div>
                          <div>
                            <Label>New Clients Target</Label>
                            <Input type="number" defaultValue="8" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Fitness Trainer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Revenue Target (AED)</Label>
                            <Input type="number" defaultValue="35000" />
                          </div>
                          <div>
                            <Label>Sessions Target</Label>
                            <Input type="number" defaultValue="90" />
                          </div>
                          <div>
                            <Label>New Clients Target</Label>
                            <Input type="number" defaultValue="5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Reception Manager</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Sales Target (AED)</Label>
                            <Input type="number" defaultValue="25000" />
                          </div>
                          <div>
                            <Label>Memberships Sold</Label>
                            <Input type="number" defaultValue="15" />
                          </div>
                          <div>
                            <Label>Customer Satisfaction</Label>
                            <Input type="number" defaultValue="95" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {commissionRules.map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-lg mb-4">{rule.role}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label>Base Commission (%)</Label>
                            <Input type="number" defaultValue={rule.baseCommission} step="0.1" />
                            <p className="text-xs text-gray-500 mt-1">
                              Base percentage of revenue generated
                            </p>
                          </div>
                          <div>
                            <Label>Target Achievement Bonuses</Label>
                            <div className="space-y-2 mt-2">
                              {rule.targetBonus.map((bonus, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Input 
                                    type="number" 
                                    defaultValue={bonus.threshold} 
                                    className="w-20"
                                    placeholder="100"
                                  />
                                  <span className="text-sm">% Target = +</span>
                                  <Input 
                                    type="number" 
                                    defaultValue={bonus.bonus} 
                                    className="w-20"
                                    step="0.1"
                                  />
                                  <span className="text-sm">% Bonus</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowTargetSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowTargetSettings(false)}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}