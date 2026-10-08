import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Activity,
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Copy,
  Send,
  Mail,
  Printer,
  Share2,
  Archive,
  Folder,
  FolderOpen,
  FileSpreadsheet,
  FilePlus,
  FileCheck,
  FileX,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Package,
  ShoppingCart,
  Wrench,
  UserCheck,
  BarChart3,
  PieChart,
  Zap,
  Star
} from 'lucide-react';

interface OperationalReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  recentReports: Array<{
    report: string;
    type: string;
    generated: string;
    downloads: number;
    status: string;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
}

export function OperationalReportsDialog({
  open,
  onOpenChange,
  defaultTab = 'reports',
  recentReports,
  formatCurrency,
  getCurrentPeriod
}: OperationalReportsDialogProps) {
  const [selectedReportType, setSelectedReportType] = React.useState('all');
  const [selectedPeriod, setSelectedPeriod] = React.useState('monthly');

  // Enhanced Report Library
  const reportLibrary = [
    {
      id: 1,
      name: 'Monthly Financial Summary',
      type: 'Financial',
      description: 'Comprehensive financial overview with revenue, expenses, and profit analysis',
      generated: '2024-09-25 09:30',
      frequency: 'Monthly',
      size: '2.4 MB',
      pages: 18,
      downloads: 24,
      status: 'Available',
      lastRun: '2 hours ago',
      nextScheduled: '2024-10-01 09:00',
      format: 'PDF',
      recipients: ['Finance Team', 'Management']
    },
    {
      id: 2,
      name: 'Member Engagement Analysis',
      type: 'Analytics',
      description: 'Detailed member activity, attendance, and engagement metrics',
      generated: '2024-09-24 14:15',
      frequency: 'Weekly',
      size: '1.8 MB',
      pages: 12,
      downloads: 18,
      status: 'Available',
      lastRun: '1 day ago',
      nextScheduled: '2024-09-30 14:00',
      format: 'PDF',
      recipients: ['Operations Team']
    },
    {
      id: 3,
      name: 'Equipment Utilization Report',
      type: 'Operational',
      description: 'Equipment usage patterns, maintenance needs, and capacity analysis',
      generated: '2024-09-23 10:45',
      frequency: 'Weekly',
      size: '1.2 MB',
      pages: 8,
      downloads: 15,
      status: 'Available',
      lastRun: '2 days ago',
      nextScheduled: '2024-09-30 10:00',
      format: 'Excel',
      recipients: ['Facilities Team']
    },
    {
      id: 4,
      name: 'Staff Performance Review',
      type: 'HR',
      description: 'Staff productivity, attendance, and performance metrics',
      generated: '2024-09-22 16:20',
      frequency: 'Bi-weekly',
      size: '0.9 MB',
      pages: 10,
      downloads: 12,
      status: 'Available',
      lastRun: '3 days ago',
      nextScheduled: '2024-10-06 16:00',
      format: 'PDF',
      recipients: ['HR Team', 'Department Heads']
    },
    {
      id: 5,
      name: 'Class Performance Dashboard',
      type: 'Operational',
      description: 'Class attendance, instructor performance, and revenue per class',
      generated: '2024-09-21 11:30',
      frequency: 'Weekly',
      size: '1.5 MB',
      pages: 14,
      downloads: 20,
      status: 'Available',
      lastRun: '4 days ago',
      nextScheduled: '2024-09-28 11:00',
      format: 'PDF',
      recipients: ['Class Coordinators']
    },
    {
      id: 6,
      name: 'Inventory & Retail Report',
      type: 'Retail',
      description: 'Stock levels, sales performance, and reorder recommendations',
      generated: '2024-09-20 08:45',
      frequency: 'Weekly',
      size: '1.1 MB',
      pages: 9,
      downloads: 11,
      status: 'Available',
      lastRun: '5 days ago',
      nextScheduled: '2024-09-27 08:00',
      format: 'Excel',
      recipients: ['Retail Manager']
    },
    {
      id: 7,
      name: 'Member Retention Analysis',
      type: 'Analytics',
      description: 'Churn analysis, retention strategies, and member lifetime value',
      generated: '2024-09-19 13:00',
      frequency: 'Monthly',
      size: '2.1 MB',
      pages: 16,
      downloads: 19,
      status: 'Available',
      lastRun: '6 days ago',
      nextScheduled: '2024-10-19 13:00',
      format: 'PDF',
      recipients: ['Management', 'Marketing Team']
    },
    {
      id: 8,
      name: 'Daily Operations Summary',
      type: 'Operational',
      description: 'Daily check-ins, revenue, incidents, and operational highlights',
      generated: '2024-09-25 18:00',
      frequency: 'Daily',
      size: '0.5 MB',
      pages: 4,
      downloads: 47,
      status: 'Available',
      lastRun: 'Today',
      nextScheduled: '2024-09-26 18:00',
      format: 'Email',
      recipients: ['All Managers']
    }
  ];

  // Report Templates
  const reportTemplates = [
    {
      id: 1,
      name: 'Standard Financial Report',
      category: 'Financial',
      sections: 6,
      customizable: true,
      popular: true
    },
    {
      id: 2,
      name: 'Member Activity Report',
      category: 'Analytics',
      sections: 8,
      customizable: true,
      popular: true
    },
    {
      id: 3,
      name: 'Equipment Maintenance Log',
      category: 'Operational',
      sections: 5,
      customizable: false,
      popular: false
    },
    {
      id: 4,
      name: 'Staff Attendance Report',
      category: 'HR',
      sections: 4,
      customizable: true,
      popular: false
    },
    {
      id: 5,
      name: 'Revenue Breakdown Report',
      category: 'Financial',
      sections: 7,
      customizable: true,
      popular: true
    },
    {
      id: 6,
      name: 'Member Feedback Summary',
      category: 'Analytics',
      sections: 5,
      customizable: true,
      popular: false
    }
  ];

  // Scheduled Reports
  const scheduledReports = [
    {
      id: 1,
      name: 'Daily Operations Summary',
      schedule: 'Daily at 6:00 PM',
      recipients: 'All Managers (5)',
      format: 'Email',
      status: 'Active',
      lastRun: 'Today 18:00',
      nextRun: 'Tomorrow 18:00'
    },
    {
      id: 2,
      name: 'Weekly Performance Report',
      schedule: 'Every Monday at 9:00 AM',
      recipients: 'Management Team (3)',
      format: 'PDF',
      status: 'Active',
      lastRun: 'Sep 23, 09:00',
      nextRun: 'Sep 30, 09:00'
    },
    {
      id: 3,
      name: 'Monthly Financial Review',
      schedule: '1st of month at 10:00 AM',
      recipients: 'Finance Team (4)',
      format: 'Excel',
      status: 'Active',
      lastRun: 'Sep 1, 10:00',
      nextRun: 'Oct 1, 10:00'
    },
    {
      id: 4,
      name: 'Equipment Maintenance Alert',
      schedule: 'Every Friday at 3:00 PM',
      recipients: 'Facilities Team (2)',
      format: 'Email',
      status: 'Active',
      lastRun: 'Sep 22, 15:00',
      nextRun: 'Sep 29, 15:00'
    }
  ];

  // Report Generation Stats
  const generationStats = [
    { month: 'Jan', reports: 42, downloads: 189 },
    { month: 'Feb', reports: 38, downloads: 167 },
    { month: 'Mar', reports: 45, downloads: 203 },
    { month: 'Apr', reports: 41, downloads: 178 },
    { month: 'May', reports: 47, downloads: 215 },
    { month: 'Jun', reports: 52, downloads: 241 }
  ];

  // Report Categories
  const reportCategories = [
    { category: 'Financial', count: 28, percentage: 35, color: '#10b981' },
    { category: 'Operational', count: 24, percentage: 30, color: '#3b82f6' },
    { category: 'Analytics', count: 18, percentage: 22.5, color: '#8b5cf6' },
    { category: 'HR', count: 7, percentage: 8.8, color: '#f59e0b' },
    { category: 'Retail', count: 3, percentage: 3.8, color: '#ef4444' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Generating':
        return 'bg-blue-100 text-blue-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Financial':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'Analytics':
        return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case 'Operational':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'HR':
        return <Users className="h-4 w-4 text-orange-600" />;
      case 'Retail':
        return <ShoppingCart className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-[#2B7A78]" />
            <span>Operational Reports - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Generate, schedule, and manage comprehensive operational reports
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="reports">All Reports</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* All Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Folder className="h-5 w-5 text-[#2B7A78]" />
                <div>
                  <h3 className="font-semibold">Report Library</h3>
                  <p className="text-sm text-muted-foreground">{reportLibrary.length} reports available</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              {reportLibrary.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getTypeIcon(report.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-base">{report.name}</CardTitle>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                            <Badge variant="outline">{report.type}</Badge>
                          </div>
                          <CardDescription className="mt-1">{report.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Generated</p>
                        <p className="text-sm font-medium">{report.lastRun}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                        <p className="text-sm">{report.frequency}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Size</p>
                        <p className="text-sm">{report.size}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Pages</p>
                        <p className="text-sm">{report.pages}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Downloads</p>
                        <p className="text-sm font-medium">{report.downloads}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Format</p>
                        <Badge variant="outline">{report.format}</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                      <Button size="sm" variant="outline">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generate New Report</CardTitle>
                <CardDescription>Create a custom operational report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial Report</SelectItem>
                      <SelectItem value="operational">Operational Report</SelectItem>
                      <SelectItem value="analytics">Analytics Report</SelectItem>
                      <SelectItem value="hr">HR Report</SelectItem>
                      <SelectItem value="retail">Retail Report</SelectItem>
                      <SelectItem value="custom">Custom Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input placeholder="Enter report name" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time Period</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="last7days">Last 7 Days</SelectItem>
                        <SelectItem value="last30days">Last 30 Days</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                        <SelectItem value="quarterly">This Quarter</SelectItem>
                        <SelectItem value="yearly">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                        <SelectItem value="json">JSON Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Include Sections</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="summary" defaultChecked />
                      <label htmlFor="summary" className="text-sm cursor-pointer">Executive Summary</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="revenue" defaultChecked />
                      <label htmlFor="revenue" className="text-sm cursor-pointer">Revenue Analysis</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="members" defaultChecked />
                      <label htmlFor="members" className="text-sm cursor-pointer">Member Metrics</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="operations" defaultChecked />
                      <label htmlFor="operations" className="text-sm cursor-pointer">Operations Data</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="staff" />
                      <label htmlFor="staff" className="text-sm cursor-pointer">Staff Performance</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="equipment" />
                      <label htmlFor="equipment" className="text-sm cursor-pointer">Equipment Utilization</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="classes" />
                      <label htmlFor="classes" className="text-sm cursor-pointer">Class Performance</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="retail" />
                      <label htmlFor="retail" className="text-sm cursor-pointer">Retail & Sales</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="insights" defaultChecked />
                      <label htmlFor="insights" className="text-sm cursor-pointer">AI Insights</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="recommendations" defaultChecked />
                      <label htmlFor="recommendations" className="text-sm cursor-pointer">Recommendations</label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea placeholder="Add any specific requirements or notes for this report..." />
                </div>

                <div className="flex space-x-2">
                  <Button className="flex-1 bg-[#2B7A78] hover:bg-[#236663]">
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Generate</CardTitle>
                <CardDescription>Generate popular reports instantly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <span className="text-sm">Financial Summary</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    <span className="text-sm">Member Report</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <Activity className="h-6 w-6 text-purple-600" />
                    <span className="text-sm">Daily Summary</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                    <span className="text-sm">Performance</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <Wrench className="h-6 w-6 text-red-600" />
                    <span className="text-sm">Equipment</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-4 space-y-2">
                    <ShoppingCart className="h-6 w-6 text-pink-600" />
                    <span className="text-sm">Retail Sales</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Report Templates</h3>
                <p className="text-sm text-muted-foreground">{reportTemplates.length} templates available</p>
              </div>
              <Button className="bg-[#2B7A78] hover:bg-[#236663]">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.popular && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          <Badge variant="outline" className="mr-2">{template.category}</Badge>
                          {template.sections} sections
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Customizable</span>
                      <Badge className={template.customizable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {template.customizable ? 'Yes' : 'Fixed'}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1 bg-[#2B7A78] hover:bg-[#236663]">
                        <FilePlus className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">{scheduledReports.length} active schedules</p>
              </div>
              <Button className="bg-[#2B7A78] hover:bg-[#236663]">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReports.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">{schedule.schedule}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{schedule.recipients}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{schedule.format}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{schedule.lastRun}</TableCell>
                        <TableCell className="text-sm font-medium">{schedule.nextRun}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">{schedule.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-4 w-4 text-red-500" />
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Reports Generated</p>
                      <p className="text-2xl font-bold">52</p>
                      <p className="text-xs text-green-600 mt-1">+10.6% vs last month</p>
                    </div>
                    <FileCheck className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Downloads</p>
                      <p className="text-2xl font-bold">241</p>
                      <p className="text-xs text-blue-600 mt-1">+12.1% vs last month</p>
                    </div>
                    <Download className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Active</p>
                      <p className="text-2xl font-bold">4</p>
                      <p className="text-xs text-purple-600 mt-1">All running smoothly</p>
                    </div>
                    <Calendar className="h-10 w-10 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Generation Trends</CardTitle>
                <CardDescription>Monthly report generation and download activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={generationStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reports" stroke="#2B7A78" strokeWidth={2} name="Reports Generated" />
                    <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} name="Total Downloads" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reports by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportCategories.map((cat, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium">{cat.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{cat.count} reports</span>
                          <span className="text-xs text-muted-foreground ml-2">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <Progress value={cat.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Generation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-generate Daily Summary</p>
                    <p className="text-xs text-muted-foreground">Automatically generate daily operations summary</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Send email when reports are ready</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Include Charts & Graphs</p>
                    <p className="text-xs text-muted-foreground">Add visual elements to reports</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Compress PDF Files</p>
                    <p className="text-xs text-muted-foreground">Reduce file size for faster downloads</p>
                  </div>
                  <Checkbox />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Default Report Format</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retention Period</Label>
                  <Select defaultValue="90">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Recipients</Label>
                  <Input placeholder="email@example.com, email2@example.com" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Attach to Email</p>
                    <p className="text-xs text-muted-foreground">Include report as email attachment</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Send Summary in Email Body</p>
                    <p className="text-xs text-muted-foreground">Include executive summary in email</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]">
            <Zap className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
