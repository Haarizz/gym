import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShoppingCart, Package, TrendingUp, TrendingDown, CreditCard, Filter, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { receiptsService, Receipt } from '../utils/supabase/receipts-service';
import { purchaseService, PurchaseOrder } from '../utils/supabase/purchase-service';

export function SalesPurchases() {
  const { currencyCode } = useCurrency();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [receiptsResp, poResp] = await Promise.all([
        receiptsService.getReceipts({}, { page: 1, limit: 5000 }).catch(() => ({ receipts: [] as Receipt[], pagination: {} as any })),
        purchaseService.getOrders({ size: 500 }).catch(() => ({ orders: [] as PurchaseOrder[], pagination: {} as any })),
      ]);
      setReceipts((receiptsResp as any).receipts ?? []);
      setPurchaseOrders(poResp.orders ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Last 6 months of sales vs purchases
  const monthlyData = useMemo(() => {
    const months: { label: string; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, { month: 'short' });
      months.push({ label, key });
    }
    return months.map(({ label, key }) => {
      const sales = receipts
        .filter(r => (r.transaction_date || '').split('T')[0].startsWith(key))
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const purchases = purchaseOrders
        .filter(po => (po.orderDate || '').split('T')[0].startsWith(key))
        .reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);
      return { month: label, sales: Math.round(sales), purchases: Math.round(purchases), profit: Math.round(sales - purchases) };
    });
  }, [receipts, purchaseOrders]);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100);
  };

  // KPIs for current month (with month-over-month change)
  const kpis = useMemo(() => {
    const monthReceipts = receipts.filter(r => (r.transaction_date || '').split('T')[0].startsWith(currentMonthKey));
    const prevMonthReceipts = receipts.filter(r => (r.transaction_date || '').split('T')[0].startsWith(prevMonthKey));
    const monthlySales = monthReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const prevMonthlySales = prevMonthReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const monthlyPurchases = purchaseOrders
      .filter(po => (po.orderDate || '').split('T')[0].startsWith(currentMonthKey))
      .reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);
    const prevMonthlyPurchases = purchaseOrders
      .filter(po => (po.orderDate || '').split('T')[0].startsWith(prevMonthKey))
      .reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);

    const grossProfit = monthlySales - monthlyPurchases;
    const prevGrossProfit = prevMonthlySales - prevMonthlyPurchases;

    const avgTransaction = monthReceipts.length > 0 ? monthlySales / monthReceipts.length : 0;
    const prevAvgTransaction = prevMonthReceipts.length > 0 ? prevMonthlySales / prevMonthReceipts.length : 0;

    return {
      monthlySales, monthlyPurchases, grossProfit, avgTransaction,
      salesChange: pctChange(monthlySales, prevMonthlySales),
      purchasesChange: pctChange(monthlyPurchases, prevMonthlyPurchases),
      profitChange: pctChange(grossProfit, prevGrossProfit),
      avgChange: pctChange(avgTransaction, prevAvgTransaction),
    };
  }, [receipts, purchaseOrders, currentMonthKey, prevMonthKey]);

  // Recent sales (latest 20 receipts sorted by date)
  const recentSales = useMemo(() => {
    return [...receipts]
      .sort((a, b) => new Date(b.transaction_date || b.created_at).getTime() - new Date(a.transaction_date || a.created_at).getTime())
      .slice(0, 20);
  }, [receipts]);

  // Recent purchase orders (latest 20)
  const recentPOs = useMemo(() => {
    return [...purchaseOrders]
      .sort((a, b) => new Date(b.orderDate || b.createdAt).getTime() - new Date(a.orderDate || a.createdAt).getTime())
      .slice(0, 20);
  }, [purchaseOrders]);

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'received') return 'bg-green-100 text-green-800';
    if (s === 'pending' || s === 'pending_approval' || s === 'approved' || s === 'ordered') return 'bg-yellow-100 text-yellow-800';
    if (s === 'cancelled' || s === 'refunded') return 'bg-red-100 text-red-800';
    if (s === 'partially_received' || s === 'partial') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderTrend = (change: number) => (
    <div className="flex items-center mt-1">
      {change >= 0 ? (
        <TrendingUp className="h-3.5 w-3.5 text-green-500 mr-1" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 text-red-500 mr-1" />
      )}
      <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? '+' : ''}{change}%
      </span>
      <span className="text-xs text-muted-foreground ml-1">vs last month</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales & Purchases</h1>
          <p className="text-muted-foreground">Real-time sales transactions and purchase orders.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="h-9" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes salesPurchasesFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sales-purchases-panel {
          animation: salesPurchasesFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sales-purchases-panel">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Monthly Sales</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700"><CurrencyGlyph /> {Math.round(kpis.monthlySales).toLocaleString()}</div>
            {loading ? <p className="text-xs text-muted-foreground mt-1">This month</p> : renderTrend(kpis.salesChange)}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Purchases</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700"><CurrencyGlyph /> {Math.round(kpis.monthlyPurchases).toLocaleString()}</div>
            {loading ? <p className="text-xs text-muted-foreground mt-1">Purchase orders this month</p> : renderTrend(kpis.purchasesChange)}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Gross Profit</CardTitle>
            <div className={`p-2 rounded-lg ${kpis.grossProfit >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
              <TrendingUp className={`h-4 w-4 ${kpis.grossProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.grossProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
              <CurrencyGlyph /> {Math.round(kpis.grossProfit).toLocaleString()}
            </div>
            {loading ? <p className="text-xs text-muted-foreground mt-1">Sales minus purchases</p> : renderTrend(kpis.profitChange)}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg. Transaction</CardTitle>
            <div className="bg-amber-50 p-2 rounded-lg">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700"><CurrencyGlyph /> {Math.round(kpis.avgTransaction).toLocaleString()}</div>
            {loading ? <p className="text-xs text-muted-foreground mt-1">Per receipt this month</p> : renderTrend(kpis.avgChange)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6 sales-purchases-panel">
        <TabsList className="w-full flex">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="sales" className="flex-1">Sales</TabsTrigger>
          <TabsTrigger value="purchases" className="flex-1">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 sales-purchases-panel">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Sales vs Purchases</CardTitle>
                <CardDescription>Monthly comparison over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `${currencyCode} ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="sales" fill="#8884d8" name="Sales" />
                    <Bar dataKey="purchases" fill="#82ca9d" name="Purchases" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <CardDescription>Net profit over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `${currencyCode} ${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 sales-purchases-panel">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest sales transactions ({receipts.length.toLocaleString()} total)</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : recentSales.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No sales records found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan / Item</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.transaction_date ? r.transaction_date.split('T')[0] : '—'}</TableCell>
                        <TableCell className="font-medium">{r.receipt_no || r.id.slice(0, 8)}</TableCell>
                        <TableCell>{r.member_name || '—'}</TableCell>
                        <TableCell>{r.plan_name || r.transaction_type || '—'}</TableCell>
                        <TableCell>{r.payment_method || '—'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(r.status || '')}>{r.status || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium"><CurrencyGlyph /> {Number(r.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6 sales-purchases-panel">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Purchase Orders</CardTitle>
                  <CardDescription>Latest purchase orders from suppliers ({purchaseOrders.length.toLocaleString()} total)</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : recentPOs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No purchase orders found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPOs.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>{po.orderDate ? po.orderDate.split('T')[0] : '—'}</TableCell>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{po.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(po.status)}>{po.status.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium"><CurrencyGlyph /> {Number(po.totalAmount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
