import { Target, TrendingUp, Award, Star, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StaffPerformance() {
  const performance = {
    monthlyTarget: 150000,
    achieved: 117000,
    percentage: 78,
    conversionsTarget: 30,
    conversionsAchieved: 24,
    rating: 4.6,
  };

  const monthlyData = [
    { month: 'Oct', conversions: 22, revenue: 108000 },
    { month: 'Nov', conversions: 26, revenue: 124000 },
    { month: 'Dec', conversions: 30, revenue: 145000 },
    { month: 'Jan', conversions: 28, revenue: 132000 },
    { month: 'Feb', conversions: 25, revenue: 118000 },
    { month: 'Mar', conversions: 24, revenue: 117000 },
  ];

  const leaderboard = [
    { name: 'Rahul Sharma', conversions: 32, revenue: '₹1.6L', rank: 1 },
    { name: 'Priya Patel', conversions: 24, revenue: '₹1.2L', rank: 2 },
    { name: 'Amit Kumar', conversions: 18, revenue: '₹0.9L', rank: 3 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Performance Card */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-5 shadow-lg text-white">
        <h2 className="text-[18px] font-bold mb-4">Monthly Performance</h2>
        
        {/* Revenue Target */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-white/80">Revenue Target</span>
            <span className="text-[15px] font-bold">
              ₹{(performance.achieved / 1000).toFixed(0)}K / ₹{(performance.monthlyTarget / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${performance.percentage}%` }}></div>
          </div>
          <div className="text-right mt-1 text-[12px] text-white/90">{performance.percentage}% achieved</div>
        </div>

        {/* Conversions Target */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-white/80">Conversions Target</span>
            <span className="text-[15px] font-bold">
              {performance.conversionsAchieved} / {performance.conversionsTarget}
            </span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full" 
              style={{ width: `${(performance.conversionsAchieved / performance.conversionsTarget) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <div className="text-[11px] text-gray-600">Rating</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">{performance.rating}</div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div className="text-[11px] text-gray-600">Growth</div>
          </div>
          <div className="text-[20px] font-semibold text-green-600">+8%</div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <div className="text-[11px] text-gray-600">Leads</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">152</div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">6-Month Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
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
            <Bar dataKey="conversions" fill="#327f74" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[#F5C742]" />
          <h3 className="text-[16px] font-semibold text-gray-900">Branch Leaderboard</h3>
        </div>
        <div className="space-y-3">
          {leaderboard.map((staff, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                index === 0 ? 'bg-[#F5C742]' : index === 1 ? 'bg-[#F59E0B]' : 'bg-gray-400'
              }`}>
                {staff.rank}
              </div>
              <div className="flex-1">
                <h4 className="text-[14px] font-semibold text-gray-900">{staff.name}</h4>
                <div className="flex items-center gap-3 text-[12px] text-gray-600">
                  <span>{staff.conversions} conversions</span>
                  <span>•</span>
                  <span className="font-semibold text-[#327f74]">{staff.revenue}</span>
                </div>
              </div>
              {index === 1 && (
                <span className="px-2 py-1 bg-[#327f74] text-white rounded-full text-[10px] font-medium">
                  YOU
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-gray-600">Conversion Rate</span>
              <span className="text-[14px] font-semibold text-gray-900">62%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#327f74] rounded-full" style={{ width: '62%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-gray-600">Follow-up Completion</span>
              <span className="text-[14px] font-semibold text-gray-900">85%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#F5C742] rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-gray-600">Customer Satisfaction</span>
              <span className="text-[14px] font-semibold text-gray-900">92%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Motivation Card */}
      <div className="bg-gradient-to-r from-[#F5C742] to-[#F59E0B] rounded-2xl p-4 shadow-lg text-white">
        <h3 className="text-[15px] font-semibold mb-2">Keep Going! 💪</h3>
        <p className="text-[13px] text-white/90">
          You need 6 more conversions to hit your target. You're on track to become this month's top performer!
        </p>
      </div>
    </div>
  );
}
