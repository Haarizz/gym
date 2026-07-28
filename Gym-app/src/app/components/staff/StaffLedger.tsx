"use client";

import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export default function StaffLedger() {
  const summary = {
    thisMonth: 24000,
    lastMonth: 22000,
    baseSalary: 18000,
    commission: 6000,
  };

  const recentEarnings = [
    {
      date: '2026-03-20',
      description: 'Commission - 3 Conversions',
      details: 'Sarah, Mike, Emma',
      amount: 4500,
      status: 'paid',
    },
    {
      date: '2026-03-15',
      description: 'Commission - 2 Conversions',
      details: 'James, Lisa',
      amount: 3000,
      status: 'paid',
    },
    {
      date: '2026-03-10',
      description: 'Performance Bonus',
      details: 'Weekly target achieved',
      amount: 2000,
      status: 'paid',
    },
    {
      date: '2026-03-25',
      description: 'Commission - 2 Conversions',
      details: 'Pending approval',
      amount: 3000,
      status: 'pending',
    },
  ];

  const breakdown = [
    { category: 'Base Salary', amount: 18000, percentage: 75 },
    { category: 'Commission', amount: 4500, percentage: 18.75 },
    { category: 'Bonuses', amount: 1500, percentage: 6.25 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-5 shadow-lg text-white">
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
            <div className="text-[12px] text-white/80 mb-1">Base Salary</div>
            <div className="text-[18px] font-semibold">₹{(summary.baseSalary / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[12px] text-white/80 mb-1">Commission</div>
            <div className="text-[18px] font-semibold text-green-200">₹{(summary.commission / 1000).toFixed(0)}K</div>
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
          <div className="text-[20px] font-semibold text-green-600">+9%</div>
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
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
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
                    <span className="text-[14px] font-semibold text-gray-900">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#327f74] rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commission Structure Info */}
          <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-2xl p-4 shadow-sm text-white">
            <h3 className="text-[15px] font-semibold mb-3">Commission Structure</h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-white/90">Membership Sale</span>
                <span className="font-semibold">₹1,500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/90">PT Package Sale</span>
                <span className="font-semibold">₹1,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/90">Add-on Sale</span>
                <span className="font-semibold">₹500</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4 mt-4">
          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-gray-900">Recent Earnings</h3>
              <button className="text-[#327f74] text-[13px] font-medium">View All</button>
            </div>

            <div className="space-y-3">
              {recentEarnings.map((earning, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-[13px] font-semibold text-gray-900">{earning.description}</h4>
                      <p className="text-[11px] text-gray-600 mt-1">{earning.details}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                      earning.status === 'paid'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {earning.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      {new Date(earning.date).toLocaleDateString()}
                    </span>
                    <span className="text-[15px] font-bold text-gray-900">₹{earning.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <button className="w-full bg-white border-2 border-[#327f74] text-[#327f74] rounded-xl p-4 shadow-sm hover:bg-[#327f74] hover:text-white transition-colors flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            <span className="font-semibold">Download Salary Slip</span>
          </button>
        </TabsContent>

        {/* Tax Info Tab */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          {/* Tax Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-[14px] font-semibold text-blue-900 mb-2">Tax Information</h4>
            <p className="text-[12px] text-blue-700 mb-3">
              Your YTD earnings: ₹2,68,000. TDS deducted: ₹8,040
            </p>
            <button className="text-[12px] text-blue-600 font-medium hover:underline">
              View Tax Details →
            </button>
          </div>

          {/* Year to Date Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Year to Date Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Total Earnings</span>
                <span className="text-[14px] font-semibold text-gray-900">₹2,68,000</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Base Salary Paid</span>
                <span className="text-[14px] font-semibold text-gray-900">₹2,00,000</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Total Commission</span>
                <span className="text-[14px] font-semibold text-green-600">₹68,000</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-gray-600">Conversions</span>
                <span className="text-[14px] font-semibold text-gray-900">42</span>
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