import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { assetsService, Asset, AssetStats } from "../utils/supabase/assets-service";
import { 
  Search,
  ShoppingCart,
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

// Category icons mapping
export const categoryIcons = {
  'Equipment': Dumbbell,
  'Furniture': Sofa,
  'IT': Laptop,
  'Facilities': Building
};

// Status color mapping
export const statusColors = {
  'Active': 'bg-green-100 text-green-800',
  'In Use': 'bg-blue-100 text-blue-800',
  'Under Maintenance': 'bg-yellow-100 text-yellow-800',
  'Disposed': 'bg-red-100 text-red-800',
  'Out of Service': 'bg-gray-100 text-gray-800'
};

// Condition color mapping
export const conditionColors = {
  'Excellent': 'bg-green-100 text-green-800',
  'Good': 'bg-blue-100 text-blue-800',
  'Fair': 'bg-yellow-100 text-yellow-800',
  'Poor': 'bg-red-100 text-red-800'
};

export function ManageAssets() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    code: '',
    model: '',
    category: '',
    purchasePrice: '',
    purchaseDate: '',
    serialNumber: '',
    vendor: '',
    branch: '',
    location: '',
    warrantyYears: '',
    depreciationRate: ''
  });

  const loadAssets = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      const [assetsRes, statsRes] = await Promise.all([
        assetsService.getAssets({ page: 1, size: 500 }),
        assetsService.getStats()
      ]);
      setAssets(assetsRes.assets);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (asset.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (asset.model || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranch === 'all' || asset.branch === selectedBranch;
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
      
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const assetDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
        matchesDate = assetDate ? assetDate >= dateRange.from && assetDate <= dateRange.to : false;
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
          aVal = a.currentValue ?? 0;
          bVal = b.currentValue ?? 0;
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
  const totalAssetsValue = stats?.totalAssetsValue ?? assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
  const activeAssetsCount = stats?.activeAssetsCount ?? assets.filter(asset => asset.status === 'In Use' || asset.status === 'Active').length;
  const maintenanceDue = stats?.maintenanceDue ?? assets.filter(asset => {
    if (!asset.nextMaintenanceDate) return false;
    const dueDate = new Date(asset.nextMaintenanceDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return dueDate <= thirtyDaysFromNow;
  }).length;
  const assetsForDisposal = stats?.assetsForDisposal ?? assets.filter(asset => 
    asset.condition === 'Poor' || asset.status === 'Out of Service'
  ).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setDateRange({ from: undefined, to: undefined });
  };

  const resetNewAssetForm = () => {
    setNewAssetForm({
      name: '',
      code: '',
      model: '',
      category: '',
      purchasePrice: '',
      purchaseDate: '',
      serialNumber: '',
      vendor: '',
      branch: '',
      location: '',
      warrantyYears: '',
      depreciationRate: ''
    });
    setFormError(null);
  };

  const handleAddAssetOpenChange = (open: boolean) => {
    setShowAddAsset(open);
    if (!open) {
      resetNewAssetForm();
    }
  };

  const handleCreateAsset = async () => {
    if (!newAssetForm.name.trim()) {
      setFormError('Asset name is required.');
      return;
    }

    setIsCreating(true);
    setFormError(null);

    try {
      const purchasePrice = newAssetForm.purchasePrice ? Number(newAssetForm.purchasePrice) : undefined;
      const depreciationRate = newAssetForm.depreciationRate ? Number(newAssetForm.depreciationRate) : undefined;
      const purchaseDate = newAssetForm.purchaseDate || undefined;
      let warrantyExpiry: string | undefined;

      if (newAssetForm.warrantyYears) {
        const years = Number(newAssetForm.warrantyYears);
        const baseDate = purchaseDate ? new Date(purchaseDate) : new Date();
        const expiryDate = new Date(baseDate);
        if (!Number.isNaN(years)) {
          expiryDate.setFullYear(expiryDate.getFullYear() + years);
          warrantyExpiry = expiryDate.toISOString().slice(0, 10);
        }
      }

      const payload = {
        name: newAssetForm.name.trim(),
        code: newAssetForm.code.trim() || undefined,
        model: newAssetForm.model.trim() || undefined,
        category: newAssetForm.category || undefined,
        purchasePrice,
        currentValue: purchasePrice,
        purchaseDate,
        serialNumber: newAssetForm.serialNumber.trim() || undefined,
        vendor: newAssetForm.vendor.trim() || undefined,
        branch: newAssetForm.branch || undefined,
        location: newAssetForm.location.trim() || undefined,
        warrantyExpiry,
        depreciationRate,
        status: 'Active',
        condition: 'Good',
        utilizationRate: 0
      };

      await assetsService.createAsset(payload);
      await loadAssets({ silent: true });
      setShowAddAsset(false);
      resetNewAssetForm();
    } catch (err) {
      console.error('Failed to create asset:', err);
      setFormError('Failed to create asset. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleRowExpansion = (assetId: number) => {
    setExpandedRows(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const toggleAssetSelection = (assetId: number) => {
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

  const formatCurrency = (amount?: number) => {
    return `${(amount ?? 0).toLocaleString()} AED`;
  };

  const getDepreciationAmount = (asset: { purchasePrice?: number; currentValue?: number }) => {
    const purchasePrice = asset.purchasePrice ?? 0;
    const currentValue = asset.currentValue ?? 0;
    return purchasePrice - currentValue;
  };

  const getDepreciationPercent = (asset: { purchasePrice?: number; currentValue?: number }) => {
    const purchasePrice = asset.purchasePrice ?? 0;
    if (!purchasePrice) return 0;
    return (getDepreciationAmount(asset) / purchasePrice) * 100;
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || Package;
    return <Icon className="h-4 w-4" />;
  };

  const getDepreciationTrend = (asset: any) => {
    return getDepreciationPercent(asset);
  };

  const openAssetHistory = (asset?: any) => {
    const assetId = asset?.id;
    const url = assetId ? `/asset-history?assetId=${encodeURIComponent(assetId)}` : '/asset-history';
    navigate(url);
  };

  const scanQRCode = (assetId: string) => {
    setShowQRScanner(true);
    // Mock QR scanning
    setTimeout(() => {
      const asset = assets.find(a => String(a.id) === assetId || a.code === assetId);
      if (asset) {
        setSelectedAsset(asset);
        setShowQRScanner(false);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading assets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-600">{error}</div>
        <Button onClick={() => loadAssets()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assets</h1>
            <p className="text-muted-foreground">Comprehensive asset management and operations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={() => openAssetHistory()}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total Assets Value</CardTitle>
              <div className="bg-gradient-light p-2 rounded-lg">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalAssetsValue)}</div>
              <p className="text-xs text-muted-foreground">Current portfolio value</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Active Assets</CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeAssetsCount}</div>
              <p className="text-xs text-muted-foreground">Currently in use</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Maintenance Due</CardTitle>
              <div className="bg-amber-50 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{maintenanceDue}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Assets for Disposal</CardTitle>
              <div className="bg-red-50 p-2 rounded-lg">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{assetsForDisposal}</div>
              <p className="text-xs text-muted-foreground">Marked for review</p>
            </CardContent>
          </Card>
        </div>

        <style>{`
          @keyframes tabSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          [role="tabpanel"][data-state="active"] {
            animation: tabSlideIn 0.22s ease-out;
          }
          .asset-expand-wrapper {
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            transform: translateY(-4px);
            transition: max-height 0.2s ease-out, opacity 0.16s ease-out, transform 0.2s ease-out;
            will-change: max-height, opacity, transform;
          }
          .asset-expand-wrapper.is-open {
            max-height: 520px;
            opacity: 1;
            transform: translateY(0);
          }
          .asset-expand-wrapper.is-closed {
            max-height: 0;
            opacity: 0;
            transform: translateY(-4px);
            pointer-events: none;
          }
        `}</style>

        {/* Asset Directory */}
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Asset Directory</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredAssets.length} assets</span>
                {selectedAssets.length > 0 && (
                  <Badge className="bg-slate-100 text-slate-700">
                    {selectedAssets.length} selected
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                    <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
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
                  <SelectTrigger className="w-full sm:w-48">
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

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="purchaseDate">Date</SelectItem>
                    <SelectItem value="currentValue">Value</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-48 justify-start"
                      >
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-4">
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
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <p className="text-muted-foreground">No assets found.</p>
                        <Button className="mt-4" onClick={() => setShowAddAsset(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Asset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredAssets.map((asset) => {
                    const isExpanded = expandedRows.includes(asset.id);
                    return (
                      <React.Fragment key={asset.id}>
                        <TableRow 
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => toggleRowExpansion(asset.id)}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={() => toggleAssetSelection(asset.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{asset.code}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="bg-slate-100 p-2 rounded-lg">
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <div className="font-medium">{asset.name}</div>
                                <div className="text-sm text-muted-foreground">{asset.model}</div>
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
                            <div className="flex items-center gap-1">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setSelectedAsset(asset)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </SheetTrigger>
                              </Sheet>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4 text-slate-500" />
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
                        <TableRow className={`bg-slate-50/50 ${isExpanded ? "" : "border-0"}`}>
                          <TableCell colSpan={9} className={isExpanded ? "p-6" : "p-0"}>
                            <div className={`asset-expand-wrapper ${isExpanded ? "is-open" : "is-closed"}`}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
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

                                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
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
                                        -{formatCurrency(getDepreciationAmount(asset))} ({asset.depreciationRate ?? 0}%)
                                      </span>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
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
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
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
                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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

                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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

                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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
                            -{formatCurrency(getDepreciationAmount(selectedAsset))}
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
                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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

                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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
                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>Depreciation Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-teal-700">
                          {getDepreciationPercent(selectedAsset).toFixed(1)}%
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
                            value={getDepreciationPercent(selectedAsset)} 
                            className="h-3" 
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                          <span>0%</span>
                          <span>Annual Rate: {selectedAsset.depreciationRate ?? 0}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="transfers" className="space-y-6 mt-6">
                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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
      <Dialog open={showAddAsset} onOpenChange={handleAddAssetOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Register a new asset in the system with complete details
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label>Asset Name</Label>
                <Input
                  placeholder="Enter asset name"
                  value={newAssetForm.name}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Asset Code</Label>
                <Input
                  placeholder="AST-XXX"
                  value={newAssetForm.code}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  placeholder="Enter model/brand"
                  value={newAssetForm.model}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newAssetForm.category} onValueChange={(value) => setNewAssetForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Facilities">Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purchase Price (AED)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newAssetForm.purchasePrice}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={newAssetForm.purchaseDate}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Serial Number</Label>
                <Input
                  placeholder="Enter serial number"
                  value={newAssetForm.serialNumber}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input
                  placeholder="Enter vendor name"
                  value={newAssetForm.vendor}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, vendor: e.target.value }))}
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={newAssetForm.branch} onValueChange={(value) => setNewAssetForm(prev => ({ ...prev, branch: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                    <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="Specific location within branch"
                  value={newAssetForm.location}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label>Warranty Period (Years)</Label>
                <Input
                  type="number"
                  placeholder="2"
                  value={newAssetForm.warrantyYears}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, warrantyYears: e.target.value }))}
                />
              </div>
              <div>
                <Label>Depreciation Rate (%)</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={newAssetForm.depreciationRate}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, depreciationRate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleAddAssetOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateAsset} disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add Asset'}
            </Button>
          </div>
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

