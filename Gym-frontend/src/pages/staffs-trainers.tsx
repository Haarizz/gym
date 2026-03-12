import React, { useState, useEffect } from 'react';
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
          <Button onClick={() => setShowAddEmployee(true)}>
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

