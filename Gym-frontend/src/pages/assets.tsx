import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Building2,
  Plus,
  RefreshCcw,
  AlertTriangle,
  Wrench,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Activity,
  Settings,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Monitor,
  Sofa,
  Dumbbell,
  Car,
  Coffee,
  Laptop
} from 'lucide-react';

// Sample data for KPIs
const kpiData = {
  totalAssetValue: 2850000,
  assetsAddedThisMonth: 12,
  assetsRetiredDisposed: 3,
  pendingTransactions: 7,
  maintenanceRequired: 15
};

// Sample data for charts
const assetCategories = [
  { name: 'Gym Equipment', value: 1850000, count: 145, color: '#3b82f6' },
  { name: 'IT Equipment', value: 385000, count: 78, color: '#10b981' },
  { name: 'Furniture', value: 265000, count: 92, color: '#f59e0b' },
  { name: 'Vehicles', value: 180000, count: 8, color: '#ef4444' },
  { name: 'Office Equipment', value: 120000, count: 45, color: '#8b5cf6' },
  { name: 'Kitchen & Cafe', value: 50000, count: 23, color: '#06b6d4' }
];

const monthlyTransactions = [
  { month: 'Jan', added: 8, retired: 2, transferred: 5, maintenance: 12 },
  { month: 'Feb', added: 15, retired: 4, transferred: 8, maintenance: 18 },
  { month: 'Mar', added: 11, retired: 6, transferred: 3, maintenance: 15 },
  { month: 'Apr', added: 12, retired: 3, transferred: 7, maintenance: 15 },
  { month: 'May', added: 18, retired: 5, transferred: 12, maintenance: 22 },
  { month: 'Jun', added: 14, retired: 1, transferred: 9, maintenance: 19 }
];

// Sample data for tables
const recentAssetActivity = [
  {
    id: 1,
    assetName: 'Treadmill Pro X5',
    category: 'Gym Equipment',
    transactionType: 'Added',
    date: '2024-09-22',
    value: 12500,
    status: 'Active',
    location: 'Cardio Zone A'
  },
  {
    id: 2,
    assetName: 'Professional Dumbbell Set',
    category: 'Gym Equipment',
    transactionType: 'Maintenance',
    date: '2024-09-20',
    value: 3200,
    status: 'Under Maintenance',
    location: 'Weight Training Area'
  },
  {
    id: 3,
    assetName: 'Reception Desk Chair',
    category: 'Furniture',
    transactionType: 'Retired',
    date: '2024-09-18',
    value: 1200,
    status: 'Disposed',
    location: 'Front Desk'
  },
  {
    id: 4,
    assetName: 'MacBook Pro 16"',
    category: 'IT Equipment',
    transactionType: 'Added',
    date: '2024-09-15',
    value: 8500,
    status: 'Active',
    location: 'Admin Office'
  },
  {
    id: 5,
    assetName: 'Elliptical Machine Elite',
    category: 'Gym Equipment',
    transactionType: 'Transferred',
    date: '2024-09-12',
    value: 15000,
    status: 'Active',
    location: 'Cardio Zone B'
  }
];

const pendingTransactions = [
  {
    id: 1,
    assetName: 'Smith Machine Commercial',
    category: 'Gym Equipment',
    transactionType: 'Purchase Order',
    requestedDate: '2024-09-25',
    estimatedValue: 18500,
    status: 'Pending Approval',
    requestedBy: 'Equipment Manager'
  },
  {
    id: 2,
    assetName: 'Office Laptop Dell XPS',
    category: 'IT Equipment',
    transactionType: 'Transfer',
    requestedDate: '2024-09-24',
    estimatedValue: 4200,
    status: 'Pending Transfer',
    requestedBy: 'IT Manager'
  },
  {
    id: 3,
    assetName: 'Yoga Mat Set (50 units)',
    category: 'Gym Equipment',
    transactionType: 'Purchase Order',
    requestedDate: '2024-09-23',
    estimatedValue: 2500,
    status: 'Pending Procurement',
    requestedBy: 'Group Classes Manager'
  }
];

const maintenanceSchedule = [
  {
    id: 1,
    assetName: 'Treadmill Pro X3',
    category: 'Gym Equipment',
    maintenanceType: 'Routine Service',
    dueDate: '2024-09-30',
    lastMaintenance: '2024-07-15',
    cost: 450,
    priority: 'Medium',
    assignedTo: 'TechServ Solutions'
  },
  {
    id: 2,
    assetName: 'Air Conditioning Unit A1',
    category: 'HVAC',
    maintenanceType: 'Filter Replacement',
    dueDate: '2024-09-28',
    lastMaintenance: '2024-08-28',
    cost: 220,
    priority: 'High',
    assignedTo: 'Climate Control Co.'
  },
  {
    id: 3,
    assetName: 'Sound System Main',
    category: 'Audio Equipment',
    maintenanceType: 'Calibration Check',
    dueDate: '2024-10-05',
    lastMaintenance: '2024-06-15',
    cost: 350,
    priority: 'Low',
    assignedTo: 'Audio Pro Services'
  }
];

const highValueAssets = [
  {
    id: 1,
    assetName: 'Commercial Grade Smith Machine',
    category: 'Gym Equipment',
    purchaseDate: '2024-01-15',
    originalValue: 25000,
    currentValue: 22500,
    depreciation: 10,
    condition: 'Excellent',
    warrantyExpiry: '2026-01-15'
  },
  {
    id: 2,
    assetName: 'Professional Sound System',
    category: 'Audio Equipment',
    purchaseDate: '2023-08-20',
    originalValue: 18000,
    currentValue: 14400,
    depreciation: 20,
    condition: 'Good',
    warrantyExpiry: '2025-08-20'
  },
  {
    id: 3,
    assetName: 'Cardio Zone Flooring',
    category: 'Infrastructure',
    purchaseDate: '2023-05-10',
    originalValue: 35000,
    currentValue: 28000,
    depreciation: 20,
    condition: 'Good',
    warrantyExpiry: '2028-05-10'
  }
];

export function Assets() {
  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} AED`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Completed':
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Pending Approval':
      case 'Pending Transfer':
      case 'Pending Procurement':
      case 'Under Maintenance':
      case 'Good': return 'bg-yellow-100 text-yellow-800';
      case 'Disposed':
      case 'Retired':
      case 'Poor': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'High': return 'bg-red-100 text-red-800';
      case 'Low': return 'bg-gray-100 text-gray-800';
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Gym Equipment': return <Dumbbell className="h-4 w-4" />;
      case 'IT Equipment': return <Laptop className="h-4 w-4" />;
      case 'Furniture': return <Sofa className="h-4 w-4" />;
      case 'Vehicles': return <Car className="h-4 w-4" />;
      case 'Kitchen & Cafe': return <Coffee className="h-4 w-4" />;
      case 'Audio Equipment': return <Monitor className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive asset management and tracking system for {getCurrentPeriod()}
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

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Asset Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(kpiData.totalAssetValue)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+5.2% this quarter</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assets Added This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {kpiData.assetsAddedThisMonth}
                </p>
                <div className="flex items-center mt-2">
                  <Plus className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">New acquisitions</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assets Retired / Disposed</p>
                <p className="text-2xl font-bold text-red-600">
                  {kpiData.assetsRetiredDisposed}
                </p>
                <div className="flex items-center mt-2">
                  <RefreshCcw className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">End of lifecycle</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <RefreshCcw className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Transactions</p>
                <p className="text-2xl font-bold text-orange-600">
                  {kpiData.pendingTransactions}
                </p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Awaiting approval</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenance Required</p>
                <p className="text-2xl font-bold text-purple-600">
                  {kpiData.maintenanceRequired}
                </p>
                <div className="flex items-center mt-2">
                  <Wrench className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">Service needed</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Categories Pie Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>Asset Categories</span>
                </CardTitle>
                <CardDescription>Distribution by asset type and value</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value}) => `${name}: ${(value/1000).toFixed(0)}K AED`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${(value/1000).toFixed(0)}K AED`, 'Value']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Transactions Bar Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span>Monthly Asset Transactions</span>
                </CardTitle>
                <CardDescription>Asset activity over the last 6 months</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTransactions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="added" fill="#10b981" name="Added" />
                <Bar dataKey="retired" fill="#ef4444" name="Retired" />
                <Bar dataKey="transferred" fill="#3b82f6" name="Transferred" />
                <Bar dataKey="maintenance" fill="#f59e0b" name="Maintenance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Tables */}
      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="pending">Pending Transactions</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Schedule</TabsTrigger>
          <TabsTrigger value="highvalue">High-Value Assets</TabsTrigger>
        </TabsList>

        {/* Recent Asset Activity */}
        <TabsContent value="recent" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Recent Asset Activity</span>
                  </CardTitle>
                  <CardDescription>Latest asset transactions and movements</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAssetActivity.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.assetName}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(asset.category)}
                          <span>{asset.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          asset.transactionType === 'Added' 
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : asset.transactionType === 'Retired'
                            ? 'border-red-200 text-red-700 bg-red-50'
                            : 'border-blue-200 text-blue-700 bg-blue-50'
                        }>
                          {asset.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(asset.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>{formatCurrency(asset.value)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(asset.status)}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

        {/* Pending Transactions */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>Pending Transactions</span>
                  </CardTitle>
                  <CardDescription>Assets awaiting approval, transfer, or procurement</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.assetName}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(transaction.category)}
                          <span>{transaction.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.transactionType}</TableCell>
                      <TableCell>
                        {new Date(transaction.requestedDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.estimatedValue)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.requestedBy}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <XCircle className="h-4 w-4 text-red-600" />
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

        {/* Maintenance Schedule */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-purple-600" />
                    <span>Maintenance Schedule</span>
                  </CardTitle>
                  <CardDescription>Upcoming and overdue maintenance activities</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Maintenance Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Last Maintenance</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceSchedule.map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell className="font-medium">{maintenance.assetName}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(maintenance.category)}
                          <span>{maintenance.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>{maintenance.maintenanceType}</TableCell>
                      <TableCell>
                        {new Date(maintenance.dueDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        {new Date(maintenance.lastMaintenance).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>{formatCurrency(maintenance.cost)}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(maintenance.priority)}>
                          {maintenance.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{maintenance.assignedTo}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Calendar className="h-4 w-4 text-blue-600" />
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

        {/* High-Value Assets */}
        <TabsContent value="highvalue" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span>High-Value Assets</span>
                  </CardTitle>
                  <CardDescription>Premium assets requiring special attention</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Full Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Original Value</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Depreciation</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Warranty Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highValueAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.assetName}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(asset.category)}
                          <span>{asset.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(asset.purchaseDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>{formatCurrency(asset.originalValue)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(asset.currentValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={asset.depreciation} className="w-16 h-2" />
                          <span className="text-sm">{asset.depreciation}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(asset.condition)}>
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(asset.warrantyExpiry).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
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
      </Tabs>
    </div>
  );
}

