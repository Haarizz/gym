"use client";

import { DollarSign, Calendar, TrendingUp, Download, Eye } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export default function TrainerLedger() {
  const summary = {
    thisMonth: 78000,
    lastMonth: 74000,
    pending: 12000,
    paid: 66000,
  };

  const recentTransactions = [
    {
      date: '2026-03-20',
      description: 'PT Session Payment (10 sessions)',
      member: 'Sarah Johnson',
      amount: 12000,
      status: 'paid',
    },
    {
      date: '2026-03-18',
      description: 'PT Session Payment (8 sessions)',
      member: 'Mike Chen',
      amount: 9600,
      status: 'paid',
    },
    {
      date: '2026-03-15',
      description: 'Monthly Commission',
      member: 'Gym Management',
      amount: 15000,
      status: 'paid',
    },
    {
      date: '2026-03-25',
      description: 'PT Session Payment (8 sessions)',
      member: 'Emma Davis',
      amount: 9600,
      status: 'pending',
    },
    {
      date: '2026-03-24',
      description: 'Bonus - Top Performer',
      member: 'Gym Management',
      amount: 2400,
      status: 'pending',
    },
  ];

  const breakdown = [
    { category: 'PT Sessions', amount: 54000, percentage: 69 },
    { category: 'Commission', amount: 15000, percentage: 19 },
    { category: 'Bonuses', amount: 6600, percentage: 8 },
    { category: 'Other', amount: 2400, percentage: 4 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F59E0B]/80 rounded-2xl p-5 shadow-lg text-white">
        <h2 className="text-[18px] font-bold mb-4">Earnings Summary</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[12px] text-white/80 mb-1">This Month</div>
            <div className="text-[24px] font-bold">₹{(summary.thisMonth / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[12px] text-white/80 mb-1">Last Month</div>
            <div className="text-[20px] font-semibold">₹{(summary.lastMonth / 1000).toFixed(0)}K</div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[12px] text-white/80 mb-1">Paid</div>
            <div className="text-[18px] font-semibold text-green-200">₹{(summary.paid / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[12px] text-white/80 mb-1">Pending</div>
            <div className="text-[18px] font-semibold text-yellow-200">₹{(summary.pending / 1000).toFixed(0)}K</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-600">Growth</div>
          </div>
          <div className="text-[20px] font-semibold text-green-600">+5.4%</div>
          <div className="text-[11px] text-gray-500">vs last month</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-[11px] text-gray-600">Next Payout</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">Mar 30</div>
          <div className="text-[11px] text-gray-500">5 days</div>
        </div>
      </div>

      {/* Tabs for ledger sections */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="tax">Tax Info</TabsTrigger>
        </TabsList>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4 mt-4">
          {/* Earnings Breakdown */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
            <div className="space-y-3">
              {breakdown.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-gray-600">{item.category}</span>
                    <span className="text-[14px] font-semibold text-gray-900">₹{(item.amount / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm text-white">
            <h3 className="text-[15px] font-semibold mb-3">Monthly Comparison</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/90">This Month</span>
                <span className="font-semibold">₹{(summary.thisMonth / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/90">Last Month</span>
                <span className="font-semibold">₹{(summary.lastMonth / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between text-[13px] pt-2 border-t border-white/20">
                <span className="text-white/90">Growth</span>
                <span className="font-semibold text-green-200">+5.4%</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-gray-900">Recent Transactions</h3>
              <button className="text-[#F59E0B] text-[13px] font-medium">View All</button>
            </div>

            <div className="space-y-3">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-[13px] font-semibold text-gray-900">{transaction.description}</h4>
                      <p className="text-[11px] text-gray-600 mt-1">{transaction.member}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                      transaction.status === 'paid'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {transaction.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                    <span className="text-[15px] font-bold text-gray-900">₹{transaction.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white border-2 border-[#F59E0B] text-[#F59E0B] rounded-xl p-4 shadow-sm hover:bg-[#F59E0B] hover:text-white transition-colors flex flex-col items-center gap-2">
              <Download className="w-5 h-5" />
              <span className="text-[13px] font-semibold">Download Report</span>
            </button>
            <button className="bg-white border-2 border-[#327f74] text-[#327f74] rounded-xl p-4 shadow-sm hover:bg-[#327f74] hover:text-white transition-colors flex flex-col items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="text-[13px] font-semibold">View Details</span>
            </button>
          </div>
        </TabsContent>

        {/* Tax Info Tab */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          {/* Tax Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-[14px] font-semibold text-blue-900 mb-2">Tax Information</h4>
            <p className="text-[12px] text-blue-700 mb-3">
              Your YTD earnings: ₹4,52,000. Download your quarterly tax statement for filing.
            </p>
            <button className="text-[12px] text-blue-600 font-medium hover:underline">
              Download Tax Statement →
            </button>
          </div>

          {/* Year to Date Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Year to Date Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Total Earnings</span>
                <span className="text-[14px] font-semibold text-gray-900">₹4,52,000</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Total Sessions</span>
                <span className="text-[14px] font-semibold text-gray-900">287</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Avg. per Session</span>
                <span className="text-[14px] font-semibold text-gray-900">₹1,575</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-gray-600">Active Clients</span>
                <span className="text-[14px] font-semibold text-gray-900">28</span>
              </div>
            </div>
          </div>

          {/* Tax Documents */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Tax Documents</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-[13px] text-gray-900">Q1 2026 Statement</span>
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-[13px] text-gray-900">Q4 2025 Statement</span>
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-[13px] text-gray-900">Annual 2025 Summary</span>
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}