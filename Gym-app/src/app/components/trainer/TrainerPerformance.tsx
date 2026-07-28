import { TrendingUp, Target, Star, Users, DollarSign, Award, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrainerPerformance() {
  const performance = {
    monthlyTarget: 100000,
    achieved: 78000,
    percentage: 78,
    sessionsTarget: 80,
    sessionsCompleted: 62,
    rating: 4.9,
    reviews: 142,
    activeClients: 24,
  };

  const monthlyData = [
    { month: 'Oct', sessions: 58, earnings: 65000 },
    { month: 'Nov', sessions: 64, earnings: 71000 },
    { month: 'Dec', sessions: 70, earnings: 76000 },
    { month: 'Jan', sessions: 75, earnings: 82000 },
    { month: 'Feb', sessions: 68, earnings: 74000 },
    { month: 'Mar', sessions: 62, earnings: 78000 },
  ];

  const achievements = [
    { title: 'Top Performer', month: 'January 2026', icon: Award },
    { title: '100+ Sessions', milestone: '105 completed', icon: Target },
    { title: '5-Star Rating', count: '50 reviews', icon: Star },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Performance Overview */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F59E0B]/80 rounded-2xl p-5 shadow-lg text-white">
        <h2 className="text-[18px] font-bold mb-4">Monthly Performance</h2>
        
        {/* Target Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-white/80">Revenue Target</span>
            <span className="text-[15px] font-bold">₹{(performance.achieved / 1000).toFixed(0)}K / ₹{(performance.monthlyTarget / 1000).toFixed(0)}K</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${performance.percentage}%` }}></div>
          </div>
          <div className="text-right mt-1 text-[12px] text-white/90">{performance.percentage}% achieved</div>
        </div>

        {/* Sessions Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-white/80">Session Target</span>
            <span className="text-[15px] font-bold">{performance.sessionsCompleted} / {performance.sessionsTarget}</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full" 
              style={{ width: `${(performance.sessionsCompleted / performance.sessionsTarget) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
            </div>
            <div className="text-[11px] text-gray-600">Rating</div>
          </div>
          <div className="text-[24px] font-semibold text-gray-900">{performance.rating}</div>
          <div className="text-[11px] text-gray-500">{performance.reviews} reviews</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-[11px] text-gray-600">Active Clients</div>
          </div>
          <div className="text-[24px] font-semibold text-gray-900">{performance.activeClients}</div>
          <div className="text-[11px] text-green-600">+3 this month</div>
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
            <Bar dataKey="sessions" fill="#F59E0B" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        <div className="space-y-3">
          {achievements.map((achievement, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#F5C742]/10 to-[#F59E0B]/10 rounded-xl border border-[#F5C742]/30">
              <div className="w-12 h-12 bg-[#F5C742] rounded-xl flex items-center justify-center">
                <achievement.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-[14px] font-semibold text-gray-900">{achievement.title}</h4>
                <p className="text-[12px] text-gray-600">{achievement.month || achievement.milestone || achievement.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client Feedback */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Recent Feedback</h3>
        <div className="space-y-3">
          <div className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-[12px] text-gray-600">Sarah Johnson</span>
            </div>
            <p className="text-[13px] text-gray-700">
              "Excellent trainer! Really knows how to push you to achieve your goals."
            </p>
          </div>
          <div className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-[12px] text-gray-600">Mike Chen</span>
            </div>
            <p className="text-[13px] text-gray-700">
              "Very knowledgeable and patient. Highly recommended!"
            </p>
          </div>
        </div>
        <button className="w-full mt-3 py-2 text-[#F59E0B] text-[13px] font-medium hover:underline">
          View All Reviews
        </button>
      </div>

      {/* Performance Tips */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm text-white">
        <h3 className="text-[15px] font-semibold mb-2">Performance Tip</h3>
        <p className="text-[12px] text-white/90">
          You're 22% away from your monthly target. Book 4 more sessions this week to stay on track!
        </p>
      </div>
    </div>
  );
}
