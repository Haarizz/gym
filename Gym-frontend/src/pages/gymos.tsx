import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SetTargets } from "./set-targets";
import { TargetsOverview } from "./targets-overview";
import { 
  Cog,
  Folder,
  Shield,
  Plug,
  Smartphone,
  Database,
  Bell,
  Monitor,
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Activity,
  Wifi,
  WifiOff,
  Server,
  Eye,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Power,
  PowerOff,
  BarChart3,
  Calendar,
  MapPin,
  Zap,
  Globe,
  Lock,
  Unlock,
  Camera,
  CreditCard,
  UserCheck,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  BookOpen,
  ShoppingCart,
  Calculator,
  CheckSquare,
  Square,
  ChefHat,
  Star,
  Target,
  Gauge,
  Crosshair,
  TrendingUpDown
} from 'lucide-react';

// Sample data for KPIs
const kpiData = {
  modulesActiveTotal: { active: 8, total: 12 },
  usersWithPermissions: 45,
  apiIntegrationsActive: 6,
  accessControlDevicesOnline: 18,
  pendingNotifications: 3
};

// Sample data for modules
const moduleStatus = [
  { module: 'Community Management', status: 'active', uptime: 99.8, lastUpdate: '2024-09-20' },
  { module: 'Member Connect', status: 'active', uptime: 98.5, lastUpdate: '2024-09-18' },
  { module: 'Sales & Purchases', status: 'active', uptime: 99.2, lastUpdate: '2024-09-15' },
  { module: 'Financials', status: 'active', uptime: 97.8, lastUpdate: '2024-09-22' },
  { module: 'Payroll & Employees', status: 'active', uptime: 99.5, lastUpdate: '2024-09-19' },
  { module: 'Assets Management', status: 'active', uptime: 98.9, lastUpdate: '2024-09-21' },
  { module: 'BiOS Analytics', status: 'maintenance', uptime: 95.2, lastUpdate: '2024-09-10' },
  { module: 'Advanced Reports', status: 'active', uptime: 99.1, lastUpdate: '2024-09-16' }
];

const apiIntegrations = [
  { name: 'Payment Gateway (Stripe)', status: 'active', lastCall: '2024-09-25 14:32', successRate: 99.7 },
  { name: 'SMS Service (Twilio)', status: 'active', lastCall: '2024-09-25 14:30', successRate: 98.9 },
  { name: 'Email Service (SendGrid)', status: 'active', lastCall: '2024-09-25 14:28', successRate: 99.2 },
  { name: 'Face Recognition API', status: 'active', lastCall: '2024-09-25 14:25', successRate: 97.8 },
  { name: 'Equipment IoT Platform', status: 'error', lastCall: '2024-09-25 12:15', successRate: 85.3 },
  { name: 'Backup Service (AWS)', status: 'active', lastCall: '2024-09-25 14:00', successRate: 99.9 }
];

const accessControlDevices = [
  { id: 'AC001', name: 'Main Entrance - Face Scanner', type: 'Face Recognition', location: 'Main Entrance', status: 'online', lastSync: '2024-09-25 14:30' },
  { id: 'AC002', name: 'Gym Floor - Card Reader', type: 'NFC/Card Reader', location: 'Gym Floor', status: 'online', lastSync: '2024-09-25 14:29' },
  { id: 'AC003', name: 'Locker Room A - QR Scanner', type: 'QR Scanner', location: 'Locker Room A', status: 'online', lastSync: '2024-09-25 14:28' },
  { id: 'AC004', name: 'VIP Area - Biometric', type: 'Fingerprint', location: 'VIP Area', status: 'offline', lastSync: '2024-09-25 12:45' },
  { id: 'AC005', name: 'Staff Area - Keypad', type: 'PIN Entry', location: 'Staff Area', status: 'online', lastSync: '2024-09-25 14:31' }
];

const systemConfiguration = [
  { setting: 'Database Backup Schedule', value: 'Daily at 2:00 AM', lastChanged: '2024-09-01', changedBy: 'System Admin' },
  { setting: 'Session Timeout', value: '30 minutes', lastChanged: '2024-08-15', changedBy: 'IT Manager' },
  { setting: 'API Rate Limiting', value: '1000 req/hour', lastChanged: '2024-09-10', changedBy: 'Dev Team' },
  { setting: 'Auto-logout Inactive Users', value: '60 minutes', lastChanged: '2024-08-20', changedBy: 'Security Admin' },
  { setting: 'Data Retention Period', value: '7 years', lastChanged: '2024-07-01', changedBy: 'Compliance Officer' }
];

const recentActivity = [
  {
    id: 1,
    timestamp: '2024-09-25 14:32:15',
    activity: 'API Integration Updated',
    details: 'Payment Gateway configuration updated',
    user: 'System Admin',
    type: 'Configuration',
    status: 'Success'
  },
  {
    id: 2,
    timestamp: '2024-09-25 14:15:22',
    activity: 'Device Offline Alert',
    details: 'VIP Area Biometric scanner lost connection',
    user: 'System Monitor',
    type: 'Alert',
    status: 'Warning'
  },
  {
    id: 3,
    timestamp: '2024-09-25 13:45:33',
    activity: 'User Permission Changed',
    details: 'Added admin permissions for trainer@gym.com',
    user: 'HR Manager',
    type: 'Security',
    status: 'Success'
  },
  {
    id: 4,
    timestamp: '2024-09-25 12:30:18',
    activity: 'Module Status Changed',
    details: 'BiOS Analytics module set to maintenance mode',
    user: 'IT Manager',
    type: 'Maintenance',
    status: 'Warning'
  },
  {
    id: 5,
    timestamp: '2024-09-25 11:20:45',
    activity: 'Backup Completed',
    details: 'Daily database backup completed successfully',
    user: 'System',
    type: 'Backup',
    status: 'Success'
  }
];

const pendingNotifications = [
  {
    id: 1,
    title: 'Device Maintenance Required',
    description: 'VIP Area Biometric scanner needs calibration',
    priority: 'High',
    created: '2024-09-25 12:45',
    type: 'Device Alert'
  },
  {
    id: 2,
    title: 'API Rate Limit Warning',
    description: 'Equipment IoT Platform approaching rate limit (85%)',
    priority: 'Medium',
    created: '2024-09-25 10:30',
    type: 'API Alert'
  },
  {
    id: 3,
    title: 'Security Update Available',
    description: 'New security patch available for Access Control System',
    priority: 'Medium',
    created: '2024-09-24 16:20',
    type: 'Security Update'
  }
];

const userRoleStats = [
  { role: 'Super Admin', count: 2, permissions: 'Full Access' },
  { role: 'Gym Manager', count: 3, permissions: 'Management Access' },
  { role: 'Front Desk Staff', count: 8, permissions: 'Member Management' },
  { role: 'Trainers', count: 18, permissions: 'Class & Training Access' },
  { role: 'Maintenance Staff', count: 6, permissions: 'Equipment Access' },
  { role: 'Accountant', count: 2, permissions: 'Financial Access' },
  { role: 'IT Support', count: 3, permissions: 'System Configuration' },
  { role: 'Marketing', count: 3, permissions: 'Campaign Management' }
];

// Sample data for Plans & Services Catalog Configuration
const catalogOptions = [
  {
    id: 'membership-plans',
    title: 'Membership Plans & Pricing',
    description: 'Display gym membership packages and pricing tiers',
    enabled: true,
    count: 8
  },
  {
    id: 'training-streams',
    title: 'Training Streams',
    description: 'Show available training programs and specialties',
    enabled: true,
    count: 12
  },
  {
    id: 'classes',
    title: 'Classes',
    description: 'List group fitness classes and schedules',
    enabled: false,
    count: 24
  }
];

// Sample data for User Roles and POS assignments
const userRoles = [
  { id: 1, name: 'Front Desk', users: 8, posMode: 'Retail POS' },
  { id: 2, name: 'Trainers', users: 15, posMode: 'F&B POS' },
  { id: 3, name: 'Managers', users: 3, posMode: 'Retail POS' },
  { id: 4, name: 'Cashiers', users: 5, posMode: 'Retail POS' },
  { id: 5, name: 'Admin', users: 2, posMode: 'Retail POS' }
];

interface GymOSProps {
  onNavigate?: (section: string) => void;
}

export function GymOS({ onNavigate }: GymOSProps = {}) {
  const [catalogSettings, setCatalogSettings] = useState(catalogOptions);
  const [roleAssignments, setRoleAssignments] = useState(userRoles);
  const [showCatalogConfig, setShowCatalogConfig] = useState(false);
  const [showPOSConfig, setShowPOSConfig] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
      case 'Success': return 'bg-green-100 text-green-800';
      case 'maintenance':
      case 'Warning': return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'offline':
      case 'Error': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Face Recognition': return <Camera className="h-4 w-4" />;
      case 'NFC/Card Reader': return <CreditCard className="h-4 w-4" />;
      case 'QR Scanner': return <Monitor className="h-4 w-4" />;
      case 'Fingerprint': return <UserCheck className="h-4 w-4" />;
      case 'PIN Entry': return <Lock className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const toggleCatalogOption = (id: string) => {
    setCatalogSettings(prev => 
      prev.map(option => 
        option.id === id ? { ...option, enabled: !option.enabled } : option
      )
    );
  };

  const updateRolePOSMode = (roleId: number, posMode: string) => {
    setRoleAssignments(prev =>
      prev.map(role =>
        role.id === roleId ? { ...role, posMode } : role
      )
    );
  };

  const getTotalUsers = () => roleAssignments.reduce((sum, role) => sum + role.users, 0);
  const getRetailPOSCount = () => roleAssignments.filter(role => role.posMode === 'Retail POS').reduce((sum, role) => sum + role.users, 0);
  const getFnBPOSCount = () => roleAssignments.filter(role => role.posMode === 'F&B POS').reduce((sum, role) => sum + role.users, 0);
  
  const getEnabledCatalogCount = () => catalogSettings.filter(option => option.enabled).length;
  const getTotalCatalogItems = () => catalogSettings.reduce((sum, option) => sum + option.count, 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GymOS</h1>
          <p className="text-gray-600 mt-1">
            Business Operating System - System Configuration & Management for {getCurrentPeriod()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="pos-mode">POS Mode</TabsTrigger>
          <TabsTrigger value="performance-metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-6">

      {/* NEW: Configuration Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Plans & Services Catalog Configuration Card */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Plans & Services Catalog Configuration</CardTitle>
                  <CardDescription>
                    Control what information is shown in the walk-in inquiry view
                  </CardDescription>
                </div>
              </div>
              <Dialog open={showCatalogConfig} onOpenChange={setShowCatalogConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Configure</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Plans & Services Catalog Configuration</DialogTitle>
                    <DialogDescription>
                      Select which sections will be displayed in the Plans & Services Catalog for walk-in inquiries.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {catalogSettings.map((option) => (
                      <div key={option.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCatalogOption(option.id)}
                            className="p-0 h-auto"
                          >
                            {option.enabled ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{option.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {option.count} items
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCatalogConfig(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowCatalogConfig(false)}>
                      Save Configuration
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Active Sections</p>
                    <p className="text-2xl font-bold text-blue-700">{getEnabledCatalogCount()}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Total Items</p>
                    <p className="text-2xl font-bold text-green-700">{getTotalCatalogItems()}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded">
                    <Star className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Configuration Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Currently Displayed:</h4>
              {catalogSettings.filter(option => option.enabled).map((option) => (
                <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{option.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {option.count}
                  </Badge>
                </div>
              ))}
              {catalogSettings.filter(option => !option.enabled).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  + {catalogSettings.filter(option => !option.enabled).length} hidden section(s)
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* POS Mode Options Card */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calculator className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>POS Mode Options</CardTitle>
                  <CardDescription>
                    Assign POS access type to user roles
                  </CardDescription>
                </div>
              </div>
              <Dialog open={showPOSConfig} onOpenChange={setShowPOSConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Manage</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>POS Mode Role Assignment</DialogTitle>
                    <DialogDescription>
                      Configure which POS mode each user role can access. Each role must be assigned to either Retail POS or F&B POS.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role Name</TableHead>
                          <TableHead>User Count</TableHead>
                          <TableHead>Assigned POS Mode</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roleAssignments.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{role.users} users</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={role.posMode}
                                onValueChange={(value) => updateRolePOSMode(role.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Retail POS">
                                    <div className="flex items-center space-x-2">
                                      <ShoppingCart className="h-4 w-4" />
                                      <span>Retail POS</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="F&B POS">
                                    <div className="flex items-center space-x-2">
                                      <ChefHat className="h-4 w-4" />
                                      <span>F&B POS</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Save</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPOSConfig(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowPOSConfig(false)}>
                      Save All Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Panel */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm text-purple-600">Total Roles</p>
                <p className="text-2xl font-bold text-purple-700">{roleAssignments.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-green-600">Retail POS</p>
                <p className="text-2xl font-bold text-green-700">{getRetailPOSCount()}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-orange-600">F&B POS</p>
                <p className="text-2xl font-bold text-orange-700">{getFnBPOSCount()}</p>
              </div>
            </div>

            {/* Role Assignment Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Current Assignments:</h4>
              <div className="space-y-2">
                {roleAssignments.slice(0, 3).map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{role.name}</span>
                      <Badge variant="secondary" className="text-xs">{role.users}</Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      {role.posMode === 'Retail POS' ? (
                        <ShoppingCart className="h-3 w-3 text-green-600" />
                      ) : (
                        <ChefHat className="h-3 w-3 text-orange-600" />
                      )}
                      <span className="text-xs">{role.posMode}</span>
                    </div>
                  </div>
                ))}
                {roleAssignments.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    + {roleAssignments.length - 3} more role(s)
                  </div>
                )}
              </div>
            </div>

            {/* Validation Status */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">All roles properly assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Modules Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {kpiData.modulesActiveTotal.active} / {kpiData.modulesActiveTotal.total}
                </p>
                <div className="flex items-center mt-2">
                  <Progress 
                    value={(kpiData.modulesActiveTotal.active / kpiData.modulesActiveTotal.total) * 100} 
                    className="w-16 h-2 mr-2"
                  />
                  <span className="text-sm text-blue-600">
                    {Math.round((kpiData.modulesActiveTotal.active / kpiData.modulesActiveTotal.total) * 100)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Folder className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Users with Permissions</p>
                <p className="text-2xl font-bold text-green-600">
                  {kpiData.usersWithPermissions}
                </p>
                <div className="flex items-center mt-2">
                  <Shield className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">Across 8 roles</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Integrations Active</p>
                <p className="text-2xl font-bold text-purple-600">
                  {kpiData.apiIntegrationsActive}
                </p>
                <div className="flex items-center mt-2">
                  <Plug className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">1 with errors</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Devices Online</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {kpiData.accessControlDevicesOnline}
                </p>
                <div className="flex items-center mt-2">
                  <Wifi className="h-4 w-4 text-cyan-500 mr-1" />
                  <span className="text-sm text-cyan-600">1 offline</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-100 rounded-lg">
                <Smartphone className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Notifications</p>
                <p className="text-2xl font-bold text-orange-600">
                  {kpiData.pendingNotifications}
                </p>
                <div className="flex items-center mt-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Requires attention</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Head Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module Management */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Folder className="h-5 w-5 text-blue-600" />
                <CardTitle>Module Management</CardTitle>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Modules Installed</span>
                <span className="font-semibold">{kpiData.modulesActiveTotal.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Currently Active</span>
                <Badge className="bg-green-100 text-green-800">{kpiData.modulesActiveTotal.active}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Under Maintenance</span>
                <Badge className="bg-yellow-100 text-yellow-800">1</Badge>
              </div>
              <Progress value={95} className="h-2" />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Module
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Roles & Permissions */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <CardTitle>User Roles & Permissions</CardTitle>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Roles</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Users with Admin Role</span>
                <Badge className="bg-red-100 text-red-800">5</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <Badge className="bg-green-100 text-green-800">{kpiData.usersWithPermissions}</Badge>
              </div>
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Trainers</span>
                  <span>18</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Front Desk</span>
                  <span>8</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Role
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Integration */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plug className="h-5 w-5 text-purple-600" />
                <CardTitle>API Integration</CardTitle>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Connected APIs</span>
                <span className="font-semibold">{kpiData.apiIntegrationsActive}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Health Status</span>
                <Badge className="bg-yellow-100 text-yellow-800">1 Error</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-semibold text-green-600">97.8%</span>
              </div>
              <Progress value={97.8} className="h-2" />
              <div className="text-xs text-gray-500">Last sync: 2 minutes ago</div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add API
                </Button>
                <Button variant="ghost" size="sm">
                  <Activity className="h-4 w-4 mr-1" />
                  Monitor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Control Devices */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-cyan-600" />
                <CardTitle>Access Control Devices</CardTitle>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Devices</span>
                <span className="font-semibold">19</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Online</span>
                <Badge className="bg-green-100 text-green-800">{kpiData.accessControlDevicesOnline}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Offline</span>
                <Badge className="bg-red-100 text-red-800">1</Badge>
              </div>
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Face Scanners</span>
                  <span>8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Card Readers</span>
                  <span>11</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Device
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-gray-600" />
                <CardTitle>System Configuration</CardTitle>
              </div>
              <Button variant="outline" size="sm">Settings</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Config Changes</span>
                <span className="font-semibold">12 this month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm">2 hours ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Backup Status</span>
                <Badge className="bg-green-100 text-green-800">Completed</Badge>
              </div>
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Session Timeout</span>
                  <span>30 min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Auto-logout</span>
                  <span>60 min</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Backup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <Badge className="bg-orange-100 text-orange-800">{kpiData.pendingNotifications}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unread Today</span>
                <span className="font-semibold">7</span>
              </div>
              <div className="space-y-2 pt-2">
                <div className="text-sm p-2 bg-red-50 rounded">
                  <div className="font-medium text-red-800">Device Offline</div>
                  <div className="text-red-600 text-xs">VIP Area scanner</div>
                </div>
                <div className="text-sm p-2 bg-yellow-50 rounded">
                  <div className="font-medium text-yellow-800">API Rate Limit</div>
                  <div className="text-yellow-600 text-xs">Equipment IoT (85%)</div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Tabbed Tables */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="modules">Module Status</TabsTrigger>
          <TabsTrigger value="apis">API Health</TabsTrigger>
          <TabsTrigger value="devices">Device Status</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Recent Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Recent System Activity</span>
                  </CardTitle>
                  <CardDescription>Latest system changes and alerts</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm">{activity.timestamp}</TableCell>
                      <TableCell className="font-medium">{activity.activity}</TableCell>
                      <TableCell className="text-sm text-gray-600">{activity.details}</TableCell>
                      <TableCell>{activity.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Status */}
        <TabsContent value="modules" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Folder className="h-5 w-5 text-blue-600" />
                    <span>Module Status & Performance</span>
                  </CardTitle>
                  <CardDescription>Real-time status of all system modules</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Module Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleStatus.map((module, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{module.module}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(module.status)}>
                          {module.status === 'active' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Maintenance</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={module.uptime} className="w-16 h-2" />
                          <span className="text-sm">{module.uptime}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(module.lastUpdate).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {module.status === 'active' ? (
                            <Button variant="ghost" size="sm">
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Health */}
        <TabsContent value="apis" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Plug className="h-5 w-5 text-purple-600" />
                    <span>API Integration Health</span>
                  </CardTitle>
                  <CardDescription>Performance and status of all API connections</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Call</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiIntegrations.map((api, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{api.name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(api.status)}>
                          {api.status === 'active' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Error</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{api.lastCall}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={api.successRate} className="w-16 h-2" />
                          <span className="text-sm">{api.successRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Status */}
        <TabsContent value="devices" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-cyan-600" />
                    <span>Access Control Device Status</span>
                  </CardTitle>
                  <CardDescription>Real-time status of all access control devices</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessControlDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device.type)}
                          <span>{device.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{device.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(device.status)}>
                          {device.status === 'online' ? (
                            <><Wifi className="h-3 w-3 mr-1" /> Online</>
                          ) : (
                            <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{device.lastSync}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    <span>System Notifications</span>
                  </CardTitle>
                  <CardDescription>Important alerts and system notifications</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="text-sm text-gray-600">{notification.description}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{notification.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{notification.created}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>

        {/* POS Mode Tab */}
        <TabsContent value="pos-mode" className="space-y-6">
          <div className="p-6 text-center bg-white border-0 shadow-sm rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">POS Mode</h3>
              <p className="text-muted-foreground mb-6">
                Access Point of Sale functionality for retail and F&B operations.
              </p>
              <Button onClick={() => onNavigate?.('pos-mode')} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Launch POS Mode
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance-metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Targets Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Set Targets</CardTitle>
                      <CardDescription>
                        Configure staff revenue and unit-based targets
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => onNavigate?.('set-targets')}>
                    <Target className="h-4 w-4 mr-2" />
                    Configure Targets
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Active Targets</p>
                        <p className="text-2xl font-bold text-blue-700">5</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Manage individual staff and institution-wide performance targets.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targets Overview Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Gauge className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Targets Overview</CardTitle>
                      <CardDescription>
                        Monitor staff performance and target achievement
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => onNavigate?.('targets-overview')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Overall Progress</p>
                        <p className="text-2xl font-bold text-green-700">76.8%</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Real-time performance tracking and analytics dashboard.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Overview of current staff performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-600">Active Staff</p>
                  <p className="text-2xl font-bold text-blue-700">5</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-green-600">Targets Met</p>
                  <p className="text-2xl font-bold text-green-700">2</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <p className="text-sm text-yellow-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-700">3</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-purple-600">Total Commission</p>
                  <p className="text-2xl font-bold text-purple-700">AED 1,540</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Header Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>GymOS Configuration & Policies</CardTitle>
                    <CardDescription>
                      Manage system-wide operational policies and member management rules
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Transfer Policy Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Transfer Policy</CardTitle>
                      <CardDescription>
                        Configure rules for transferring memberships between members
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Allow Transfer Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Transfer</h4>
                    <p className="text-sm text-gray-600">Enable or disable membership transfer feature</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                  </div>
                </div>

                {/* Transfer Fee Policy */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Transfer Fee Policy</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">Fee Structure</label>
                      <Select defaultValue="flat">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Fee</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">Default Transfer Fee</label>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">AED</span>
                        <input
                          type="number"
                          defaultValue="100"
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Window */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Transfer Window</h4>
                  <p className="text-sm text-gray-600">
                    Restrict when transfers can be initiated after member joins
                  </p>
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Minimum Days After Joining</label>
                    <input
                      type="number"
                      placeholder="15"
                      defaultValue="15"
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g., Transfer allowed only after 15 days of joining</p>
                  </div>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Require Admin Approval</h4>
                    <p className="text-sm text-gray-600">All transfer requests need manager approval</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">Optional</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Deactivation Policy Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>Member Deactivation Policy</CardTitle>
                      <CardDescription>
                        Control conditions for membership deactivation and refunds
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Allow Deactivation Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Deactivation</h4>
                    <p className="text-sm text-gray-600">Global toggle for membership deactivation feature</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                </div>

                {/* Allow Refund Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Refund</h4>
                    <p className="text-sm text-gray-600">Enable refund processing during deactivation</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                </div>

                {/* Refund Method */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Refund Method</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Determines how refund amounts are calculated
                  </p>
                  <Select defaultValue="prorated">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="prorated">Pro-Rated (Days Remaining)</SelectItem>
                      <SelectItem value="none">No Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Pro-Rated:</strong> Refund = (Days Remaining / Total Days) × Amount Paid
                  </p>
                </div>

                {/* Approval Required */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Approval Required</h4>
                    <p className="text-sm text-gray-600">Require manager approval for deactivation</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Yes</Badge>
                </div>

                {/* Default Deactivation Reasons */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Default Deactivation Reasons</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Pre-defined reasons for reporting consistency
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="text-sm">Member Relocation</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="text-sm">Medical Reasons</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="text-sm">Financial Issues</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="text-sm">Dissatisfaction</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="text-sm">Other</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline">
                Reset to Defaults
              </Button>
              <Button className="btn-primary">
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

