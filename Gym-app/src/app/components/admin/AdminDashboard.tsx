"use client";

import { useState } from 'react';
import { Calendar, RefreshCw, Bell, TrendingUp, Users, DollarSign, UserCheck, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, X, ShoppingBag, UserMinus, UserPlus } from 'lucide-react';

type ReportType = 'total-collections' | 'membership-sales' | 'pos-revenue' | 'pt-sales' | 'day-pass' | 'active-members' | 'churn-rate' | 'retention-rate' | null;

export default function AdminDashboard() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  const kpiData = [
    { id: 'total-collections', label: 'Total Collections', value: '₹2.4L', change: '+12%', trend: 'up', icon: DollarSign, color: 'bg-green-500', clickable: true },
    { id: 'membership-sales', label: 'Membership Sales', value: '₹1.8L', change: '+8%', trend: 'up', icon: UserCheck, color: 'bg-[#327f74]', clickable: true },
    { id: 'pos-revenue', label: 'POS Revenue', value: '₹52K', change: '+18%', trend: 'up', icon: ShoppingBag, color: 'bg-[#F5C742]', clickable: true },
    { id: 'pt-sales', label: 'PT Sales', value: '₹45K', change: '+15%', trend: 'up', icon: Users, color: 'bg-[#F59E0B]', clickable: true },
    { id: 'day-pass', label: 'Day Pass Revenue', value: '₹12K', change: '-3%', trend: 'down', icon: CreditCard, color: 'bg-blue-500', clickable: true },
    { id: 'check-ins', label: 'Total Check-ins', value: '342', change: '+5%', trend: 'up', icon: TrendingUp, color: 'bg-purple-500', clickable: false },
    { id: 'active-members', label: 'Active Members', value: '1,245', change: '+2%', trend: 'up', icon: Users, color: 'bg-[#327f74]', clickable: true },
    { id: 'churn-rate', label: 'Churn Rate', value: '3.2%', change: '-0.5%', trend: 'up', icon: UserMinus, color: 'bg-red-500', clickable: true },
    { id: 'retention-rate', label: 'Retention Rate', value: '89.4%', change: '+1.2%', trend: 'up', icon: UserPlus, color: 'bg-green-600', clickable: true },
  ];

  const paymentMix = [
    { mode: 'Card', amount: '₹1.2L', percentage: 50, color: 'bg-[#327f74]' },
    { mode: 'Cash', amount: '₹72K', percentage: 30, color: 'bg-[#F5C742]' },
    { mode: 'Online', amount: '₹36K', percentage: 15, color: 'bg-[#F59E0B]' },
    { mode: 'Other', amount: '₹12K', percentage: 5, color: 'bg-gray-400' },
  ];

  const alerts = [
    { text: '24 memberships expiring in 7 days', urgent: true },
    { text: '12 pending follow-ups for today', urgent: false },
  ];

  // Mock data for reports
  const getReportData = (reportType: ReportType) => {
    switch (reportType) {
      case 'total-collections':
        return [
          { branch: 'Downtown', amount: '₹1.2L', transactions: 145, growth: '+15%' },
          { branch: 'Uptown', amount: '₹85K', transactions: 98, growth: '+8%' },
          { branch: 'Central', amount: '₹55K', transactions: 67, growth: '+12%' },
        ];
      case 'membership-sales':
        return [
          { plan: 'Annual Premium', sales: '₹95K', count: 12, growth: '+20%' },
          { plan: 'Quarterly Gold', sales: '₹48K', count: 18, growth: '+5%' },
          { plan: 'Monthly Basic', sales: '₹37K', count: 35, growth: '+3%' },
        ];
      case 'pos-revenue':
        return [
          { category: 'Supplements', sales: '₹28K', units: 156, growth: '+22%' },
          { category: 'Apparel', sales: '₹15K', units: 45, growth: '+15%' },
          { category: 'Accessories', sales: '₹9K', units: 89, growth: '+12%' },
        ];
      case 'pt-sales':
        return [
          { trainer: 'Raj Kumar', sales: '₹18K', sessions: 24, growth: '+18%' },
          { trainer: 'Priya Singh', sales: '₹15K', sessions: 20, growth: '+12%' },
          { trainer: 'Amit Sharma', sales: '₹12K', sessions: 16, growth: '+15%' },
        ];
      case 'day-pass':
        return [
          { date: '25 Mar', passes: 18, revenue: '₹4.5K', peak: '6-8 PM' },
          { date: '24 Mar', passes: 22, revenue: '₹5.5K', peak: '6-8 PM' },
          { date: '23 Mar', passes: 15, revenue: '₹3.8K', peak: '5-7 PM' },
        ];
      case 'active-members':
        return [
          { plan: 'Premium', count: 542, percentage: '43.5%', change: '+3%' },
          { plan: 'Gold', count: 398, percentage: '32.0%', change: '+2%' },
          { plan: 'Basic', count: 305, percentage: '24.5%', change: '+1%' },
        ];
      case 'churn-rate':
        return [
          { month: 'March', rate: '3.2%', members: 40, reason: 'Relocation' },
          { month: 'February', rate: '3.7%', members: 45, reason: 'Cost' },
          { month: 'January', rate: '4.1%', members: 52, reason: 'Dissatisfaction' },
        ];
      case 'retention-rate':
        return [
          { segment: 'Premium Members', rate: '95.2%', count: 516, trend: '+2%' },
          { segment: 'Gold Members', rate: '88.5%', count: 352, trend: '+1%' },
          { segment: 'Basic Members', rate: '82.1%', count: 251, trend: '-1%' },
        ];
      default:
        return [];
    }
  };

  const getReportTitle = (reportType: ReportType) => {
    const titles: Record<string, string> = {
      'total-collections': 'Total Collections Report',
      'membership-sales': 'Membership Sales Report',
      'pos-revenue': 'POS Revenue Report',
      'pt-sales': 'PT Sales Report',
      'day-pass': 'Day Pass Revenue Report',
      'active-members': 'Active Members Report',
      'churn-rate': 'Churn Rate Analysis',
      'retention-rate': 'Retention Rate Analysis',
    };
    return titles[reportType || ''] || '';
  };

  const getReportColumns = (reportType: ReportType) => {
    switch (reportType) {
      case 'total-collections':
        return ['Branch', 'Amount', 'Transactions', 'Growth'];
      case 'membership-sales':
        return ['Plan', 'Sales', 'Count', 'Growth'];
      case 'pos-revenue':
        return ['Category', 'Sales', 'Units', 'Growth'];
      case 'pt-sales':
        return ['Trainer', 'Sales', 'Sessions', 'Growth'];
      case 'day-pass':
        return ['Date', 'Passes', 'Revenue', 'Peak Hour'];
      case 'active-members':
        return ['Plan', 'Count', 'Percentage', 'Change'];
      case 'churn-rate':
        return ['Month', 'Rate', 'Members', 'Top Reason'];
      case 'retention-rate':
        return ['Segment', 'Rate', 'Count', 'Trend'];
      default:
        return [];
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <select className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-[14px] border border-gray-200">
            <option>All Branches</option>
            <option>Branch 1 - Downtown</option>
            <option>Branch 2 - Uptown</option>
          </select>
          <button className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Today's Date */}
        <div className="flex items-center justify-between">
          <div className="text-[14px] text-gray-600">Today: March 26, 2026</div>
          <button className="relative p-2">
            <Bell className="w-5 h-5 text-gray-600" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`rounded-xl p-3 ${
            alert.urgent ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${alert.urgent ? 'text-red-600' : 'text-yellow-600'}`} />
            <p className={`text-[13px] ${alert.urgent ? 'text-red-800' : 'text-yellow-800'}`}>
              {alert.text}
            </p>
          </div>
        </div>
      ))}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpiData.map((kpi, index) => (
          <button
            key={index}
            onClick={() => kpi.clickable && setSelectedReport(kpi.id as ReportType)}
            disabled={!kpi.clickable}
            className={`bg-white rounded-2xl p-4 shadow-sm text-left ${
              kpi.clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : 'cursor-default'
            }`}
          >
            <div className={`w-10 h-10 ${kpi.color} rounded-xl flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-[12px] text-gray-600 mb-1">{kpi.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-[20px] font-semibold text-gray-900">{kpi.value}</div>
              <div className={`flex items-center gap-1 text-[12px] ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{kpi.change}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Payment Mix */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Payment Mix</h3>
        <div className="space-y-3">
          {paymentMix.map((payment, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-gray-600">{payment.mode}</span>
                <span className="text-[14px] font-semibold text-gray-900">{payment.amount}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${payment.color} rounded-full`}
                  style={{ width: `${payment.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Operational Highlights</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Staff Attendance</span>
            <span className="text-[14px] font-semibold text-gray-900">18/20</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Today's Footfall</span>
            <span className="text-[14px] font-semibold text-gray-900">342 visits</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Renewals Due (7 days)</span>
            <span className="text-[14px] font-semibold text-red-600">24 members</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] text-gray-600">Pending Follow-ups</span>
            <span className="text-[14px] font-semibold text-yellow-600">12 leads</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm">
        <h3 className="text-white text-[16px] font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-3 text-[13px] font-medium transition-colors">
            Create Offer
          </button>
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-3 text-[13px] font-medium transition-colors">
            Add Staff
          </button>
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-3 text-[13px] font-medium transition-colors">
            View Reports
          </button>
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-3 text-[13px] font-medium transition-colors">
            Manage Branch
          </button>
        </div>
      </div>

      {/* Report Sheet */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSelectedReport(null)}>
          <div 
            className="bg-white w-full h-[85vh] rounded-t-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-[18px] font-semibold text-gray-900">{getReportTitle(selectedReport)}</h2>
                  <p className="text-[13px] text-gray-600 mt-1">Detailed breakdown and insights</p>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Report Grid */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
                {/* Header */}
                <div className="grid grid-cols-4 gap-2 bg-[#327f74] text-white p-3 text-[11px] font-semibold">
                  {getReportColumns(selectedReport).map((col, idx) => (
                    <div key={idx} className="truncate">{col}</div>
                  ))}
                </div>
                
                {/* Rows */}
                <div className="divide-y divide-gray-200">
                  {getReportData(selectedReport).map((row: any, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-4 gap-2 p-3 text-[12px] hover:bg-gray-50">
                      {Object.values(row).map((value, colIdx) => (
                        <div key={colIdx} className="truncate text-gray-700">
                          {String(value)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-xl p-4 text-white">
                  <div className="text-[11px] opacity-90 mb-1">Total Entries</div>
                  <div className="text-[20px] font-semibold">{getReportData(selectedReport).length}</div>
                </div>
                <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-xl p-4 text-white">
                  <div className="text-[11px] opacity-90 mb-1">Report Date</div>
                  <div className="text-[13px] font-semibold">March 26, 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}