import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { 
  Calculator,
  ShoppingCart,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  Percent,
  FileBarChart,
  FileText,
  Printer,
  RotateCcw,
  Pause,
  Play,
  DollarSign,
  ArrowDown,
  ArrowUp,
  Users,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Archive,
  CheckCircle,
  XCircle,
  Dumbbell,
  Shirt,
  Droplets,
  Cookie,
  Headphones,
  X,
  Coffee,
  Lock,
  Unlock
} from 'lucide-react';

// Product categories for touch screen
const productCategories = [
  { id: 'supplements', name: 'Supplements', icon: Package },
  { id: 'equipment', name: 'Equipment', icon: Dumbbell },
  { id: 'apparel', name: 'Apparel', icon: Shirt },
  { id: 'beverages', name: 'Beverages', icon: Droplets },
  { id: 'accessories', name: 'Accessories', icon: Headphones },
  { id: 'snacks', name: 'Snacks', icon: Cookie }
];

// Sample products
const sampleProducts: Record<string, any[]> = {
  supplements: [
    { id: 's1', name: 'Whey Protein 2kg', price: 149, stock: 25 },
    { id: 's2', name: 'Creatine Monohydrate', price: 89, stock: 18 },
    { id: 's3', name: 'BCAA Powder', price: 79, stock: 12 },
    { id: 's4', name: 'Pre-Workout Energy', price: 119, stock: 8 },
    { id: 's5', name: 'Mass Gainer', price: 159, stock: 15 },
    { id: 's6', name: 'Multivitamins', price: 65, stock: 30 }
  ],
  equipment: [
    { id: 'e1', name: 'Resistance Bands', price: 45, stock: 15 },
    { id: 'e2', name: 'Yoga Mat Premium', price: 85, stock: 22 },
    { id: 'e3', name: 'Water Bottle 1L', price: 25, stock: 35 },
    { id: 'e4', name: 'Gym Gloves Pro', price: 65, stock: 18 },
    { id: 'e5', name: 'Jump Rope', price: 35, stock: 20 },
    { id: 'e6', name: 'Foam Roller', price: 95, stock: 12 }
  ],
  apparel: [
    { id: 'a1', name: 'Gym T-Shirt', price: 95, stock: 28 },
    { id: 'a2', name: 'Workout Shorts', price: 75, stock: 20 },
    { id: 'a3', name: 'Sports Bra', price: 125, stock: 15 },
    { id: 'a4', name: 'Gym Hoodie', price: 185, stock: 12 },
    { id: 'a5', name: 'Training Pants', price: 145, stock: 16 },
    { id: 'a6', name: 'Sports Socks (3-Pack)', price: 45, stock: 40 }
  ],
  beverages: [
    { id: 'b1', name: 'Protein Shake', price: 35, stock: 45 },
    { id: 'b2', name: 'Energy Drink', price: 15, stock: 60 },
    { id: 'b3', name: 'Coconut Water', price: 12, stock: 40 },
    { id: 'b4', name: 'Green Juice', price: 28, stock: 25 },
    { id: 'b5', name: 'Isotonic Drink', price: 18, stock: 35 },
    { id: 'b6', name: 'Cold Brew Coffee', price: 22, stock: 30 }
  ],
  accessories: [
    { id: 'ac1', name: 'Fitness Tracker', price: 299, stock: 8 },
    { id: 'ac2', name: 'Gym Bag Large', price: 155, stock: 12 },
    { id: 'ac3', name: 'Bluetooth Headphones', price: 225, stock: 6 },
    { id: 'ac4', name: 'Gym Towel Set', price: 45, stock: 30 },
    { id: 'ac5', name: 'Shaker Bottle', price: 35, stock: 25 },
    { id: 'ac6', name: 'Lifting Belt', price: 125, stock: 10 }
  ],
  snacks: [
    { id: 'sn1', name: 'Protein Bar', price: 18, stock: 50 },
    { id: 'sn2', name: 'Mixed Nuts Pack', price: 25, stock: 35 },
    { id: 'sn3', name: 'Fresh Banana', price: 5, stock: 80 },
    { id: 'sn4', name: 'Energy Balls (5-Pack)', price: 22, stock: 25 },
    { id: 'sn5', name: 'Granola Bar', price: 15, stock: 45 },
    { id: 'sn6', name: 'Rice Cakes', price: 20, stock: 30 }
  ]
};

// Sample customers
const sampleCustomers = [
  { id: 'c1', name: 'Walk-in Customer', phone: '', balance: 0, membershipId: '' },
  { id: 'c2', name: 'Sarah Johnson', phone: '+971 50 123 4567', balance: 245.50, membershipId: 'MEM-001' },
  { id: 'c3', name: 'Alex Martinez', phone: '+971 55 987 6543', balance: 180.00, membershipId: 'MEM-002' },
  { id: 'c4', name: 'Emma Wilson', phone: '+971 52 456 7890', balance: 320.75, membershipId: 'MEM-003' }
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
}

interface Invoice {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
}

interface POSSession {
  id: string;
  openingCash: number;
  openingDenominations: Record<string, number>;
  startTime: string;
  status: 'active' | 'closed';
}

export function PointOfSale() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'touch-screen' | 'z-report' | 'x-report' | 'customer' | 'cash-drop'>('dashboard');
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null);
  const [showStartSessionDialog, setShowStartSessionDialog] = useState(false);
  const [showCloseSessionDialog, setShowCloseSessionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCashDropDialog, setShowCashDropDialog] = useState(false);

  // Session opening/closing states
  const [openingCash, setOpeningCash] = useState('');
  const [denominations, setDenominations] = useState({
    '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0
  });
  const [closingDenominations, setClosingDenominations] = useState({
    '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0
  });

  // Touch screen POS states
  const [selectedCategory, setSelectedCategory] = useState('supplements');
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    items: [],
    subtotal: 0,
    totalDiscount: 0,
    tax: 0,
    total: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState('c1');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [heldInvoices, setHeldInvoices] = useState<Invoice[]>([]);

  // Cash drop/out states
  const [cashDropType, setCashDropType] = useState<'in' | 'out'>('in');
  const [cashDropAmount, setCashDropAmount] = useState('');
  const [cashDropDescription, setCashDropDescription] = useState('');

  // Sample session data for reports
  const [sessionTransactions] = useState([
    { id: 'TXN001', time: '09:15', customer: 'Walk-in', items: 3, amount: 285.00, payment: 'Cash' },
    { id: 'TXN002', time: '09:32', customer: 'Sarah Johnson', items: 1, amount: 149.00, payment: 'Card' },
    { id: 'TXN003', time: '09:45', customer: 'Walk-in', items: 2, amount: 110.00, payment: 'Cash' },
    { id: 'TXN004', time: '10:12', customer: 'Alex Martinez', items: 4, amount: 356.00, payment: 'Card' },
    { id: 'TXN005', time: '10:28', customer: 'Walk-in', items: 1, amount: 45.00, payment: 'Cash' }
  ]);

  const formatCurrency = (amount: number) => `AED ${amount.toFixed(2)}`;

  const calculateDenominationTotal = (denom: Record<string, number>) => {
    return Object.entries(denom).reduce((total, [note, count]) => {
      return total + (parseInt(note) * count);
    }, 0);
  };

  const handleStartSession = () => {
    const total = calculateDenominationTotal(denominations);
    const newSession: POSSession = {
      id: `SES-${Date.now()}`,
      openingCash: total,
      openingDenominations: { ...denominations },
      startTime: new Date().toISOString(),
      status: 'active'
    };
    setCurrentSession(newSession);
    setShowStartSessionDialog(false);
    setCurrentView('touch-screen');
  };

  const handleCloseSession = () => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, status: 'closed' });
      setShowCloseSessionDialog(false);
      setCurrentView('x-report');
    }
  };

  const addToInvoice = (product: any) => {
    setCurrentInvoice(prev => {
      const existingItem = prev.items.find(item => item.id === product.id);
      let newItems;
      
      if (existingItem) {
        newItems = prev.items.map(item =>
          item.id === product.id 
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price * (1 - item.discount / 100)
              }
            : item
        );
      } else {
        newItems = [...prev.items, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          discount: 0,
          total: product.price
        }];
      }
      
      return recalculateInvoice(newItems);
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromInvoice(itemId);
      return;
    }
    
    setCurrentInvoice(prev => {
      const newItems = prev.items.map(item =>
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity,
              total: newQuantity * item.price * (1 - item.discount / 100)
            }
          : item
      );
      return recalculateInvoice(newItems);
    });
  };

  const updateDiscount = (itemId: string, discount: number) => {
    setCurrentInvoice(prev => {
      const newItems = prev.items.map(item =>
        item.id === itemId 
          ? { 
              ...item, 
              discount,
              total: item.quantity * item.price * (1 - discount / 100)
            }
          : item
      );
      return recalculateInvoice(newItems);
    });
  };

  const removeFromInvoice = (itemId: string) => {
    setCurrentInvoice(prev => {
      const newItems = prev.items.filter(item => item.id !== itemId);
      return recalculateInvoice(newItems);
    });
  };

  const recalculateInvoice = (items: CartItem[]): Invoice => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
    const tax = (subtotal - totalDiscount) * 0.05;
    const total = subtotal - totalDiscount + tax;
    
    return { items, subtotal, totalDiscount, tax, total };
  };

  const clearInvoice = () => {
    setCurrentInvoice({
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      tax: 0,
      total: 0
    });
  };

  const holdInvoice = () => {
    if (currentInvoice.items.length > 0) {
      setHeldInvoices([...heldInvoices, currentInvoice]);
      clearInvoice();
    }
  };

  const recallInvoice = (index: number) => {
    setCurrentInvoice(heldInvoices[index]);
    setHeldInvoices(heldInvoices.filter((_, i) => i !== index));
  };

  const processPayment = () => {
    if (currentInvoice.items.length > 0) {
      // Process payment logic here
      alert(`Payment processed successfully! Total: ${formatCurrency(currentInvoice.total)}`);
      clearInvoice();
      setShowPaymentDialog(false);
      setReceivedAmount('');
    }
  };

  const handleCashDrop = () => {
    // Process cash drop/out
    alert(`Cash ${cashDropType === 'in' ? 'Drop' : 'Out'} recorded: ${formatCurrency(parseFloat(cashDropAmount) || 0)}`);
    setCashDropAmount('');
    setCashDropDescription('');
    setShowCashDropDialog(false);
  };

  const filteredProducts = sampleProducts[selectedCategory]?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedCustomerData = sampleCustomers.find(c => c.id === selectedCustomer);

  // Dashboard View
  const renderDashboard = () => (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-[#1E293B] mb-2">Point of Sale</h1>
        <p className="text-gray-600">Retail POS dashboard and session management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Start/Continue Session Tile */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78]"
          onClick={() => {
            if (currentSession?.status === 'active') {
              setCurrentView('touch-screen');
            } else {
              setShowStartSessionDialog(true);
            }
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-r from-[#2B7A78] to-[#17a2b8] p-4 rounded-lg">
                {currentSession?.status === 'active' ? (
                  <Play className="h-8 w-8 text-white" />
                ) : (
                  <Unlock className="h-8 w-8 text-white" />
                )}
              </div>
              {currentSession?.status === 'active' && (
                <Badge className="bg-green-500">Active</Badge>
              )}
            </div>
            <CardTitle className="mt-4">
              {currentSession?.status === 'active' ? 'Continue Session' : 'Start Session'}
            </CardTitle>
            <CardDescription>
              {currentSession?.status === 'active' 
                ? 'Resume your active POS session' 
                : 'Open cash drawer and start new session'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentSession?.status === 'active' && (
              <div className="text-sm space-y-1">
                <p className="text-gray-600">Opening Cash: {formatCurrency(currentSession.openingCash)}</p>
                <p className="text-gray-600">Started: {new Date(currentSession.startTime).toLocaleTimeString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Z-Report Tile */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78]"
          onClick={() => setCurrentView('z-report')}
        >
          <CardHeader>
            <div className="bg-gradient-to-r from-[#2B7A78] to-[#17a2b8] p-4 rounded-lg w-fit">
              <FileBarChart className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="mt-4">Z-Report</CardTitle>
            <CardDescription>
              Generate end-of-day summary report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Consolidated report of all closed sessions
            </p>
          </CardContent>
        </Card>

        {/* X-Report / Close Session Tile */}
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78] ${
            currentSession?.status !== 'active' ? 'opacity-50' : ''
          }`}
          onClick={() => {
            if (currentSession?.status === 'active') {
              setShowCloseSessionDialog(true);
            }
          }}
        >
          <CardHeader>
            <div className="bg-gradient-to-r from-[#E63946] to-[#ff6b6b] p-4 rounded-lg w-fit">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="mt-4">X-Report / Close Session</CardTitle>
            <CardDescription>
              Close current session and generate report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {currentSession?.status === 'active' 
                ? 'End session with denomination count' 
                : 'No active session to close'}
            </p>
          </CardContent>
        </Card>

        {/* Customer Tile */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78]"
          onClick={() => setCurrentView('customer')}
        >
          <CardHeader>
            <div className="bg-gradient-to-r from-[#2B7A78] to-[#17a2b8] p-4 rounded-lg w-fit">
              <Users className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="mt-4">Customer</CardTitle>
            <CardDescription>
              Manage customer transactions and statements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              View statements, receive payments, manage advances
            </p>
          </CardContent>
        </Card>

        {/* Cash Drop / Out Tile */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78]"
          onClick={() => setShowCashDropDialog(true)}
        >
          <CardHeader>
            <div className="bg-gradient-to-r from-[#2B7A78] to-[#17a2b8] p-4 rounded-lg w-fit">
              <Archive className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="mt-4">Cash Drop / Out</CardTitle>
            <CardDescription>
              Record cash movements and expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Add cash drops or record cash payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {currentSession?.status === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Sales</p>
                  <p className="text-2xl mt-1 text-[#1E293B]">AED 945.00</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#2B7A78]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl mt-1 text-[#1E293B]">12</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-[#2B7A78]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash in Drawer</p>
                  <p className="text-2xl mt-1 text-[#1E293B]">AED 1,245.00</p>
                </div>
                <Wallet className="h-8 w-8 text-[#2B7A78]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Session Duration</p>
                  <p className="text-2xl mt-1 text-[#1E293B]">3h 45m</p>
                </div>
                <Clock className="h-8 w-8 text-[#2B7A78]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // Touch Screen POS Interface
  const renderTouchScreen = () => (
    <div className="h-screen flex flex-col bg-[#F9FAFB]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentView('dashboard')}
              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78] hover:text-white"
            >
              ← Dashboard
            </Button>
            <div>
              <p className="text-[#1E293B]">Session: {currentSession?.id}</p>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentView('z-report')}
              className="border-[#2B7A78] text-[#2B7A78]"
            >
              <FileBarChart className="h-4 w-4 mr-2" />
              Z Report
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCloseSessionDialog(true)}
              className="border-[#E63946] text-[#E63946]"
            >
              <Lock className="h-4 w-4 mr-2" />
              Close Session
            </Button>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex space-x-2 overflow-x-auto">
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]">
            <RotateCcw className="h-4 w-4 mr-2" />
            Sales Return
          </Button>
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]">
            <Archive className="h-4 w-4 mr-2" />
            Handle Returns
          </Button>
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]">
            <Printer className="h-4 w-4 mr-2" />
            Reprint Invoice
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={holdInvoice}
            disabled={currentInvoice.items.length === 0}
            className="border-[#2B7A78] text-[#2B7A78]"
          >
            <Pause className="h-4 w-4 mr-2" />
            Hold ({heldInvoices.length})
          </Button>
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]">
            <Search className="h-4 w-4 mr-2" />
            Price Check
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCashDropDialog(true)}
            className="border-[#2B7A78] text-[#2B7A78]"
          >
            <Archive className="h-4 w-4 mr-2" />
            Cash Drop
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Categories */}
        <div className="w-48 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-3 space-y-2">
            {productCategories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                className={`w-full justify-start h-auto py-3 ${
                  selectedCategory === category.id 
                    ? 'bg-[#2B7A78] hover:bg-[#236862] text-white' 
                    : 'border-gray-200'
                }`}
              >
                <category.icon className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="text-sm">{category.name}</div>
                  <div className="text-xs opacity-75">
                    {sampleProducts[category.id]?.length || 0} items
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Center Panel - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-[#2B7A78]"
                  onClick={() => addToInvoice(product)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-white rounded-lg mb-3 flex items-center justify-center border-2 border-gray-100">
                      <Package className="h-12 w-12 text-[#2B7A78] opacity-30" />
                    </div>
                    <h3 className="text-sm mb-2 line-clamp-2 text-[#1E293B]">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-lg text-[#2B7A78]">{formatCurrency(product.price)}</p>
                      <Badge 
                        variant={product.stock > 10 ? 'default' : 'destructive'}
                        className={product.stock > 10 ? 'bg-[#2B7A78]' : ''}
                      >
                        {product.stock}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Customer Selection */}
          <div className="p-4 border-b border-gray-200">
            <Label className="text-[#1E293B]">Customer</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sampleCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{customer.name}</span>
                      {customer.membershipId && (
                        <Badge className="ml-2 bg-[#2B7A78]">Member</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomerData && selectedCustomerData.balance > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                <p className="text-[#1E293B]">Balance: {formatCurrency(selectedCustomerData.balance)}</p>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-[#1E293B]">Current Sale</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearInvoice}
                disabled={currentInvoice.items.length === 0}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              {currentInvoice.items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p>No items added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentInvoice.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-[#F9FAFB]">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm text-[#1E293B]">{item.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromInvoice(item.id)}
                          className="h-6 w-6 p-0 text-[#E63946]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm text-gray-600">{formatCurrency(item.price)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Percent className="h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.discount}
                            onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                            className="h-6 w-16 text-xs"
                            min="0"
                            max="100"
                          />
                        </div>
                        <span className="text-[#2B7A78]">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Totals and Payment */}
          {currentInvoice.items.length > 0 && (
            <>
              <div className="p-4 border-t border-gray-200 space-y-2 bg-[#F9FAFB]">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(currentInvoice.subtotal)}</span>
                </div>
                {currentInvoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-[#E63946]">
                    <span>Discount:</span>
                    <span>-{formatCurrency(currentInvoice.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>VAT (5%):</span>
                  <span>{formatCurrency(currentInvoice.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg text-[#1E293B]">
                  <span>Total:</span>
                  <span>{formatCurrency(currentInvoice.total)}</span>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 space-y-3">
                {/* Held Invoices Recall */}
                {heldInvoices.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">Held Invoices</Label>
                    <div className="flex gap-2 flex-wrap">
                      {heldInvoices.map((_, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => recallInvoice(index)}
                          className="border-[#2B7A78] text-[#2B7A78]"
                        >
                          Recall #{index + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={holdInvoice}
                    className="border-[#2B7A78] text-[#2B7A78]"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Hold
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={clearInvoice}
                    className="border-[#E63946] text-[#E63946]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <Button 
                  onClick={() => setShowPaymentDialog(true)}
                  className="w-full h-12 bg-[#2B7A78] hover:bg-[#236862] text-white"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment ({formatCurrency(currentInvoice.total)})
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Z-Report View
  const renderZReport = () => (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-[#1E293B] mb-2">Z-Report</h1>
          <p className="text-gray-600">End-of-day consolidated summary</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setCurrentView('dashboard')}
            className="border-[#2B7A78] text-[#2B7A78]"
          >
            ← Back to Dashboard
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Net Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#2B7A78]">AED 12,485.50</p>
            <p className="text-sm text-gray-600 mt-1">Across all sessions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#E63946]">AED 285.00</p>
            <p className="text-sm text-gray-600 mt-1">3 return transactions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]">48</p>
            <p className="text-sm text-gray-600 mt-1">Today's transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Payment Mode Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#1E293B]">Payment Method</TableHead>
                <TableHead className="text-[#1E293B] text-right">Transactions</TableHead>
                <TableHead className="text-[#1E293B] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-[#1E293B]">
                  <div className="flex items-center">
                    <Banknote className="h-4 w-4 mr-2 text-[#2B7A78]" />
                    Cash
                  </div>
                </TableCell>
                <TableCell className="text-right">28</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 6,340.50</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-[#2B7A78]" />
                    Card
                  </div>
                </TableCell>
                <TableCell className="text-right">15</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 4,890.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 mr-2 text-[#2B7A78]" />
                    Digital Wallet
                  </div>
                </TableCell>
                <TableCell className="text-right">5</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 1,255.00</TableCell>
              </TableRow>
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#1E293B]">Total</TableCell>
                <TableCell className="text-right">48</TableCell>
                <TableCell className="text-right text-[#1E293B]">AED 12,485.50</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Department-wise Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#1E293B]">Category</TableHead>
                <TableHead className="text-[#1E293B] text-right">Units Sold</TableHead>
                <TableHead className="text-[#1E293B] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-[#1E293B]">Supplements</TableCell>
                <TableCell className="text-right">45</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 5,240.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">Equipment</TableCell>
                <TableCell className="text-right">32</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 2,890.50</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">Apparel</TableCell>
                <TableCell className="text-right">28</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 2,655.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">Beverages</TableCell>
                <TableCell className="text-right">65</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 1,120.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">Accessories</TableCell>
                <TableCell className="text-right">18</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 390.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-[#1E293B]">Snacks</TableCell>
                <TableCell className="text-right">42</TableCell>
                <TableCell className="text-right text-[#2B7A78]">AED 190.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Cash Movement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Total Cash Drops (IN)</span>
              <span className="text-[#2B7A78]">AED 500.00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Total Cash Out (Expenses)</span>
              <span className="text-[#E63946]">AED 150.00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Expected Cash Balance</span>
              <span className="text-[#1E293B]">AED 6,690.50</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // X-Report View (Session Close Report)
  const renderXReport = () => (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-[#1E293B] mb-2">X-Report - Session Close</h1>
          <p className="text-gray-600">Session: {currentSession?.id}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setCurrentView('dashboard')}
            className="border-[#2B7A78] text-[#2B7A78]"
          >
            ← Back to Dashboard
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Opening Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]">{formatCurrency(currentSession?.openingCash || 0)}</p>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(currentSession?.startTime || '').toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#2B7A78]">AED 945.00</p>
            <p className="text-sm text-gray-600 mt-1">5 transactions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Expected Closing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]">
              {formatCurrency((currentSession?.openingCash || 0) + 945)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Expected cash balance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Session Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#1E293B]">Transaction ID</TableHead>
                <TableHead className="text-[#1E293B]">Time</TableHead>
                <TableHead className="text-[#1E293B]">Customer</TableHead>
                <TableHead className="text-[#1E293B] text-right">Items</TableHead>
                <TableHead className="text-[#1E293B] text-right">Amount</TableHead>
                <TableHead className="text-[#1E293B]">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-[#1E293B]">{txn.id}</TableCell>
                  <TableCell>{txn.time}</TableCell>
                  <TableCell>{txn.customer}</TableCell>
                  <TableCell className="text-right">{txn.items}</TableCell>
                  <TableCell className="text-right text-[#2B7A78]">
                    {formatCurrency(txn.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={txn.payment === 'Cash' ? 'bg-[#2B7A78]' : 'bg-blue-500'}>
                      {txn.payment}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Supplements</span>
              <span className="text-[#2B7A78]">AED 416.00 (12 units)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Equipment</span>
              <span className="text-[#2B7A78]">AED 285.00 (6 units)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Beverages</span>
              <span className="text-[#2B7A78]">AED 244.00 (14 units)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E293B]">Cash Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Opening Cash</span>
              <span className="text-[#1E293B]">{formatCurrency(currentSession?.openingCash || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Total Cash Sales</span>
              <span className="text-[#2B7A78]">AED 480.00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Cash Drops (IN)</span>
              <span className="text-[#2B7A78]">AED 0.00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Cash Out (Expenses)</span>
              <span className="text-[#E63946]">AED 0.00</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center p-3 bg-[#2B7A78] text-white rounded">
              <span className="">Expected Cash Balance</span>
              <span className="">
                {formatCurrency((currentSession?.openingCash || 0) + 480)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
              <span className="text-[#1E293B]">Actual Cash (From Denomination Count)</span>
              <span className="text-[#1E293B]">
                {formatCurrency(calculateDenominationTotal(closingDenominations))}
              </span>
            </div>
            {calculateDenominationTotal(closingDenominations) !== ((currentSession?.openingCash || 0) + 480) && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-[#E63946]">
                <span className="text-[#E63946]">Variance</span>
                <span className="text-[#E63946]">
                  {formatCurrency(
                    calculateDenominationTotal(closingDenominations) - ((currentSession?.openingCash || 0) + 480)
                  )}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Customer Management View
  const renderCustomer = () => (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-[#1E293B] mb-2">Customer Management</h1>
          <p className="text-gray-600">View statements, receive payments, and manage advances</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentView('dashboard')}
          className="border-[#2B7A78] text-[#2B7A78]"
        >
          ← Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="list" className="data-[state=active]:bg-[#2B7A78] data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" />
            Customer List
          </TabsTrigger>
          <TabsTrigger value="receipt" className="data-[state=active]:bg-[#2B7A78] data-[state=active]:text-white">
            <Receipt className="h-4 w-4 mr-2" />
            Customer Receipt
          </TabsTrigger>
          <TabsTrigger value="advance" className="data-[state=active]:bg-[#2B7A78] data-[state=active]:text-white">
            <Wallet className="h-4 w-4 mr-2" />
            Receive Advance
          </TabsTrigger>
          <TabsTrigger value="statement" className="data-[state=active]:bg-[#2B7A78] data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Customer Statement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1E293B]">All Customers</CardTitle>
                <div className="flex space-x-2">
                  <Input placeholder="Search customers..." className="w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#1E293B]">Customer Name</TableHead>
                    <TableHead className="text-[#1E293B]">Membership ID</TableHead>
                    <TableHead className="text-[#1E293B]">Phone</TableHead>
                    <TableHead className="text-[#1E293B] text-right">Balance</TableHead>
                    <TableHead className="text-[#1E293B]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleCustomers.filter(c => c.id !== 'c1').map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-[#1E293B]">{customer.name}</TableCell>
                      <TableCell>{customer.membershipId || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={customer.balance > 0 ? 'text-[#2B7A78]' : ''}>
                          {formatCurrency(customer.balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                            View
                          </Button>
                          <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236862] text-white">
                            Statement
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

        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E293B]">Record Customer Payment</CardTitle>
              <CardDescription>Receive payment from customer account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#1E293B]">Select Customer</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleCustomers.filter(c => c.id !== 'c1').map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - Balance: {formatCurrency(customer.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1E293B]">Payment Amount (AED)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-[#1E293B]">Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#1E293B]">Notes (Optional)</Label>
                <Input placeholder="Payment notes..." />
              </div>

              <Button className="w-full bg-[#2B7A78] hover:bg-[#236862] text-white">
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advance">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E293B]">Receive Advance Payment</CardTitle>
              <CardDescription>Accept advance deposit for future purchases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#1E293B]">Select Customer</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleCustomers.filter(c => c.id !== 'c1').map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1E293B]">Advance Amount (AED)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-[#1E293B]">Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#1E293B]">Purpose</Label>
                <Input placeholder="Purpose of advance payment..." />
              </div>

              <Button className="w-full bg-[#2B7A78] hover:bg-[#236862] text-white">
                <Wallet className="h-4 w-4 mr-2" />
                Receive Advance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E293B]">Generate Customer Statement</CardTitle>
              <CardDescription>View transaction summary and balance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#1E293B]">Select Customer</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleCustomers.filter(c => c.id !== 'c1').map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1E293B]">From Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label className="text-[#1E293B]">To Date</Label>
                  <Input type="date" />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button className="flex-1 bg-[#2B7A78] hover:bg-[#236862] text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  View Statement
                </Button>
                <Button variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Render current view */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'touch-screen' && renderTouchScreen()}
      {currentView === 'z-report' && renderZReport()}
      {currentView === 'x-report' && renderXReport()}
      {currentView === 'customer' && renderCustomer()}

      {/* Start Session Dialog */}
      <Dialog open={showStartSessionDialog} onOpenChange={setShowStartSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Start New POS Session</DialogTitle>
            <DialogDescription>
              Enter opening cash drawer amount and denomination breakdown
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#1E293B]">Opening Cash Drawer Amount</Label>
              <Input
                type="number"
                value={calculateDenominationTotal(denominations)}
                disabled
                className="text-lg"
              />
            </div>

            <Separator />

            <div>
              <Label className="text-[#1E293B] mb-3 block">Denomination Breakdown</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(denominations).map((note) => (
                  <div key={note} className="flex items-center space-x-3">
                    <Label className="w-24 text-[#1E293B]">AED {note}:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations[note as keyof typeof denominations]}
                      onChange={(e) =>
                        setDenominations({
                          ...denominations,
                          [note]: parseInt(e.target.value) || 0
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-24 text-right text-sm text-gray-600">
                      = AED {(parseInt(note) * denominations[note as keyof typeof denominations]).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2B7A78] text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Total Opening Cash:</span>
                <span className="text-2xl">
                  {formatCurrency(calculateDenominationTotal(denominations))}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStartSessionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSession}
              className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseSessionDialog} onOpenChange={setShowCloseSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Close POS Session</DialogTitle>
            <DialogDescription>
              Enter closing cash denomination count to close session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#1E293B] mb-3 block">Closing Denomination Count</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(closingDenominations).map((note) => (
                  <div key={note} className="flex items-center space-x-3">
                    <Label className="w-24 text-[#1E293B]">AED {note}:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={closingDenominations[note as keyof typeof closingDenominations]}
                      onChange={(e) =>
                        setClosingDenominations({
                          ...closingDenominations,
                          [note]: parseInt(e.target.value) || 0
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-24 text-right text-sm text-gray-600">
                      = AED {(parseInt(note) * closingDenominations[note as keyof typeof closingDenominations]).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">Expected Cash:</span>
                <span className="text-[#1E293B]">
                  {formatCurrency((currentSession?.openingCash || 0) + 480)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">Actual Cash (Counted):</span>
                <span className="text-[#2B7A78]">
                  {formatCurrency(calculateDenominationTotal(closingDenominations))}
                </span>
              </div>
              {calculateDenominationTotal(closingDenominations) !== ((currentSession?.openingCash || 0) + 480) && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-[#E63946]">
                  <span className="text-[#E63946]">Variance:</span>
                  <span className="text-[#E63946]">
                    {formatCurrency(
                      calculateDenominationTotal(closingDenominations) - ((currentSession?.openingCash || 0) + 480)
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseSessionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseSession}
              className="bg-[#E63946] hover:bg-[#d32f3d] text-white"
            >
              <Lock className="h-4 w-4 mr-2" />
              Close Session & Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Process Payment</DialogTitle>
            <DialogDescription>
              Total Amount: {formatCurrency(currentInvoice.total)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#1E293B]">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center">
                      <Banknote className="h-4 w-4 mr-2" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Credit/Debit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="digital">
                    <div className="flex items-center">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Digital Wallet
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod === 'cash' && (
              <div>
                <Label className="text-[#1E293B]">Amount Received</Label>
                <Input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.00"
                />
                {parseFloat(receivedAmount) > currentInvoice.total && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <p className="text-sm text-green-700">
                      Change: {formatCurrency(parseFloat(receivedAmount) - currentInvoice.total)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={processPayment}
              className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Drop/Out Dialog */}
      <Dialog open={showCashDropDialog} onOpenChange={setShowCashDropDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Cash Drop / Out</DialogTitle>
            <DialogDescription>
              Record cash movements other than sales
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#1E293B]">Type</Label>
              <Select value={cashDropType} onValueChange={(val) => setCashDropType(val as 'in' | 'out')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">
                    <div className="flex items-center">
                      <ArrowDown className="h-4 w-4 mr-2 text-[#2B7A78]" />
                      Cash Drop (IN) - Add cash to drawer
                    </div>
                  </SelectItem>
                  <SelectItem value="out">
                    <div className="flex items-center">
                      <ArrowUp className="h-4 w-4 mr-2 text-[#E63946]" />
                      Cash Out - Pay for expenses
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1E293B]">Amount (AED)</Label>
              <Input
                type="number"
                value={cashDropAmount}
                onChange={(e) => setCashDropAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label className="text-[#1E293B]">Description / Purpose</Label>
              <Input
                value={cashDropDescription}
                onChange={(e) => setCashDropDescription(e.target.value)}
                placeholder={cashDropType === 'in' ? 'e.g., Cash from admin safe' : 'e.g., Office supplies, Cleaning'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCashDropDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashDrop}
              className={cashDropType === 'in' ? 'bg-[#2B7A78] hover:bg-[#236862] text-white' : 'bg-[#E63946] hover:bg-[#d32f3d] text-white'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Record {cashDropType === 'in' ? 'Cash Drop' : 'Cash Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

