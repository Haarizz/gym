"use client";

import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export default function AdminAnalytics() {
  const revenueData = [
    { month: 'Oct', revenue: 180000 },
    { month: 'Nov', revenue: 220000 },
    { month: 'Dec', revenue: 240000 },
    { month: 'Jan', revenue: 280000 },
    { month: 'Feb', revenue: 260000 },
    { month: 'Mar', revenue: 320000 },
  ];

  const membershipData = [
    { month: 'Oct', new: 45, churned: 12 },
    { month: 'Nov', new: 52, churned: 8 },
    { month: 'Dec', new: 68, churned: 15 },
    { month: 'Jan', new: 72, churned: 10 },
    { month: 'Feb', new: 58, churned: 14 },
    { month: 'Mar', new: 87, churned: 9 },
  ];

  const branchPerformance = [
    { name: 'Downtown', revenue: 145000, members: 520, rating: 4.8 },
    { name: 'Uptown', revenue: 112000, members: 425, rating: 4.6 },
    { name: 'Westside', revenue: 98000, members: 380, rating: 4.5 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* AI Insights Card */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5" />
          <h3 className="text-[15px] font-semibold">AI Insights</h3>
        </div>
        <p className="text-[13px] text-white/90 leading-relaxed">
          Membership renewals are up 14% vs last month. Class utilization in Downtown branch has increased by 22%. PT sales show strong momentum.
        </p>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-[11px] text-gray-600">Revenue Growth</div>
              </div>
              <div className="text-[20px] font-semibold text-gray-900">+23%</div>
              <div className="text-[11px] text-gray-500">vs last month</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-[11px] text-gray-600">Member Growth</div>
              </div>
              <div className="text-[20px] font-semibold text-gray-900">+12%</div>
              <div className="text-[11px] text-gray-500">vs last month</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-[11px] text-gray-600">Churn Rate</div>
              </div>
              <div className="text-[20px] font-semibold text-gray-900">3.2%</div>
              <div className="text-[11px] text-green-600">-1.5% improvement</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-[11px] text-gray-600">Avg Revenue</div>
              </div>
              <div className="text-[20px] font-semibold text-gray-900">₹2.6K</div>
              <div className="text-[11px] text-gray-500">per member</div>
            </div>
          </div>

          {/* Membership Growth Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">New Members vs Churn</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={membershipData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#666" />
                <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar key="new-members" dataKey="new" fill="#F5C742" radius={[8, 8, 0, 0]} />
                <Bar key="churned-members" dataKey="churned" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Revenue Trend (6 Months)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#327f74" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#327f74" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#666" />
                <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#327f74" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Branch Performance */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Branch Rankings</h3>
            <div className="space-y-3">
              {branchPerformance.map((branch, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-[#F5C742]' : index === 1 ? 'bg-[#F59E0B]' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-[14px] font-semibold text-gray-900">{branch.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[14px] font-bold text-gray-900">{branch.rating}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <div className="text-gray-600">Revenue</div>
                      <div className="font-semibold text-gray-900">₹{(branch.revenue / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Members</div>
                      <div className="font-semibold text-gray-900">{branch.members}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4 mt-4">
          {/* Class Utilization */}
          <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-2xl p-4 shadow-sm">
            <h3 className="text-white text-[15px] font-semibold mb-3">Class Utilization</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white text-[13px]">
                <span>Yoga Classes</span>
                <span className="font-semibold">92%</span>
              </div>
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '92%' }}></div>
              </div>
              
              <div className="flex items-center justify-between text-white text-[13px] mt-3">
                <span>Cardio Classes</span>
                <span className="font-semibold">78%</span>
              </div>
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '78%' }}></div>
              </div>
              
              <div className="flex items-center justify-between text-white text-[13px] mt-3">
                <span>Strength Training</span>
                <span className="font-semibold">85%</span>
              </div>
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>

          {/* Trainer Productivity */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Trainer Productivity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Avg. Sessions per Trainer</span>
                <span className="text-[14px] font-semibold text-gray-900">24</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Member Satisfaction</span>
                <span className="text-[14px] font-semibold text-green-600">4.7/5.0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-gray-600">PT Package Sales</span>
                <span className="text-[14px] font-semibold text-gray-900">₹4.8L</span>
              </div>
            </div>
          </div>

          {/* E-commerce Health */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Add-on Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Protein Supplements</span>
                <span className="text-[14px] font-semibold text-gray-900">₹45K</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-[13px] text-gray-600">Guest Passes</span>
                <span className="text-[14px] font-semibold text-gray-900">₹18K</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-gray-600">Locker Rentals</span>
                <span className="text-[14px] font-semibold text-gray-900">₹32K</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}