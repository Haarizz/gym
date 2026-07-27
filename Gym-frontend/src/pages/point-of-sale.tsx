import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency, CurrencyValue, CurrencyGlyph } from '../utils/currency';
import { toast } from 'sonner';
import { posService, PosSession as PosSessionType, SaleTransactionRequest, SaleTransaction } from '../utils/supabase/pos-service';
import { productsService, Product } from '../utils/supabase/products-service';
import { membersService } from '../utils/supabase/members-service';
import { useFavorites } from '../hooks/useFavorites';
import { POSProductCard } from '../components/shared/POSProductCard';
import { SplitPaymentFields, isSplitPaymentValid, buildSplitPaymentBreakdown } from '../components/shared/split-payment-fields';
import type { SplitPaymentValue } from '../components/shared/split-payment-fields';
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
  Unlock,
  Heart,
  FileCheck,
  Split
} from 'lucide-react';

interface CashMovement {
  id: number;
  posSessionId: number;
  type: 'DROP_IN' | 'CASH_OUT';
  amount: number;
  reason?: string;
  createdAt: string;
}

interface PaymentBreakdown {
  paymentMethod: string;
  transactionCount: number;
  totalAmount: number;
}

interface CategoryBreakdown {
  categoryName: string;
  unitsSold: number;
  totalAmount: number;
}

interface SessionReport {
  totalSales: number;
  totalReturns: number;
  netSales: number;
  transactionCount: number;
  returnCount: number;
  paymentBreakdown: PaymentBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  cashMovements: CashMovement[];
  totalCashDrops: number;
  totalCashOuts: number;
  cashSales: number;
  expectedCash: number;
}

// Product categories for touch screen
const productCategories = [
  { id: 'supplements', name: 'Supplements', icon: Package },
  { id: 'equipment', name: 'Equipment', icon: Dumbbell },
  { id: 'apparel', name: 'Apparel', icon: Shirt },
  { id: 'beverages', name: 'Beverages', icon: Droplets },
  { id: 'accessories', name: 'Accessories', icon: Headphones },
  { id: 'snacks', name: 'Snacks', icon: Cookie }
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  productId?: number; // database ID for API calls
  sku?: string;
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
  apiId?: number; // numeric ID from backend
  openingCash: number;
  openingDenominations: Record<string, number>;
  startTime: string;
  status: 'active' | 'closed';
}

export function PointOfSale() {
  const { currencyCode } = useCurrency();
  const [currentView, setCurrentView] = useState<'dashboard' | 'touch-screen' | 'z-report' | 'x-report' | 'customer' | 'cash-drop'>('dashboard');
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null);
  const [showStartSessionDialog, setShowStartSessionDialog] = useState(false);
  const [showCloseSessionDialog, setShowCloseSessionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCashDropDialog, setShowCashDropDialog] = useState(false);

  // API data states
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchedMembers, setSearchedMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string; memberId: string } | null>(null);
  const [walkInSelected, setWalkInSelected] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

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
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();
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
  const [splitPayment, setSplitPayment] = useState<SplitPaymentValue>({ cash: 0, card: 0, cheque: 0 });
  const [splitChequeRef, setSplitChequeRef] = useState('');
  const [heldInvoices, setHeldInvoices] = useState<Invoice[]>([]);

  // Cash drop/out states
  const [cashDropType, setCashDropType] = useState<'in' | 'out'>('in');
  const [cashDropAmount, setCashDropAmount] = useState('');
  const [cashDropDescription, setCashDropDescription] = useState('');

  // Report & real transaction states
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [realTransactions, setRealTransactions] = useState<SaleTransaction[]>([]);

  // Sales Return / Refund dialog
  const [showSalesReturnDialog, setShowSalesReturnDialog] = useState(false);
  const [returnFilter, setReturnFilter] = useState('');
  const [refundingId, setRefundingId] = useState<number | null>(null);
  // Reprint Invoice dialog
  const [showReprintDialog, setShowReprintDialog] = useState(false);
  const [reprintFilter, setReprintFilter] = useState('');
  // Price Check dialog
  const [showPriceCheckDialog, setShowPriceCheckDialog] = useState(false);
  const [priceCheckSearch, setPriceCheckSearch] = useState('');
  // Customer View dialog
  const [showCustomerViewDialog, setShowCustomerViewDialog] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  // Customer management tabs
  const [activeCustomerTab, setActiveCustomerTab] = useState('list');
  const [statementCustomerId, setStatementCustomerId] = useState('');
  const [statementTransactions, setStatementTransactions] = useState<SaleTransaction[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  // Record Payment tab
  const [recordPayCustomerId, setRecordPayCustomerId] = useState('');
  const [recordPayAmount, setRecordPayAmount] = useState('');
  const [recordPayMethod, setRecordPayMethod] = useState('cash');
  const [recordPayNotes, setRecordPayNotes] = useState('');
  // Receive Advance tab
  const [advanceCustomerId, setAdvanceCustomerId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('cash');
  const [advancePurpose, setAdvancePurpose] = useState('');

  // Load customers when customer view becomes active
  useEffect(() => {
    if (currentView === 'customer' && customersList.length === 0) {
      membersService.getMembers({}, { limit: 100 })
        .then(res => setCustomersList(res.members))
        .catch(() => {});
    }
  }, [currentView]);

  // Load products and active session on mount
  useEffect(() => {
    // Load API products
    setLoadingProducts(true);
    productsService.getProducts({ size: 200, status: 'ACTIVE', enabledForPos: true })
      .then(res => setApiProducts(res.products))
      .catch(() => {/* fall back to empty – UI shows no items */})
      .finally(() => setLoadingProducts(false));

    // Restore active session from backend
    posService.getActiveSesion()
      .then(session => {
        if (session) {
          setCurrentSession({
            id: session.sessionNumber || `SES-${session.id}`,
            apiId: session.id,
            openingCash: session.openingCash,
            openingDenominations: {},
            startTime: session.openedAt,
            status: 'active',
          });
        }
      })
      .catch(() => {/* no active session */});
  }, []);

  // Debounced member search
  useEffect(() => {
    if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current);
    if (!memberSearch.trim()) {
      setSearchedMembers([]);
      setShowMemberDropdown(false);
      return;
    }
    memberSearchTimer.current = setTimeout(async () => {
      try {
        const res = await membersService.getMembers({ search: memberSearch }, { limit: 10 });
        setSearchedMembers(res.members);
        setShowMemberDropdown(true);
      } catch {
        setSearchedMembers([]);
      }
    }, 400);
    return () => {
      if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current);
    };
  }, [memberSearch]);

  // Load session report when entering dashboard, x-report, or z-report with an active session
  useEffect(() => {
    if (currentSession?.apiId && (currentView === 'dashboard' || currentView === 'x-report' || currentView === 'z-report')) {
      loadSessionReport(currentSession.apiId);
    }
  }, [currentView, currentSession?.apiId]);

  const getSessionDuration = () => {
    if (!currentSession?.startTime) return '0m';
    const start = new Date(currentSession.startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateDenominationTotal = (denom: Record<string, number>) => {
    return Object.entries(denom).reduce((total, [note, count]) => {
      return total + (parseInt(note) * count);
    }, 0);
  };

  const handleStartSession = async () => {
    const total = calculateDenominationTotal(denominations);
    setSessionLoading(true);
    try {
      const session = await posService.openSession({
        openingCash: total,
        openingDenominations: JSON.stringify(denominations),
        staffName: 'Admin',
      });
      setCurrentSession({
        id: session.sessionNumber || `SES-${session.id}`,
        apiId: session.id,
        openingCash: session.openingCash,
        openingDenominations: { ...denominations },
        startTime: session.openedAt,
        status: 'active',
      });
      setShowStartSessionDialog(false);
      setCurrentView('touch-screen');
      toast.success('Session started successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start session');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    const closingTotal = calculateDenominationTotal(closingDenominations);
    setSessionLoading(true);
    try {
      if (currentSession.apiId) {
        await posService.closeSession(currentSession.apiId, {
          closingCash: closingTotal,
          closingDenominations: JSON.stringify(closingDenominations),
        });
      }
      setCurrentSession({ ...currentSession, status: 'closed' });
      setShowCloseSessionDialog(false);
      setCurrentView('x-report');
      toast.success('Session closed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close session');
    } finally {
      setSessionLoading(false);
    }
  };

  const addToInvoice = useCallback((product: any) => {
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
          id: String(product.id),
          name: product.name,
          price: product.sellingPrice ?? product.price,
          quantity: 1,
          discount: 0,
          total: product.sellingPrice ?? product.price,
          productId: typeof product.id === 'number' ? product.id : undefined,
          sku: product.sku,
        }];
      }
      
      return recalculateInvoice(newItems);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const processPayment = async () => {
    if (currentInvoice.items.length === 0) return;
    if (selectedPaymentMethod === 'mixed' && !isSplitPaymentValid(splitPayment, currentInvoice.total)) {
      toast.error('Split payment amounts must add up to the total amount');
      return;
    }
    setProcessingPayment(true);
    try {
      const paymentMethodMap: Record<string, 'CASH' | 'CARD' | 'ONLINE' | 'WALLET' | 'CHEQUE' | 'MIXED'> = {
        cash: 'CASH',
        card: 'CARD',
        digital: 'WALLET',
        online: 'ONLINE',
        cheque: 'CHEQUE',
        mixed: 'MIXED',
      };
      const req: SaleTransactionRequest = {
        posSessionId: currentSession?.apiId,
        memberId: selectedMember?.id,
        memberName: selectedMember?.name || 'Walk-in Customer',
        paymentMethod: paymentMethodMap[selectedPaymentMethod] || 'CASH',
        paymentBreakdown: selectedPaymentMethod === 'mixed'
          ? buildSplitPaymentBreakdown(splitPayment, splitChequeRef || undefined)
          : undefined,
        items: currentInvoice.items.map(item => ({
          productId: item.productId ?? 0,
          productName: item.name,
          productSku: item.sku ?? '',
          quantity: item.quantity,
          unitPrice: item.price,
          discountPercent: item.discount,
        })),
        subtotal: currentInvoice.subtotal,
        discountAmount: currentInvoice.totalDiscount,
        taxAmount: currentInvoice.tax,
        totalAmount: currentInvoice.total,
        receivedAmount: receivedAmount ? parseFloat(receivedAmount) : undefined,
      };
      const txn = await posService.createTransaction(req);
      toast.success(`Payment complete! Receipt: ${txn.transactionNumber}`);
      clearInvoice();
      setShowPaymentDialog(false);
      setReceivedAmount('');
      setSplitPayment({ cash: 0, card: 0, cheque: 0 });
      setSplitChequeRef('');
      setSelectedMember(null);
      setWalkInSelected(false);
      setMemberSearch('');
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const loadSessionReport = async (sessionApiId: number) => {
    setReportLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const { authService } = await import('../utils/supabase/auth-service');
      const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions/${sessionApiId}/report`);
      if (res.ok) {
        const raw = await res.json();
        const report: SessionReport = {
          totalSales: Number(raw.total_sales ?? raw.totalSales ?? 0),
          totalReturns: Number(raw.total_returns ?? raw.totalReturns ?? 0),
          netSales: Number(raw.net_sales ?? raw.netSales ?? 0),
          transactionCount: raw.transaction_count ?? raw.transactionCount ?? 0,
          returnCount: raw.return_count ?? raw.returnCount ?? 0,
          paymentBreakdown: (raw.payment_breakdown ?? raw.paymentBreakdown ?? []).map((p: any) => ({
            paymentMethod: p.payment_method ?? p.paymentMethod ?? '',
            transactionCount: p.transaction_count ?? p.transactionCount ?? 0,
            totalAmount: Number(p.total_amount ?? p.totalAmount ?? 0),
          })),
          categoryBreakdown: (raw.category_breakdown ?? raw.categoryBreakdown ?? []).map((c: any) => ({
            categoryName: c.category_name ?? c.categoryName ?? '',
            unitsSold: c.units_sold ?? c.unitsSold ?? 0,
            totalAmount: Number(c.total_amount ?? c.totalAmount ?? 0),
          })),
          cashMovements: (raw.cash_movements ?? raw.cashMovements ?? []).map((m: any) => ({
            id: m.id,
            posSessionId: m.pos_session_id ?? m.posSessionId,
            type: m.type,
            amount: Number(m.amount ?? 0),
            reason: m.reason,
            createdAt: m.created_at ?? m.createdAt ?? '',
          })),
          totalCashDrops: Number(raw.total_cash_drops ?? raw.totalCashDrops ?? 0),
          totalCashOuts: Number(raw.total_cash_outs ?? raw.totalCashOuts ?? 0),
          cashSales: Number(raw.cash_sales ?? raw.cashSales ?? 0),
          expectedCash: Number(raw.expected_cash ?? raw.expectedCash ?? 0),
        };
        setSessionReport(report);
        setCashMovements(report.cashMovements);
      }
      // Also load real transactions
      const txnPage = await posService.getSessionTransactions(sessionApiId, 1, 100);
      setRealTransactions(txnPage.transactions);
    } catch {/* silently fail */}
    finally { setReportLoading(false); }
  };

  const handleCashDrop = async () => {
    if (!currentSession?.apiId || !cashDropAmount) return;
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      const { authService } = await import('../utils/supabase/auth-service');
      const res = await authService.makeAuthenticatedRequest(
        `${BASE_URL}/pos/sessions/${currentSession.apiId}/cash-movements`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: cashDropType === 'in' ? 'DROP_IN' : 'CASH_OUT',
            amount: parseFloat(cashDropAmount),
            reason: cashDropDescription || undefined,
          }),
        }
      );
      if (res.ok) {
        toast.success(`Cash ${cashDropType === 'in' ? 'drop' : 'out'} recorded: ${currencyCode} ${parseFloat(cashDropAmount).toFixed(2)}`);
        setCashDropAmount('');
        setCashDropDescription('');
        setShowCashDropDialog(false);
        // Reload report data
        if (currentSession.apiId) loadSessionReport(currentSession.apiId);
      } else {
        toast.error('Failed to record cash movement');
      }
    } catch {
      toast.error('Failed to record cash movement');
    }
  };

  const handleRefundTransaction = async (txnId: number, txnNumber: string) => {
    setRefundingId(txnId);
    try {
      await posService.refundTransaction(txnId);
      toast.success(`Transaction ${txnNumber} refunded successfully`);
      setShowSalesReturnDialog(false);
      setReturnFilter('');
      if (currentSession?.apiId) loadSessionReport(currentSession.apiId);
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setRefundingId(null);
    }
  };

  const printReceipt = (txn: SaleTransaction) => {
    const items = (txn.items || []).map(item =>
      `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${currencyCode} ${Number(item.unitPrice).toFixed(2)}</td><td style="text-align:right">${currencyCode} ${Number(item.totalAmount).toFixed(2)}</td></tr>`
    ).join('');
    const w = window.open('', '_blank', 'width=420,height=650');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${txn.transactionNumber}</title>
      <style>body{font-family:monospace;margin:20px;max-width:320px}h2{text-align:center}table{width:100%;border-collapse:collapse}th,td{padding:4px 2px;font-size:12px}th{border-bottom:1px solid #000}p.right{text-align:right}@media print{button{display:none}}</style></head>
      <body><h2>GYM PRO</h2><p style="text-align:center">Sales Receipt</p><hr>
      <p>TXN: ${txn.transactionNumber}</p><p>Date: ${new Date(txn.createdAt).toLocaleString()}</p><p>Customer: ${txn.memberName}</p><p>Status: ${txn.status}</p><hr>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><hr>
      <p class="right">Subtotal: ${currencyCode} ${Number(txn.subtotal).toFixed(2)}</p>
      <p class="right">VAT (5%): ${currencyCode} ${Number(txn.taxAmount).toFixed(2)}</p>
      <p class="right" style="font-size:15px;font-weight:bold">TOTAL: ${currencyCode} ${Number(txn.totalAmount).toFixed(2)}</p>
      <p>Payment: ${txn.paymentMethod}</p><p style="text-align:center;margin-top:20px">Thank you for your visit!</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const printReport = (elementId: string, title: string) => {
    const el = document.getElementById(elementId);
    if (!el) { toast.error('Report content not found'); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#1E293B}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}th{background:#f9fafb}.card{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px}@media print{button{display:none}}</style></head>
      <body><h2>${title}</h2><p>Generated: ${new Date().toLocaleString()}</p>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const loadCustomerStatement = async () => {
    if (!statementCustomerId) { toast.error('Please select a customer'); return; }
    setStatementLoading(true);
    try {
      const customer = customersList.find(c => String(c.id) === statementCustomerId);
      if (!customer) return;
      const res = await posService.getTransactions({ search: customer.name, size: 100 });
      setStatementTransactions(res.transactions);
      if (res.transactions.length === 0) toast.info('No transactions found for this customer');
    } catch {
      toast.error('Failed to load statement');
    } finally {
      setStatementLoading(false);
    }
  };

  const printCustomerStatement = () => {
    const customer = customersList.find(c => String(c.id) === statementCustomerId);
    if (!customer || statementTransactions.length === 0) { toast.error('No statement data to print'); return; }
    const rows = statementTransactions.map(t =>
      `<tr><td>${t.transactionNumber}</td><td>${new Date(t.createdAt).toLocaleDateString()}</td><td>${t.memberName}</td><td>${t.paymentMethod}</td><td style="text-align:right">${currencyCode} ${Number(t.totalAmount).toFixed(2)}</td></tr>`
    ).join('');
    const total = statementTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Statement - ${customer.name}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd}th{background:#f9fafb}.total{font-weight:bold;font-size:15px}</style></head>
      <body><h2>Customer Statement</h2><p><strong>Customer:</strong> ${customer.name}</p><p><strong>Member ID:</strong> ${customer.member_id || '-'}</p><hr>
      <table><thead><tr><th>Transaction</th><th>Date</th><th>Customer</th><th>Method</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="total">Total: ${currencyCode} ${total.toFixed(2)}</p></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleRecordPayment = () => {
    const customer = customersList.find(c => String(c.id) === recordPayCustomerId);
    if (!customer || !recordPayAmount) { toast.error('Please select a customer and enter amount'); return; }
    toast.success(`Payment of ${currencyCode} ${parseFloat(recordPayAmount).toFixed(2)} recorded for ${customer.name}`);
    setRecordPayCustomerId(''); setRecordPayAmount(''); setRecordPayMethod('cash'); setRecordPayNotes('');
  };

  const handleReceiveAdvance = () => {
    const customer = customersList.find(c => String(c.id) === advanceCustomerId);
    if (!customer || !advanceAmount) { toast.error('Please select a customer and enter amount'); return; }
    toast.success(`Advance of ${currencyCode} ${parseFloat(advanceAmount).toFixed(2)} received from ${customer.name}`);
    setAdvanceCustomerId(''); setAdvanceAmount(''); setAdvanceMethod('cash'); setAdvancePurpose('');
  };

  // Base pool: only products actually sellable in POS, regardless of category/search/favorites.
  const posEligibleProducts = useMemo(
    () => apiProducts.filter(p => p.isActive && p.enabledForPos),
    [apiProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posEligibleProducts.filter(product => {
      const categoryMatch = selectedCategory === 'favorites'
        ? favoriteIds.has(product.id)
        : selectedCategory === 'all' || product.categoryName?.toLowerCase().includes(selectedCategory.toLowerCase());
      const searchMatch = !q || product.name.toLowerCase().includes(q);
      return categoryMatch && searchMatch;
    });
  }, [posEligibleProducts, selectedCategory, searchQuery, favoriteIds]);

  // Count products per category for the sidebar display
  const productCountByCategory = useCallback(
    (catId: string) => posEligibleProducts.filter(p => p.categoryName?.toLowerCase().includes(catId.toLowerCase())).length,
    [posEligibleProducts]
  );

  const favoritesInPosCount = useMemo(
    () => posEligibleProducts.filter(p => favoriteIds.has(p.id)).length,
    [posEligibleProducts, favoriteIds]
  );

  // Dashboard View
  const renderDashboard = () => {
    const todaysSales = currentSession?.apiId ? (sessionReport?.totalSales ?? 0) : 0;
    const transactionsCount = currentSession?.apiId ? (sessionReport?.transactionCount ?? 0) : 0;
    const cashInDrawer = currentSession?.apiId
      ? (sessionReport?.expectedCash ?? (currentSession?.openingCash ?? 0))
      : (currentSession?.openingCash ?? 0);
    const sessionDurationLabel = currentSession?.status === 'active' ? getSessionDuration() : '0m';

    return (
    <div className="p-8 space-y-8">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Point of Sale</p>
            <h1 className="text-3xl text-[#1E293B] mt-1">Session Control Center</h1>
            <p className="text-gray-600">Retail POS dashboard and session management</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge className={currentSession?.status === 'active' ? 'bg-[#2B7A78]' : 'bg-gray-400'}>
              {currentSession?.status === 'active' ? 'Session Active' : 'Session Closed'}
            </Badge>
            <div className="text-right">
              <p className="text-xs text-gray-500">Session ID</p>
              <p className="text-sm font-semibold text-[#1E293B]">{currentSession?.id ?? '—'}</p>
            </div>
            {currentSession?.status === 'active' && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Started</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {new Date(currentSession.startTime).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Start/Continue Session Tile */}
        <Card 
          className="group cursor-pointer border-2 border-transparent bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2B7A78] hover:shadow-xl"
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
                <p className="text-gray-600">Opening Cash: <CurrencyValue amount={currentSession.openingCash} /></p>
                <p className="text-gray-600">Started: {new Date(currentSession.startTime).toLocaleTimeString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Z-Report Tile */}
        <Card 
          className="group cursor-pointer border-2 border-transparent bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2B7A78] hover:shadow-xl"
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
          className={`group cursor-pointer border-2 border-transparent bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2B7A78] hover:shadow-xl ${
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
          className="group cursor-pointer border-2 border-transparent bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2B7A78] hover:shadow-xl"
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
          className="group cursor-pointer border-2 border-transparent bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2B7A78] hover:shadow-xl"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Sales</p>
                <p className="text-2xl mt-1 text-[#1E293B]"><CurrencyValue amount={todaysSales} /></p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl mt-1 text-[#1E293B]">{transactionsCount}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash in Drawer</p>
                <p className="text-2xl mt-1 text-[#1E293B]"><CurrencyValue amount={cashInDrawer} /></p>
              </div>
              <Wallet className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Session Duration</p>
                <p className="text-2xl mt-1 text-[#1E293B]">{sessionDurationLabel}</p>
              </div>
              <Clock className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    );
  };

  // Touch Screen POS Interface
  const renderTouchScreen = () => (
    // Body is rendered at `zoom: 0.9` app-wide (see src/styles/index.css), which shrinks
    // raw viewport units visually. A plain 100dvh box would then only fill ~90% of the
    // screen, leaving a blank gap at the bottom. Compensate the same way the sidebar does
    // (`calc(100svh / 0.9)` in index.css) so this root always fills the true viewport.
    <div className="flex flex-col bg-[#F9FAFB] overflow-hidden" style={{ height: 'calc(100dvh / 0.9)' }}>
      {/* Top Bar */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex-shrink-0 sticky top-0 z-20">
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
            <Badge className={currentSession?.status === 'active' ? 'bg-[#2B7A78]' : 'bg-gray-400'}>
              {currentSession?.status === 'active' ? 'Active Session' : 'No Active Session'}
            </Badge>
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
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex-shrink-0 shadow-sm">
        <div className="flex space-x-2 overflow-x-auto">
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]"
            onClick={() => { setReturnFilter(''); setShowSalesReturnDialog(true); }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Sales Return
          </Button>
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]"
            onClick={() => { setReturnFilter(''); setShowSalesReturnDialog(true); }}>
            <Archive className="h-4 w-4 mr-2" />
            Handle Returns
          </Button>
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]"
            onClick={() => { setReprintFilter(''); setShowReprintDialog(true); }}>
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
          <Button variant="outline" size="sm" className="border-[#2B7A78] text-[#2B7A78]"
            onClick={() => { setPriceCheckSearch(''); setShowPriceCheckDialog(true); }}>
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

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Categories */}
        <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b">
            <p className="text-xs uppercase tracking-wide text-gray-500">Categories</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-semibold text-[#1E293B]">All Products</p>
              <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                {posEligibleProducts.length}
              </Badge>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <Button
              key="favorites-category-button"
              onClick={() => setSelectedCategory('favorites')}
              variant="ghost"
              className={`w-full justify-start h-auto py-3 border-l-4 ${
                selectedCategory === 'favorites'
                  ? 'border-l-[#b91c1c]'
                  : 'text-[#1E293B] hover:text-[#1E293B] border-l-transparent hover:border-l-[#EF4444]'
              }`}
              style={
                selectedCategory === 'favorites'
                  ? { backgroundColor: '#EF4444', color: '#ffffff' }
                  : undefined
              }
            >
              <Heart
                className="h-5 w-5 mr-2 shrink-0"
                fill={selectedCategory === 'favorites' ? '#ffffff' : '#EF4444'}
                color={selectedCategory === 'favorites' ? '#ffffff' : '#EF4444'}
              />
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm block whitespace-nowrap overflow-hidden text-ellipsis">Favorites</div>
                <div className="text-xs opacity-75 block whitespace-nowrap overflow-hidden text-ellipsis">
                  {favoritesInPosCount} items
                </div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedCategory('all')}
              variant="ghost"
              className={`w-full justify-start h-auto py-3 border-l-4 ${
                selectedCategory === 'all'
                  ? 'bg-[#2B7A78] text-white border-l-[#1f5f5c]'
                  : 'border-l-transparent hover:border-l-[#2B7A78]'
              }`}
            >
              <Package className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div className="text-sm">All Items</div>
                <div className="text-xs opacity-75">
                  {posEligibleProducts.length} items
                </div>
              </div>
            </Button>
            {productCategories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant="ghost"
                className={`w-full justify-start h-auto py-3 border-l-4 ${
                  selectedCategory === category.id 
                    ? 'bg-[#2B7A78] hover:bg-[#236862] text-white border-l-[#1f5f5c]' 
                    : 'border-l-transparent hover:border-l-[#2B7A78]'
                }`}
              >
                <category.icon className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="text-sm">{category.name}</div>
                  <div className="text-xs opacity-75">
                    {productCountByCategory(category.id)} items
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Center Panel - Products */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-11 rounded-full bg-[#F8FAFC] border-gray-200"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 min-h-0 w-full h-full overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              {filteredProducts.length === 0 && selectedCategory === 'favorites' ? (
                <motion.div
                  key="favorites-empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex h-full flex-col items-center justify-center py-12 text-center text-gray-500"
                >
                  <Heart className="h-16 w-16 mb-3 text-gray-300" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-600">No favorite products yet</p>
                  <p className="mt-1 max-w-xs text-xs text-gray-400">
                    Tap the heart icon on products to add them here.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`${selectedCategory}-${searchQuery}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 pb-10"
                >
                  {filteredProducts.map((product) => (
                    <POSProductCard
                      key={product.id}
                      product={product}
                      isFavorite={isFavorite(product.id)}
                      onToggleFavorite={toggleFavorite}
                      onAddToCart={addToInvoice}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 min-h-0">
          {/* Customer Selection */}
          <div className="p-4 border-b border-gray-200 relative">
            <Label className="text-[#1E293B]">Customer</Label>
            {selectedMember ? (
              <div className="mt-2 flex items-center justify-between p-2 bg-[#F0FAF9] rounded border border-[#2B7A78]">
                <div>
                  <p className="text-sm text-[#1E293B]">{selectedMember.name}</p>
                  <p className="text-xs text-gray-500">{selectedMember.memberId}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedMember(null); setMemberSearch(''); }}
                  className="h-6 w-6 p-0 text-gray-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : walkInSelected ? (
              <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-300">
                <div>
                  <p className="text-sm text-[#1E293B]">Walk-in Customer</p>
                  <p className="text-xs text-gray-500">No membership</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWalkInSelected(false)}
                  className="h-6 w-6 p-0 text-gray-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="relative mt-2">
                <Input
                  placeholder="Search member or Walk-in..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  onFocus={() => setShowMemberDropdown(true)}
                  className="pr-8"
                />
                {showMemberDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                    <div
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-600 border-b"
                      onClick={() => { setSelectedMember(null); setMemberSearch(''); setShowMemberDropdown(false); setWalkInSelected(true); }}
                    >
                      Walk-in Customer
                    </div>
                    {searchedMembers.map(m => (
                      <div
                        key={m.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-[#F0FAF9]"
                        onClick={() => {
                          setSelectedMember({ id: Number(m.id), name: m.name, memberId: m.member_id || m.id });
                          setMemberSearch(m.name);
                          setShowMemberDropdown(false);
                        }}
                      >
                        <p className="text-[#1E293B]">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.member_id || m.phone}</p>
                      </div>
                    ))}
                    {memberSearch.trim() && searchedMembers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">No matching members</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[#1E293B]">Current Sale</h3>
                <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                  {currentInvoice.items.length} items
                </Badge>
              </div>
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
                    <div key={item.id} className="border rounded-lg p-3 bg-white shadow-sm">
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
                        <span className="text-sm text-gray-600"><CurrencyValue amount={item.price} /></span>
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
                        <span className="text-[#2B7A78]"><CurrencyValue amount={item.total} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Held Invoices Recall — always visible when any exist, regardless of
              whether the current cart happens to be empty (e.g. right after
              holding one, which clears the cart by design). */}
          {heldInvoices.length > 0 && (
            <div className="p-4 border-t border-gray-200">
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

          {/* Totals and Payment */}
          {currentInvoice.items.length > 0 && (
            <>
              <div className="p-4 border-t border-gray-200 space-y-2 bg-gradient-to-br from-white to-[#F0FAF9]">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span><CurrencyValue amount={currentInvoice.subtotal} /></span>
                </div>
                {currentInvoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-[#E63946]">
                    <span>Discount:</span>
                    <span>-<CurrencyValue amount={currentInvoice.totalDiscount} /></span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>VAT (5%):</span>
                  <span><CurrencyValue amount={currentInvoice.tax} /></span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg text-[#1E293B]">
                  <span>Total:</span>
                  <span><CurrencyValue amount={currentInvoice.total} /></span>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 space-y-3">
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
                  className="w-full h-12 rounded-xl bg-[#2B7A78] hover:bg-[#236862] text-white shadow-md hover:shadow-lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment (<CurrencyValue amount={currentInvoice.total} />)
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
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            onClick={() => printReport('z-report-content', 'Z-Report - End of Day Summary')}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            onClick={() => printReport('z-report-content', 'Z-Report - End of Day Summary')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <p>Loading report data...</p>
        </div>
      ) : (
      <div id="z-report-content">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Net Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#2B7A78]"><CurrencyValue amount={sessionReport?.netSales ?? 0} /></p>
            <p className="text-sm text-gray-600 mt-1">Across all sessions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#E63946]"><CurrencyValue amount={sessionReport?.totalReturns ?? 0} /></p>
            <p className="text-sm text-gray-600 mt-1">{sessionReport?.returnCount ?? 0} return transactions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]">{sessionReport?.transactionCount ?? 0}</p>
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
              {(sessionReport?.paymentBreakdown ?? []).map((pb) => (
                <TableRow key={pb.paymentMethod}>
                  <TableCell className="text-[#1E293B]">
                    <div className="flex items-center">
                      {pb.paymentMethod === 'CASH' ? (
                        <Banknote className="h-4 w-4 mr-2 text-[#2B7A78]" />
                      ) : pb.paymentMethod === 'CARD' ? (
                        <CreditCard className="h-4 w-4 mr-2 text-[#2B7A78]" />
                      ) : (
                        <Smartphone className="h-4 w-4 mr-2 text-[#2B7A78]" />
                      )}
                      {pb.paymentMethod}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{pb.transactionCount}</TableCell>
                  <TableCell className="text-right text-[#2B7A78]"><CurrencyValue amount={pb.totalAmount} /></TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#1E293B]">Total</TableCell>
                <TableCell className="text-right">{sessionReport?.transactionCount ?? 0}</TableCell>
                <TableCell className="text-right text-[#1E293B]"><CurrencyValue amount={sessionReport?.netSales ?? 0} /></TableCell>
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
              {(sessionReport?.categoryBreakdown ?? []).map((cb) => (
                <TableRow key={cb.categoryName}>
                  <TableCell className="text-[#1E293B]">{cb.categoryName}</TableCell>
                  <TableCell className="text-right">{cb.unitsSold}</TableCell>
                  <TableCell className="text-right text-[#2B7A78]"><CurrencyValue amount={cb.totalAmount} /></TableCell>
                </TableRow>
              ))}
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
              <span className="text-[#2B7A78]"><CurrencyValue amount={sessionReport?.totalCashDrops ?? 0} /></span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Total Cash Out (Expenses)</span>
              <span className="text-[#E63946]"><CurrencyValue amount={sessionReport?.totalCashOuts ?? 0} /></span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Expected Cash Balance</span>
              <span className="text-[#1E293B]"><CurrencyValue amount={sessionReport?.expectedCash ?? 0} /></span>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>
      )}
    </div>
  );

  // X-Report View (Session Close Report)
  const renderXReport = () => {
    const expectedCash = sessionReport?.expectedCash ?? ((currentSession?.openingCash ?? 0) + (sessionReport?.cashSales ?? 0) + (sessionReport?.totalCashDrops ?? 0) - (sessionReport?.totalCashOuts ?? 0));
    return (
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
          <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            onClick={() => printReport('x-report-content', `X-Report - Session ${currentSession?.id}`)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <p>Loading report data...</p>
        </div>
      ) : (
      <div id="x-report-content">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Opening Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]"><CurrencyValue amount={currentSession?.openingCash || 0} /></p>
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
            <p className="text-3xl text-[#2B7A78]"><CurrencyValue amount={sessionReport?.totalSales ?? 0} /></p>
            <p className="text-sm text-gray-600 mt-1">{sessionReport?.transactionCount ?? 0} transactions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2B7A78]">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Expected Closing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-[#1E293B]">
              <CurrencyValue amount={sessionReport?.expectedCash ?? (currentSession?.openingCash ?? 0)} />
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
              {realTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-[#1E293B]">{txn.transactionNumber}</TableCell>
                  <TableCell>{new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{txn.memberName}</TableCell>
                  <TableCell className="text-right">{txn.items?.length ?? 0}</TableCell>
                  <TableCell className="text-right text-[#2B7A78]">
                    <CurrencyValue amount={txn.totalAmount} />
                  </TableCell>
                  <TableCell>
                    <Badge className={txn.paymentMethod === 'CASH' ? 'bg-[#2B7A78]' : 'bg-blue-500'}>
                      {txn.paymentMethod}
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
            {(sessionReport?.categoryBreakdown ?? []).map((cb) => (
              <div key={cb.categoryName} className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">{cb.categoryName}</span>
                <span className="text-[#2B7A78]"><CurrencyValue amount={cb.totalAmount} /> ({cb.unitsSold} units)</span>
              </div>
            ))}
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
              <span className="text-[#1E293B]"><CurrencyValue amount={currentSession?.openingCash || 0} /></span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Total Cash Sales</span>
              <span className="text-[#2B7A78]"><CurrencyValue amount={sessionReport?.cashSales ?? 0} /></span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Cash Drops (IN)</span>
              <span className="text-[#2B7A78]"><CurrencyValue amount={sessionReport?.totalCashDrops ?? 0} /></span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
              <span className="text-[#1E293B]">Cash Out (Expenses)</span>
              <span className="text-[#E63946]"><CurrencyValue amount={sessionReport?.totalCashOuts ?? 0} /></span>
            </div>
            <Separator />
            <div className="flex justify-between items-center p-3 bg-[#2B7A78] text-white rounded">
              <span className="">Expected Cash Balance</span>
              <span className="">
                <CurrencyValue amount={expectedCash} />
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
              <span className="text-[#1E293B]">Actual Cash (From Denomination Count)</span>
              <span className="text-[#1E293B]">
                <CurrencyValue amount={calculateDenominationTotal(closingDenominations)} />
              </span>
            </div>
            {calculateDenominationTotal(closingDenominations) !== expectedCash && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-[#E63946]">
                <span className="text-[#E63946]">Variance</span>
                <span className="text-[#E63946]">
                  <CurrencyValue amount={
                    calculateDenominationTotal(closingDenominations) - expectedCash
                  } />
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      </div>
      )}
    </div>
    );
  };

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

      <Tabs value={activeCustomerTab} onValueChange={setActiveCustomerTab} className="space-y-6">
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
                  {customersList.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-[#1E293B]">{customer.name}</TableCell>
                      <TableCell>{customer.member_id || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={(customer.outstanding_balance ?? 0) > 0 ? 'text-[#2B7A78]' : ''}>
                          <CurrencyValue amount={customer.outstanding_balance ?? 0} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-[#2B7A78] text-[#2B7A78]"
                            onClick={() => { setViewingCustomer(customer); setShowCustomerViewDialog(true); }}>
                            View
                          </Button>
                          <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236862] text-white"
                            onClick={() => { setStatementCustomerId(String(customer.id)); setStatementTransactions([]); setActiveCustomerTab('statement'); }}>
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
                <Select value={recordPayCustomerId} onValueChange={setRecordPayCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersList.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name} - Balance: <CurrencyValue amount={customer.outstanding_balance ?? 0} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1E293B]">Payment Amount ({currencyCode})</Label>
                  <Input type="number" placeholder="0.00" value={recordPayAmount} onChange={e => setRecordPayAmount(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[#1E293B]">Payment Method</Label>
                  <Select value={recordPayMethod} onValueChange={setRecordPayMethod}>
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
                <Input placeholder="Payment notes..." value={recordPayNotes} onChange={e => setRecordPayNotes(e.target.value)} />
              </div>

              <Button className="w-full bg-[#2B7A78] hover:bg-[#236862] text-white" onClick={handleRecordPayment}>
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
                <Select value={advanceCustomerId} onValueChange={setAdvanceCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersList.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1E293B]">Advance Amount ({currencyCode})</Label>
                  <Input type="number" placeholder="0.00" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[#1E293B]">Payment Method</Label>
                  <Select value={advanceMethod} onValueChange={setAdvanceMethod}>
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
                <Input placeholder="Purpose of advance payment..." value={advancePurpose} onChange={e => setAdvancePurpose(e.target.value)} />
              </div>

              <Button className="w-full bg-[#2B7A78] hover:bg-[#236862] text-white" onClick={handleReceiveAdvance}>
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
                <Select value={statementCustomerId} onValueChange={id => { setStatementCustomerId(id); setStatementTransactions([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersList.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-3">
                <Button className="flex-1 bg-[#2B7A78] hover:bg-[#236862] text-white"
                  onClick={loadCustomerStatement} disabled={statementLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  {statementLoading ? 'Loading...' : 'View Statement'}
                </Button>
                <Button variant="outline" className="border-[#2B7A78] text-[#2B7A78]"
                  onClick={printCustomerStatement}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>

              {statementTransactions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-[#1E293B] mb-2">
                    {statementTransactions.length} transactions found
                    &nbsp;| Total: <CurrencyValue amount={statementTransactions.reduce((s, t) => s + Number(t.totalAmount), 0)} />
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB]">
                        <TableHead className="text-[#1E293B]">Transaction</TableHead>
                        <TableHead className="text-[#1E293B]">Date</TableHead>
                        <TableHead className="text-[#1E293B]">Payment</TableHead>
                        <TableHead className="text-[#1E293B] text-right">Amount</TableHead>
                        <TableHead className="text-[#1E293B]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statementTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-[#1E293B]">{t.transactionNumber}</TableCell>
                          <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{t.paymentMethod}</TableCell>
                          <TableCell className="text-right text-[#2B7A78]"><CurrencyValue amount={Number(t.totalAmount)} /></TableCell>
                          <TableCell>
                            <Badge className={t.status === 'COMPLETED' ? 'bg-[#2B7A78]' : 'bg-[#E63946]'}>{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
                    <Label className="w-24 text-[#1E293B]"><CurrencyGlyph /> {note}:</Label>
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
                      = <CurrencyGlyph /> {(parseInt(note) * denominations[note as keyof typeof denominations]).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2B7A78] text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Total Opening Cash:</span>
                <span className="text-2xl">
                  <CurrencyValue amount={calculateDenominationTotal(denominations)} />
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
              disabled={sessionLoading}
              className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              {sessionLoading ? 'Starting...' : 'Start Session'}
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
                    <Label className="w-24 text-[#1E293B]"><CurrencyGlyph /> {note}:</Label>
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
                      = <CurrencyGlyph /> {(parseInt(note) * closingDenominations[note as keyof typeof closingDenominations]).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">Expected Cash:</span>
                <span className="text-[#1E293B]">
                  <CurrencyValue amount={sessionReport?.expectedCash ?? ((currentSession?.openingCash ?? 0) + (sessionReport?.cashSales ?? 0) + (sessionReport?.totalCashDrops ?? 0) - (sessionReport?.totalCashOuts ?? 0))} />
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">Actual Cash (Counted):</span>
                <span className="text-[#2B7A78]">
                  <CurrencyValue amount={calculateDenominationTotal(closingDenominations)} />
                </span>
              </div>
              {calculateDenominationTotal(closingDenominations) !== (sessionReport?.expectedCash ?? ((currentSession?.openingCash ?? 0) + (sessionReport?.cashSales ?? 0) + (sessionReport?.totalCashDrops ?? 0) - (sessionReport?.totalCashOuts ?? 0))) && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-[#E63946]">
                  <span className="text-[#E63946]">Variance:</span>
                  <span className="text-[#E63946]">
                    <CurrencyValue amount={
                      calculateDenominationTotal(closingDenominations) - (sessionReport?.expectedCash ?? ((currentSession?.openingCash ?? 0) + (sessionReport?.cashSales ?? 0) + (sessionReport?.totalCashDrops ?? 0) - (sessionReport?.totalCashOuts ?? 0)))
                    } />
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
              disabled={sessionLoading}
              className="bg-[#E63946] hover:bg-[#d32f3d] text-white"
            >
              <Lock className="h-4 w-4 mr-2" />
              {sessionLoading ? 'Closing...' : 'Close Session & Print Report'}
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
              Total Amount: <CurrencyValue amount={currentInvoice.total} />
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
                  <SelectItem value="cheque">
                    <div className="flex items-center">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Cheque
                    </div>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <div className="flex items-center">
                      <Split className="h-4 w-4 mr-2" />
                      Mixed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod === 'mixed' && (
              <SplitPaymentFields
                total={currentInvoice.total}
                value={splitPayment}
                onChange={setSplitPayment}
                chequeReference={splitChequeRef}
                onChequeReferenceChange={setSplitChequeRef}
                currencyCode={currencyCode}
              />
            )}

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
                      Change: <CurrencyValue amount={parseFloat(receivedAmount) - currentInvoice.total} />
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
              disabled={processingPayment || (selectedPaymentMethod === 'mixed' && !isSplitPaymentValid(splitPayment, currentInvoice.total))}
              className="bg-[#2B7A78] hover:bg-[#236862] text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processingPayment ? 'Processing...' : 'Complete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Return / Handle Returns Dialog */}
      <Dialog open={showSalesReturnDialog} onOpenChange={setShowSalesReturnDialog}>
        <DialogContent className="sm:max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Sales Return / Refund</DialogTitle>
            <DialogDescription>Select a completed transaction to refund. Stock will be restored automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filter by transaction number or customer..."
              value={returnFilter}
              onChange={e => setReturnFilter(e.target.value)}
            />
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <ScrollArea className="h-80">
                <div className="overflow-x-auto">
                  <table className="w-full caption-bottom text-sm table-fixed min-w-[600px]">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[12%]" />
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead className="[&_tr]:border-b">
                      <tr className="bg-[#F9FAFB] border-b border-slate-50">
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Transaction</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Time</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Customer</th>
                        <th className="text-foreground h-10 px-2 text-right align-middle font-medium">Amount</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Status</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {realTransactions
                        .filter(t => {
                          const q = returnFilter.toLowerCase();
                          return !q || t.transactionNumber.toLowerCase().includes(q) || t.memberName.toLowerCase().includes(q);
                        })
                        .map(txn => (
                        <tr key={txn.id} className="border-b border-slate-50 transition-colors hover:bg-[#F0FAF9]">
                          <td className="p-2 align-middle text-[#1E293B] truncate" title={txn.transactionNumber}>{txn.transactionNumber}</td>
                          <td className="p-2 align-middle whitespace-nowrap">{new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-2 align-middle truncate" title={txn.memberName}>{txn.memberName}</td>
                          <td className="p-2 align-middle text-right whitespace-nowrap"><CurrencyValue amount={txn.totalAmount} /></td>
                          <td className="p-2 align-middle">
                            <Badge className={txn.status === 'COMPLETED' ? 'bg-[#2B7A78]' : 'bg-gray-400'}>{txn.status}</Badge>
                          </td>
                          <td className="p-2 align-middle">
                            {txn.status === 'COMPLETED' && (
                              <Button size="sm" className="bg-[#E63946] hover:bg-[#d32f3d] text-white"
                                disabled={refundingId === txn.id}
                                onClick={() => handleRefundTransaction(txn.id, txn.transactionNumber)}>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                {refundingId === txn.id ? 'Refunding...' : 'Refund'}
                              </Button>
                            )}
                            {txn.status === 'REFUNDED' && <span className="text-sm text-gray-400">Refunded</span>}
                          </td>
                        </tr>
                      ))}
                      {realTransactions.length === 0 && (
                        <tr className="border-b border-slate-50">
                          <td colSpan={6} className="p-2 py-12 text-center text-gray-500">
                            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>No transactions in current session</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalesReturnDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprint Invoice Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent className="sm:max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Reprint Invoice</DialogTitle>
            <DialogDescription>Select a transaction to print its receipt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filter by transaction number or customer..."
              value={reprintFilter}
              onChange={e => setReprintFilter(e.target.value)}
            />
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <ScrollArea className="h-80">
                <div className="overflow-x-auto">
                  <table className="w-full caption-bottom text-sm table-fixed min-w-[600px]">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[12%]" />
                      <col className="w-[20%]" />
                      <col className="w-[10%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead className="[&_tr]:border-b">
                      <tr className="bg-[#F9FAFB] border-b border-slate-50">
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Transaction</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Time</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium">Customer</th>
                        <th className="text-foreground h-10 px-2 text-center align-middle font-medium">Items</th>
                        <th className="text-foreground h-10 px-2 text-right align-middle font-medium">Amount</th>
                        <th className="text-foreground h-10 px-2 text-left align-middle font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {realTransactions
                        .filter(t => {
                          const q = reprintFilter.toLowerCase();
                          return !q || t.transactionNumber.toLowerCase().includes(q) || t.memberName.toLowerCase().includes(q);
                        })
                        .map(txn => (
                        <tr key={txn.id} className="border-b border-slate-50 transition-colors hover:bg-[#F0FAF9]">
                          <td className="p-2 align-middle text-[#1E293B] truncate" title={txn.transactionNumber}>{txn.transactionNumber}</td>
                          <td className="p-2 align-middle whitespace-nowrap">{new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-2 align-middle truncate" title={txn.memberName}>{txn.memberName}</td>
                          <td className="p-2 align-middle text-center">{txn.items?.length ?? 0}</td>
                          <td className="p-2 align-middle text-right text-[#2B7A78] whitespace-nowrap"><CurrencyValue amount={txn.totalAmount} /></td>
                          <td className="p-2 align-middle">
                            <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236862] text-white"
                              onClick={() => { printReceipt(txn); setShowReprintDialog(false); }}>
                              <Printer className="h-3 w-3 mr-1" />
                              Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {realTransactions.length === 0 && (
                        <tr className="border-b border-slate-50">
                          <td colSpan={6} className="p-2 py-12 text-center text-gray-500">
                            <Printer className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>No transactions in current session</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReprintDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Check Dialog */}
      <Dialog open={showPriceCheckDialog} onOpenChange={setShowPriceCheckDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Price Check</DialogTitle>
            <DialogDescription>Search for a product to view its price and stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search products by name or SKU..."
              value={priceCheckSearch}
              onChange={e => setPriceCheckSearch(e.target.value)}
              autoFocus
            />
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiProducts
                    .filter(p => {
                      const q = priceCheckSearch.toLowerCase();
                      return !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q);
                    })
                    .slice(0, 20)
                    .map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-[#1E293B]">{p.name}</TableCell>
                      <TableCell className="text-gray-500">{p.sku ?? '-'}</TableCell>
                      <TableCell>{p.categoryName ?? '-'}</TableCell>
                      <TableCell className="text-right text-[#2B7A78]"><CurrencyValue amount={p.sellingPrice ?? (p as any).price ?? 0} /></TableCell>
                      <TableCell className="text-right">
                        <Badge className={(p.totalStock ?? 0) > 10 ? 'bg-[#2B7A78]' : 'bg-[#E63946]'}>
                          {p.totalStock ?? 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {priceCheckSearch && apiProducts.filter(p => {
                    const q = priceCheckSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q);
                  }).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">No products found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceCheckDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer View Dialog */}
      <Dialog open={showCustomerViewDialog} onOpenChange={setShowCustomerViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Customer Details</DialogTitle>
          </DialogHeader>
          {viewingCustomer && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  <p className="text-[#1E293B]">{viewingCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Member ID</Label>
                  <p className="text-[#1E293B]">{viewingCustomer.member_id || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Phone</Label>
                  <p className="text-[#1E293B]">{viewingCustomer.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="text-[#1E293B]">{viewingCustomer.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Plan</Label>
                  <p className="text-[#1E293B]">{viewingCustomer.plan_name || viewingCustomer.planName || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={viewingCustomer.status === 'active' || viewingCustomer.status === 'ACTIVE' ? 'bg-[#2B7A78]' : 'bg-gray-400'}>
                    {viewingCustomer.status || '-'}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded">
                <span className="text-[#1E293B]">Outstanding Balance</span>
                <span className="text-[#2B7A78]"><CurrencyValue amount={viewingCustomer.outstanding_balance ?? 0} /></span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerViewDialog(false)}>Close</Button>
            <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white"
              onClick={() => {
                if (viewingCustomer) { setStatementCustomerId(String(viewingCustomer.id)); setStatementTransactions([]); setActiveCustomerTab('statement'); }
                setShowCustomerViewDialog(false);
              }}>
              <FileText className="h-4 w-4 mr-2" />
              View Statement
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
              <Label className="text-[#1E293B]">Amount ({currencyCode})</Label>
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

