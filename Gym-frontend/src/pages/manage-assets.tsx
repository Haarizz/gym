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
import { Checkbox } from "../components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { 
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  RefreshCw,
  Calendar as CalendarIcon,
  Package,
  Building,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Trash2,
  Settings,
  Clock,
  Wrench,
  CheckCircle,
  AlertCircle,
  XCircle,
  Archive,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Smartphone,
  Laptop,
  Monitor,
  Sofa,
  Dumbbell,
  Car,
  Home,
  FileText,
  Camera,
  Calendar as CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Paperclip,
  Shield,
  AlertTriangle,
  Info,
  History,
  QrCode,
  BarChart2,
  Calendar as CalendarDays2,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Move,
  ArrowRight,
  Zap as ZapIcon,
  Users as UsersIcon,
  FileBarChart,
  Download as DownloadIcon,
  Printer,
  Share2,
  Timer,
  MapPin as MapPinIcon,
  Award,
  Flame,
  TrendingUpDown as TrendingUpDownIcon,
  AlertOctagon,
  CheckCircle2,
  XOctagon
} from 'lucide-react';

// Sample asset data
const assetsData = [
  {
    id: 'AST-001',
    code: 'AST-001',
    name: 'Treadmill X Professional',
    model: 'TreadX Pro 3000',
    category: 'Equipment',
    subcategory: 'Cardio Equipment',
    purchaseDate: '2023-02-12',
    purchasePrice: 5500,
    currentValue: 4950,
    depreciationRate: 10,
    location: 'Dubai Branch – Cardio Zone',
    branch: 'Downtown Dubai',
    vendor: 'FitnessTech Solutions',
    status: 'In Use',
    condition: 'Excellent',
    warrantyExpiry: '2025-02-12',
    serialNumber: 'TX3000-2023-001',
    image: '/assets/treadmill.jpg',
    maintenanceHistory: [
      { date: '2024-01-15', type: 'Routine Maintenance', cost: 250, notes: 'Belt adjustment and lubrication' },
      { date: '2023-08-20', type: 'Repair', cost: 450, notes: 'Motor belt replacement' }
    ],
    transferHistory: [
      { date: '2023-02-15', from: 'Warehouse', to: 'Dubai Branch – Cardio Zone', reason: 'Initial deployment' }
    ],
    nextMaintenanceDate: '2024-04-15',
    utilizationRate: 85
  },
  {
    id: 'AST-002',
    code: 'AST-002',
    name: 'Executive Office Desk',
    model: 'Modern Workspace Pro',
    category: 'Furniture',
    subcategory: 'Office Furniture',
    purchaseDate: '2023-01-08',
    purchasePrice: 1200,
    currentValue: 1080,
    depreciationRate: 10,
    location: 'Marina Branch – Manager Office',
    branch: 'Marina Branch',
    vendor: 'Office Solutions UAE',
    status: 'In Use',
    condition: 'Good',
    warrantyExpiry: '2025-01-08',
    serialNumber: 'MWP-2023-002',
    image: '/assets/desk.jpg',
    maintenanceHistory: [
      { date: '2023-12-10', type: 'Cleaning & Polish', cost: 50, notes: 'Deep cleaning and wood polish' }
    ],
    transferHistory: [
      { date: '2023-01-10', from: 'Warehouse', to: 'Marina Branch – Manager Office', reason: 'Office setup' }
    ],
    nextMaintenanceDate: '2024-06-10',
    utilizationRate: 95
  },
  {
    id: 'AST-003',
    code: 'AST-003',
    name: 'Dell OptiPlex Desktop',
    model: 'OptiPlex 7090',
    category: 'IT',
    subcategory: 'Computer Hardware',
    purchaseDate: '2023-03-20',
    purchasePrice: 2800,
    currentValue: 2240,
    depreciationRate: 20,
    location: 'Downtown Dubai – Reception Desk',
    branch: 'Downtown Dubai',
    vendor: 'TechHub Dubai',
    status: 'In Use',
    condition: 'Excellent',
    warrantyExpiry: '2026-03-20',
    serialNumber: 'DOPT-7090-003',
    image: '/assets/computer.jpg',
    maintenanceHistory: [
      { date: '2023-12-15', type: 'Software Update', cost: 0, notes: 'OS and security updates' },
      { date: '2023-09-05', type: 'Hardware Upgrade', cost: 300, notes: 'RAM upgrade to 16GB' }
    ],
    transferHistory: [
      { date: '2023-03-22', from: 'IT Department', to: 'Downtown Dubai – Reception Desk', reason: 'Deployment' }
    ],
    nextMaintenanceDate: '2024-03-15',
    utilizationRate: 90
  },
  {
    id: 'AST-004',
    code: 'AST-004',
    name: 'HVAC System Unit 2',
    model: 'CoolMax Industrial 5000',
    category: 'Facilities',
    subcategory: 'HVAC Equipment',
    purchaseDate: '2022-11-15',
    purchasePrice: 12000,
    currentValue: 9600,
    depreciationRate: 10,
    location: 'Marina Branch – Main Hall',
    branch: 'Marina Branch',
    vendor: 'Climate Control Systems',
    status: 'Under Maintenance',
    condition: 'Good',
    warrantyExpiry: '2024-11-15',
    serialNumber: 'CM5000-2022-004',
    image: '/assets/hvac.jpg',
    maintenanceHistory: [
      { date: '2024-01-20', type: 'Major Service', cost: 800, notes: 'Filter replacement, coil cleaning, refrigerant check' },
      { date: '2023-07-10', type: 'Routine Maintenance', cost: 400, notes: 'Quarterly maintenance service' },
      { date: '2023-04-05', type: 'Repair', cost: 650, notes: 'Compressor motor repair' }
    ],
    transferHistory: [
      { date: '2022-11-18', from: 'Installation Team', to: 'Marina Branch – Main Hall', reason: 'Installation' }
    ],
    nextMaintenanceDate: '2024-04-20',
    utilizationRate: 100
  },
  {
    id: 'AST-005',
    code: 'AST-005',
    name: 'Dumbell Set Premium',
    model: 'PowerFit Pro Series',
    category: 'Equipment',
    subcategory: 'Weight Training',
    purchaseDate: '2023-06-10',
    purchasePrice: 3200,
    currentValue: 2880,
    depreciationRate: 10,
    location: 'Downtown Dubai – Weight Room',
    branch: 'Downtown Dubai',
    vendor: 'GymGear International',
    status: 'Active',
    condition: 'Excellent',
    warrantyExpiry: '2025-06-10',
    serialNumber: 'PFP-DB-005',
    image: '/assets/dumbbells.jpg',
    maintenanceHistory: [
      { date: '2023-12-01', type: 'Inspection', cost: 0, notes: 'Safety inspection and cleaning' }
    ],
    transferHistory: [
      { date: '2023-06-12', from: 'Warehouse', to: 'Downtown Dubai – Weight Room', reason: 'Equipment deployment' }
    ],
    nextMaintenanceDate: '2024-06-01',
    utilizationRate: 75
  },
  {
    id: 'AST-006',
    code: 'AST-006',
    name: 'CrossFit Rig Station',
    model: 'Elite Rig Pro 4x4',
    category: 'Equipment',
    subcategory: 'Functional Training',
    purchaseDate: '2023-08-05',
    purchasePrice: 8500,
    currentValue: 7650,
    depreciationRate: 10,
    location: 'Marina Branch – CrossFit Area',
    branch: 'Marina Branch',
    vendor: 'CrossFit Equipment Co',
    status: 'Disposed',
    condition: 'Fair',
    warrantyExpiry: '2025-08-05',
    serialNumber: 'ERP-4x4-006',
    image: '/assets/crossfit-rig.jpg',
    maintenanceHistory: [
      { date: '2024-01-10', type: 'Final Inspection', cost: 0, notes: 'Pre-disposal safety check' },
      { date: '2023-11-20', type: 'Repair', cost: 1200, notes: 'Structural reinforcement required' },
      { date: '2023-10-15', type: 'Safety Alert', cost: 0, notes: 'Hairline crack discovered in main frame' }
    ],
    transferHistory: [
      { date: '2024-01-15', from: 'Marina Branch – CrossFit Area', to: 'Disposal Facility', reason: 'Safety concerns - structural damage' },
      { date: '2023-08-07', from: 'Installation Team', to: 'Marina Branch – CrossFit Area', reason: 'Initial installation' }
    ],
    nextMaintenanceDate: null,
    utilizationRate: 0,
    disposalDate: '2024-01-15',
    disposalReason: 'Safety concerns due to structural damage'
  }
];

// Asset lifecycle events for timeline
const assetLifecycleEvents = {
  'AST-001': [
    {
      id: 'evt-001-001',
      type: 'purchase',
      title: 'Asset Purchased',
      description: 'Treadmill X Professional acquired from FitnessTech Solutions',
      date: '2023-02-12',
      amount: 5500,
      location: 'Warehouse',
      status: 'completed',
      details: {
        purchaseOrder: 'PO-2023-001',
        vendor: 'FitnessTech Solutions',
        invoiceNumber: 'INV-FTS-001',
        warranty: '2 years'
      }
    },
    {
      id: 'evt-001-002',
      type: 'transfer',
      title: 'Initial Deployment',
      description: 'Moved from warehouse to Dubai Branch cardio zone',
      date: '2023-02-15',
      amount: 0,
      location: 'Dubai Branch – Cardio Zone',
      status: 'completed',
      details: {
        fromLocation: 'Warehouse',
        toLocation: 'Dubai Branch – Cardio Zone',
        reason: 'Initial deployment',
        transferBy: 'Installation Team'
      }
    },
    {
      id: 'evt-001-003',
      type: 'maintenance',
      title: 'Motor Belt Replacement',
      description: 'Replaced worn motor belt and performed calibration',
      date: '2023-08-20',
      amount: 450,
      location: 'Dubai Branch – Cardio Zone',
      status: 'completed',
      details: {
        technician: 'Ahmed Hassan',
        parts: ['Motor Belt MX3000', 'Belt Tensioner'],
        downtime: '2 hours',
        nextService: '2024-01-20'
      }
    },
    {
      id: 'evt-001-004',
      type: 'depreciation',
      title: 'Annual Depreciation',
      description: 'Yearly depreciation calculation (10% rate)',
      date: '2023-12-31',
      amount: -550,
      location: 'Dubai Branch – Cardio Zone',
      status: 'completed',
      details: {
        depreciationRate: '10%',
        bookValue: 4950,
        method: 'Straight Line',
        remainingValue: 4950
      }
    },
    {
      id: 'evt-001-005',
      type: 'maintenance',
      title: 'Routine Maintenance',
      description: 'Belt adjustment, lubrication, and safety check',
      date: '2024-01-15',
      amount: 250,
      location: 'Dubai Branch – Cardio Zone',
      status: 'completed',
      details: {
        technician: 'Sarah Ahmed',
        type: 'Preventive Maintenance',
        downtime: '1 hour',
        nextService: '2024-04-15'
      }
    },
    {
      id: 'evt-001-006',
      type: 'alert',
      title: 'Maintenance Due Alert',
      description: 'Scheduled maintenance due in 7 days',
      date: '2024-04-08',
      amount: 0,
      location: 'Dubai Branch – Cardio Zone',
      status: 'pending',
      details: {
        alertType: 'Maintenance Due',
        priority: 'Medium',
        dueDate: '2024-04-15',
        estimatedCost: 300
      }
    }
  ],
  'AST-006': [
    {
      id: 'evt-006-001',
      type: 'purchase',
      title: 'Asset Purchased',
      description: 'CrossFit Rig Station Elite Rig Pro 4x4 acquired',
      date: '2023-08-05',
      amount: 8500,
      location: 'Warehouse',
      status: 'completed',
      details: {
        purchaseOrder: 'PO-2023-045',
        vendor: 'CrossFit Equipment Co',
        invoiceNumber: 'INV-CFC-045',
        warranty: '2 years'
      }
    },
    {
      id: 'evt-006-002',
      type: 'transfer',
      title: 'Installation & Deployment',
      description: 'Professional installation at Marina Branch CrossFit area',
      date: '2023-08-07',
      amount: 800,
      location: 'Marina Branch – CrossFit Area',
      status: 'completed',
      details: {
        fromLocation: 'Installation Team',
        toLocation: 'Marina Branch – CrossFit Area',
        reason: 'Initial installation',
        installationCost: 800,
        certifiedBy: 'CrossFit Equipment Co'
      }
    },
    {
      id: 'evt-006-003',
      type: 'maintenance',
      title: 'Quarterly Safety Inspection',
      description: 'Standard 3-month safety and structural inspection',
      date: '2023-10-15',
      amount: 150,
      location: 'Marina Branch – CrossFit Area',
      status: 'completed',
      details: {
        inspector: 'Mike Johnson',
        findings: 'Hairline crack discovered in main frame',
        recommendation: 'Monitor closely, schedule repair',
        priority: 'High'
      }
    },
    {
      id: 'evt-006-004',
      type: 'maintenance',
      title: 'Structural Reinforcement',
      description: 'Emergency repair for structural crack in main frame',
      date: '2023-11-20',
      amount: 1200,
      location: 'Marina Branch – CrossFit Area',
      status: 'completed',
      details: {
        technician: 'Structural Engineering Team',
        urgency: 'Emergency',
        downtime: '1 day',
        outcome: 'Temporary fix applied'
      }
    },
    {
      id: 'evt-006-005',
      type: 'inspection',
      title: 'Final Safety Assessment',
      description: 'Comprehensive safety evaluation before disposal decision',
      date: '2024-01-10',
      amount: 0,
      location: 'Marina Branch – CrossFit Area',
      status: 'completed',
      details: {
        inspector: 'Safety Compliance Team',
        outcome: 'Failed safety standards',
        recommendation: 'Immediate disposal required',
        riskLevel: 'High'
      }
    },
    {
      id: 'evt-006-006',
      type: 'disposal',
      title: 'Asset Disposal',
      description: 'Equipment safely disposed due to structural safety concerns',
      date: '2024-01-15',
      amount: -8500,
      location: 'Disposal Facility',
      status: 'completed',
      details: {
        disposalReason: 'Safety concerns - structural damage',
        disposalMethod: 'Recycling',
        disposalCompany: 'Green Recycling UAE',
        recoveryValue: 500
      }
    }
  ]
};

// QR Code and barcode data
const assetQRData = {
  'AST-001': {
    qrCode: 'QR-AST001-TX3000-2023',
    barcode: '1234567890123',
    lastScanned: '2024-01-20',
    scanCount: 45
  },
  'AST-002': {
    qrCode: 'QR-AST002-MWP-2023',
    barcode: '1234567890124',
    lastScanned: '2024-01-18',
    scanCount: 12
  }
};

// Category icons mapping
const categoryIcons = {
  'Equipment': Dumbbell,
  'Furniture': Sofa,
  'IT': Laptop,
  'Facilities': Building
};

// Status color mapping
const statusColors = {
  'Active': 'bg-green-100 text-green-800',
  'In Use': 'bg-blue-100 text-blue-800',
  'Under Maintenance': 'bg-yellow-100 text-yellow-800',
  'Disposed': 'bg-red-100 text-red-800',
  'Out of Service': 'bg-gray-100 text-gray-800'
};

// Condition color mapping
const conditionColors = {
  'Excellent': 'bg-green-100 text-green-800',
  'Good': 'bg-blue-100 text-blue-800',
  'Fair': 'bg-yellow-100 text-yellow-800',
  'Poor': 'bg-red-100 text-red-800'
};

export function ManageAssets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showAssetHistory, setShowAssetHistory] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<any>(null);
  const [historyViewMode, setHistoryViewMode] = useState<'timeline' | 'table'>('timeline');
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Filter and sort assets
  const filteredAssets = assetsData
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranch === 'all' || asset.branch === selectedBranch;
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
      
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const assetDate = new Date(asset.purchaseDate);
        matchesDate = assetDate >= dateRange.from && assetDate <= dateRange.to;
      }
      
      return matchesSearch && matchesBranch && matchesCategory && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'purchaseDate':
          aVal = new Date(a.purchaseDate);
          bVal = new Date(b.purchaseDate);
          break;
        case 'currentValue':
          aVal = a.currentValue;
          bVal = b.currentValue;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
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

  // Calculate analytics
  const totalAssetsValue = assetsData.reduce((sum, asset) => sum + asset.currentValue, 0);
  const activeAssetsCount = assetsData.filter(asset => asset.status === 'In Use' || asset.status === 'Active').length;
  const maintenanceDue = assetsData.filter(asset => {
    if (!asset.nextMaintenanceDate) return false;
    const dueDate = new Date(asset.nextMaintenanceDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return dueDate <= thirtyDaysFromNow;
  }).length;
  const assetsForDisposal = assetsData.filter(asset => 
    asset.condition === 'Poor' || asset.status === 'Out of Service'
  ).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setDateRange({ from: undefined, to: undefined });
  };

  const toggleRowExpansion = (assetId: string) => {
    setExpandedRows(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAllAssets = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(asset => asset.id));
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} AED`;
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || Package;
    return <Icon className="h-4 w-4" />;
  };

  const getDepreciationTrend = (asset: any) => {
    const depreciationAmount = asset.purchasePrice - asset.currentValue;
    const depreciationPercent = (depreciationAmount / asset.purchasePrice) * 100;
    return depreciationPercent;
  };

  // Asset History Helper Functions
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'purchase':
        return <ShoppingCart className="h-5 w-5 text-green-600" />;
      case 'transfer':
        return <Move className="h-5 w-5 text-blue-600" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case 'depreciation':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'disposal':
        return <Trash2 className="h-5 w-5 text-gray-600" />;
      case 'inspection':
        return <Eye className="h-5 w-5 text-purple-600" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'purchase':
        return 'bg-green-100 border-green-300';
      case 'transfer':
        return 'bg-blue-100 border-blue-300';
      case 'maintenance':
        return 'bg-orange-100 border-orange-300';
      case 'depreciation':
        return 'bg-red-100 border-red-300';
      case 'disposal':
        return 'bg-gray-100 border-gray-300';
      case 'inspection':
        return 'bg-purple-100 border-purple-300';
      case 'alert':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'in-progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XOctagon className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportAssetHistory = (asset: any, format: 'pdf' | 'excel') => {
    // Mock export functionality
    const events = assetLifecycleEvents[asset.id as keyof typeof assetLifecycleEvents] || [];
    console.log(`Exporting ${asset.name} history as ${format.toUpperCase()}`, events);
    
    // In a real implementation, you would generate actual PDF/Excel files
    if (format === 'pdf') {
      // Generate PDF report
      alert(`PDF report for ${asset.name} will be downloaded shortly.`);
    } else {
      // Generate Excel report
      alert(`Excel report for ${asset.name} will be downloaded shortly.`);
    }
  };

  const openAssetHistory = (asset: any) => {
    setSelectedHistoryAsset(asset);
    setShowAssetHistory(true);
  };

  const scanQRCode = (assetId: string) => {
    setShowQRScanner(true);
    // Mock QR scanning
    setTimeout(() => {
      const asset = assetsData.find(a => a.id === assetId);
      if (asset) {
        setSelectedAsset(asset);
        setShowQRScanner(false);
      }
    }, 2000);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets Register</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive asset management and tracking system
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Global search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowQRScanner(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            QR Scan
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAssetHistory(true)}>
            <History className="h-4 w-4 mr-2" />
            Asset History
          </Button>
          <Button onClick={() => setShowAddAsset(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Analytics Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-teal-500 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-teal-700">Total Assets Value</p>
                <p className="text-2xl font-bold text-teal-900">{formatCurrency(totalAssetsValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700">Active Assets</p>
                <p className="text-2xl font-bold text-green-900">{activeAssetsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-yellow-700">Maintenance Due (30 days)</p>
                <p className="text-2xl font-bold text-yellow-900">{maintenanceDue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <Trash2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-700">Assets for Disposal</p>
                <p className="text-2xl font-bold text-red-900">{assetsForDisposal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                <SelectItem value="Marina Branch">Marina Branch</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Package className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Furniture">Furniture</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Facilities">Facilities</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <Activity className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    ) : (
                      dateRange.from.toLocaleDateString()
                    )
                  ) : (
                    'Purchase Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={resetFilters}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="purchaseDate">Date</SelectItem>
                  <SelectItem value="currentValue">Value</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                      onCheckedChange={selectAllAssets}
                    />
                  </TableHead>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Asset & Model</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <React.Fragment key={asset.id}>
                    <TableRow 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRowExpansion(asset.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onCheckedChange={() => toggleAssetSelection(asset.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{asset.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-100 p-2 rounded-lg">
                            {getCategoryIcon(asset.category)}
                          </div>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-gray-600">{asset.model}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(asset.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(asset.purchasePrice)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{asset.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[asset.status as keyof typeof statusColors]}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatCurrency(asset.currentValue)}</span>
                          {getDepreciationTrend(asset) > 0 && (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-1">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                          </Sheet>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAssetHistory(asset)}>
                                <History className="h-4 w-4 mr-2" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => scanQRCode(asset.id)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Scan
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                Transfer Asset
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Wrench className="h-4 w-4 mr-2" />
                                Schedule Maintenance
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Mark for Disposal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable Row Content */}
                    {expandedRows.includes(asset.id) && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={9} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Warranty & Maintenance</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Warranty Expiry:</span>
                                  <span className="text-sm font-medium">{new Date(asset.warrantyExpiry).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Next Maintenance:</span>
                                  <span className="text-sm font-medium">
                                    {asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Condition:</span>
                                  <Badge className={conditionColors[asset.condition as keyof typeof conditionColors]}>
                                    {asset.condition}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Financial Details</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Purchase Price:</span>
                                  <span className="text-sm font-medium">{formatCurrency(asset.purchasePrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Current Value:</span>
                                  <span className="text-sm font-medium">{formatCurrency(asset.currentValue)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Depreciation:</span>
                                  <span className="text-sm font-medium text-red-600">
                                    -{formatCurrency(asset.purchasePrice - asset.currentValue)} ({asset.depreciationRate}%)
                                  </span>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Usage & Performance</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm text-gray-600">Utilization Rate:</span>
                                    <span className="text-sm font-medium">{asset.utilizationRate}%</span>
                                  </div>
                                  <Progress value={asset.utilizationRate} className="h-2" />
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Serial Number:</span>
                                  <span className="text-sm font-medium">{asset.serialNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Vendor:</span>
                                  <span className="text-sm font-medium">{asset.vendor}</span>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Asset Details Side Sheet */}
      <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedAsset && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <div className="bg-teal-100 p-2 rounded-lg">
                    {getCategoryIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{selectedAsset.name}</div>
                    <div className="text-sm text-gray-600">{selectedAsset.code} • {selectedAsset.model}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
                  <TabsTrigger value="transfers">Transfers</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Asset Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {getCategoryIcon(selectedAsset.category)}
                            <span>{selectedAsset.category}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Subcategory</Label>
                          <div className="text-sm mt-1">{selectedAsset.subcategory}</div>
                        </div>
                        <div>
                          <Label>Serial Number</Label>
                          <div className="text-sm mt-1">{selectedAsset.serialNumber}</div>
                        </div>
                        <div>
                          <Label>Vendor</Label>
                          <div className="text-sm mt-1">{selectedAsset.vendor}</div>
                        </div>
                        <div>
                          <Label>Purchase Date</Label>
                          <div className="text-sm mt-1">{new Date(selectedAsset.purchaseDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <Label>Warranty Expiry</Label>
                          <div className="text-sm mt-1">{new Date(selectedAsset.warrantyExpiry).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status & Location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Current Status</Label>
                          <div className="mt-1">
                            <Badge className={statusColors[selectedAsset.status as keyof typeof statusColors]}>
                              {selectedAsset.status}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label>Condition</Label>
                          <div className="mt-1">
                            <Badge className={conditionColors[selectedAsset.condition as keyof typeof conditionColors]}>
                              {selectedAsset.condition}
                            </Badge>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label>Current Location</Label>
                          <div className="text-sm mt-1 flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{selectedAsset.location}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Purchase Price</Label>
                          <div className="text-lg font-medium mt-1">{formatCurrency(selectedAsset.purchasePrice)}</div>
                        </div>
                        <div>
                          <Label>Current Value</Label>
                          <div className="text-lg font-medium mt-1">{formatCurrency(selectedAsset.currentValue)}</div>
                        </div>
                        <div>
                          <Label>Total Depreciation</Label>
                          <div className="text-lg font-medium mt-1 text-red-600">
                            -{formatCurrency(selectedAsset.purchasePrice - selectedAsset.currentValue)}
                          </div>
                        </div>
                        <div>
                          <Label>Depreciation Rate</Label>
                          <div className="text-lg font-medium mt-1">{selectedAsset.depreciationRate}% annually</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Maintenance Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div>
                            <div className="font-medium text-yellow-800">Next Maintenance Due</div>
                            <div className="text-sm text-yellow-600">
                              {selectedAsset.nextMaintenanceDate ? 
                                new Date(selectedAsset.nextMaintenanceDate).toLocaleDateString() : 
                                'Not scheduled'
                              }
                            </div>
                          </div>
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Maintenance History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedAsset.maintenanceHistory.map((maintenance: any, index: number) => (
                          <div key={index} className="border-l-2 border-teal-200 pl-4 pb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{maintenance.type}</div>
                                <div className="text-sm text-gray-600">{maintenance.notes}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {new Date(maintenance.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(maintenance.cost)}</div>
                                <div className="text-sm text-gray-500">Cost</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="depreciation" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Depreciation Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-teal-700">
                          {((selectedAsset.purchasePrice - selectedAsset.currentValue) / selectedAsset.purchasePrice * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-teal-600">Total Depreciation</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-xl font-bold">{formatCurrency(selectedAsset.purchasePrice)}</div>
                          <div className="text-sm text-gray-600">Original Value</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-xl font-bold">{formatCurrency(selectedAsset.currentValue)}</div>
                          <div className="text-sm text-gray-600">Current Value</div>
                        </div>
                      </div>

                      <div>
                        <Label>Depreciation Progress</Label>
                        <div className="mt-2">
                          <Progress 
                            value={((selectedAsset.purchasePrice - selectedAsset.currentValue) / selectedAsset.purchasePrice) * 100} 
                            className="h-3" 
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                          <span>0%</span>
                          <span>Annual Rate: {selectedAsset.depreciationRate}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="transfers" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transfer History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedAsset.transferHistory.map((transfer: any, index: number) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-4 pb-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <ArrowUpDown className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">
                                  {transfer.from} → {transfer.to}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">{transfer.reason}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(transfer.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Asset Modal */}
      <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Register a new asset in the system with complete details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label>Asset Name</Label>
                <Input placeholder="Enter asset name" />
              </div>
              <div>
                <Label>Asset Code</Label>
                <Input placeholder="AST-XXX" />
              </div>
              <div>
                <Label>Model</Label>
                <Input placeholder="Enter model/brand" />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="facilities">Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purchase Price (AED)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Serial Number</Label>
                <Input placeholder="Enter serial number" />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input placeholder="Enter vendor name" />
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
                <Label>Location</Label>
                <Input placeholder="Specific location within branch" />
              </div>
              <div>
                <Label>Warranty Period (Years)</Label>
                <Input type="number" placeholder="2" />
              </div>
              <div>
                <Label>Depreciation Rate (%)</Label>
                <Input type="number" placeholder="10" />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddAsset(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddAsset(false)}>
              Add Asset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset History Modal */}
      <Dialog open={showAssetHistory} onOpenChange={setShowAssetHistory}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <History className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <div className="text-xl font-bold">Asset History & Lifecycle</div>
                <div className="text-sm text-gray-600">
                  {selectedHistoryAsset ? `Viewing: ${selectedHistoryAsset.name}` : 'Complete asset lifecycle tracking'}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Track complete asset lifecycle from purchase to disposal with detailed timeline and analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Asset Selector and Controls */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Label>Select Asset:</Label>
                <Select 
                  value={selectedHistoryAsset?.id || ''} 
                  onValueChange={(value) => {
                    const asset = assetsData.find(a => a.id === value);
                    setSelectedHistoryAsset(asset);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose an asset to view history" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetsData.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(asset.category)}
                          <span>{asset.name} ({asset.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label>View Mode:</Label>
                <Select value={historyViewMode} onValueChange={(value: 'timeline' | 'table') => setHistoryViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedHistoryAsset && (
                <div className="flex items-center space-x-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => exportAssetHistory(selectedHistoryAsset, 'pdf')}>
                    <Printer className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportAssetHistory(selectedHistoryAsset, 'excel')}>
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              )}
            </div>

            {selectedHistoryAsset && (
              <>
                {/* Asset Overview Card */}
                <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-teal-100 p-3 rounded-lg">
                          {getCategoryIcon(selectedHistoryAsset.category)}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{selectedHistoryAsset.name}</div>
                          <div className="text-sm text-teal-700">{selectedHistoryAsset.code}</div>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-teal-800">{formatCurrency(selectedHistoryAsset.purchasePrice)}</div>
                        <div className="text-sm text-teal-600">Purchase Price</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-800">{formatCurrency(selectedHistoryAsset.currentValue)}</div>
                        <div className="text-sm text-blue-600">Current Value</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {Math.floor((Date.now() - new Date(selectedHistoryAsset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))}d
                        </div>
                        <div className="text-sm text-gray-600">Age (Days)</div>
                      </div>

                      <div className="text-center">
                        <Badge className={statusColors[selectedHistoryAsset.status as keyof typeof statusColors]}>
                          {selectedHistoryAsset.status}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Current Status</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lifecycle Timeline or Table */}
                {historyViewMode === 'timeline' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Asset Lifecycle Timeline</span>
                      </CardTitle>
                      <CardDescription>
                        Complete chronological history from purchase to current status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-6">
                          {(assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || []).map((event, index) => (
                            <div key={event.id} className="relative">
                              {/* Timeline Line */}
                              {index < (assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || []).length - 1 && (
                                <div className="absolute left-6 top-12 w-px h-16 bg-gray-300"></div>
                              )}
                              
                              {/* Timeline Event */}
                              <div 
                                className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${getEventColor(event.type)}`}
                                onClick={() => setSelectedHistoryEvent(event)}
                              >
                                <div className="flex-shrink-0 bg-white p-2 rounded-full border-2 border-gray-300">
                                  {getEventIcon(event.type)}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-lg">{event.title}</div>
                                    <div className="flex items-center space-x-3">
                                      {event.amount !== 0 && (
                                        <div className={`font-bold ${event.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {event.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(event.amount))}
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-1">
                                        {getStatusIcon(event.status)}
                                        <span className="text-sm text-gray-600 capitalize">{event.status}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-700 mb-2">{event.description}</p>
                                  
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-4 text-gray-600">
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(event.date).toLocaleDateString()}</span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <MapPinIcon className="h-4 w-4" />
                                        <span>{event.location}</span>
                                      </span>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      Details
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Asset History Table</span>
                      </CardTitle>
                      <CardDescription>
                        Detailed tabular view of all asset lifecycle events
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Event Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || []).map((event) => (
                            <TableRow key={event.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {new Date(event.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getEventIcon(event.type)}
                                  <span className="capitalize">{event.type.replace('-', ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell>{event.title}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  <MapPinIcon className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm">{event.location}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {event.amount !== 0 && (
                                  <span className={`font-medium ${event.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {event.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(event.amount))}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(event.status)}
                                  <span className="capitalize">{event.status}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedHistoryEvent(event)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {(assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || [])
                          .filter(e => e.type === 'maintenance').length}
                      </div>
                      <div className="text-sm text-green-600">Total Maintenance</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        {(assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || [])
                          .filter(e => e.type === 'transfer').length}
                      </div>
                      <div className="text-sm text-blue-600">Total Transfers</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-800">
                        {formatCurrency((assetLifecycleEvents[selectedHistoryAsset.id as keyof typeof assetLifecycleEvents] || [])
                          .filter(e => e.type === 'maintenance')
                          .reduce((sum, e) => sum + e.amount, 0))}
                      </div>
                      <div className="text-sm text-orange-600">Maintenance Costs</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-800">
                        {selectedHistoryAsset.utilizationRate}%
                      </div>
                      <div className="text-sm text-purple-600">Utilization Rate</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {!selectedHistoryAsset && (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                  <History className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Select an Asset</h3>
                <p className="text-gray-600">Choose an asset from the dropdown above to view its complete lifecycle history.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={!!selectedHistoryEvent} onOpenChange={() => setSelectedHistoryEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedHistoryEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3">
                  {getEventIcon(selectedHistoryEvent.type)}
                  <div>
                    <div>{selectedHistoryEvent.title}</div>
                    <div className="text-sm text-gray-600 font-normal">
                      {new Date(selectedHistoryEvent.date).toLocaleDateString()}
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Detailed information about this lifecycle event
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getEventIcon(selectedHistoryEvent.type)}
                      <span className="capitalize">{selectedHistoryEvent.type.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(selectedHistoryEvent.status)}
                      <span className="capitalize">{selectedHistoryEvent.status}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div className="mt-1">{new Date(selectedHistoryEvent.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <div className="flex items-center space-x-1 mt-1">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span>{selectedHistoryEvent.location}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-gray-700">{selectedHistoryEvent.description}</p>
                </div>

                {selectedHistoryEvent.amount !== 0 && (
                  <div>
                    <Label>Financial Impact</Label>
                    <div className={`text-xl font-bold mt-1 ${selectedHistoryEvent.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedHistoryEvent.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(selectedHistoryEvent.amount))}
                    </div>
                  </div>
                )}

                {selectedHistoryEvent.details && (
                  <div>
                    <Label>Additional Details</Label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(selectedHistoryEvent.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>QR Code Scanner</span>
            </DialogTitle>
            <DialogDescription>
              Scan asset QR code for quick access to information and maintenance logging
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="bg-teal-100 p-8 rounded-lg inline-block mb-4">
              <QrCode className="h-16 w-16 text-teal-600 animate-pulse" />
            </div>
            <p className="text-gray-600 mb-4">Position QR code within the camera frame</p>
            <div className="space-y-2">
              <Button variant="outline" onClick={() => scanQRCode('AST-001')}>
                <Dumbbell className="h-4 w-4 mr-2" />
                Scan Demo: Treadmill (AST-001)
              </Button>
              <Button variant="outline" onClick={() => scanQRCode('AST-002')}>
                <Sofa className="h-4 w-4 mr-2" />
                Scan Demo: Office Desk (AST-002)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}

