import { Clock, Users, Target, DollarSign, Play, CheckCircle, MessageCircle, Calendar } from 'lucide-react';

export default function TrainerHome() {
  const trainerInfo = {
    name: 'Rahul Mehta',
    specialization: 'Strength & Conditioning',
    rating: 4.9,
  };

  const todaysStats = {
    sessionsScheduled: 6,
    sessionsCompleted: 3,
    activeMembers: 24,
    todayEarnings: '₹4,500',
  };

  const todaySessions = [
    {
      time: '09:00 AM',
      member: 'Sarah Johnson',
      type: 'PT Session',
      focus: 'Upper Body',
      status: 'completed',
    },
    {
      time: '10:30 AM',
      member: 'Mike Chen',
      type: 'PT Session',
      focus: 'Core Training',
      status: 'completed',
    },
    {
      time: '02:00 PM',
      member: 'Emma Davis',
      type: 'PT Session',
      focus: 'Cardio & Flexibility',
      status: 'upcoming',
    },
    {
      time: '04:00 PM',
      member: 'James Wilson',
      type: 'PT Session',
      focus: 'Strength Training',
      status: 'upcoming',
    },
  ];

  const pendingTasks = [
    { task: 'Update workout plan for Sarah', urgent: true },
    { task: 'Send nutrition guide to Mike', urgent: false },
    { task: 'Review progress photos - Emma', urgent: false },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F59E0B]/80 rounded-2xl p-5 shadow-lg text-white">
        <h2 className="text-[20px] font-bold mb-1">
          Good morning, {trainerInfo.name.split(' ')[0]}! 👋
        </h2>
        <p className="text-[13px] text-white/90">{trainerInfo.specialization}</p>
        <div className="flex items-center gap-1 mt-2 text-[14px]">
          <span className="text-white">★</span>
          <span className="font-semibold">{trainerInfo.rating}</span>
          <span className="text-white/80 ml-1">Rating</span>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#327f74]/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#327f74]" />
            </div>
            <div className="text-[11px] text-gray-600">Sessions Today</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">
            {todaysStats.sessionsCompleted}/{todaysStats.sessionsScheduled}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#F5C742]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#F5C742]" />
            </div>
            <div className="text-[11px] text-gray-600">Today's Earnings</div>
          </div>
          <div className="text-[20px] font-semibold text-[#F5C742]">{todaysStats.todayEarnings}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-[11px] text-gray-600">Active Members</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">{todaysStats.activeMembers}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-600">Monthly Target</div>
          </div>
          <div className="text-[20px] font-semibold text-green-600">78%</div>
        </div>
      </div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-[14px] font-semibold text-yellow-900 mb-3">Pending Tasks</h3>
          <div className="space-y-2">
            {pendingTasks.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <div className="flex-1">
                  <p className={`text-[13px] ${item.urgent ? 'text-yellow-900 font-medium' : 'text-yellow-800'}`}>
                    {item.task}
                  </p>
                  {item.urgent && (
                    <span className="text-[10px] text-red-600 font-medium">Urgent</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-gray-900">Today's Schedule</h3>
          <button className="text-[#F59E0B] text-[13px] font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {todaySessions.map((session, index) => (
            <div
              key={index}
              className={`border-2 rounded-xl p-4 ${
                session.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`${
                  session.status === 'completed' ? 'bg-green-500' : 'bg-[#F59E0B]'
                } rounded-lg px-3 py-2 text-white text-center min-w-[70px]`}>
                  <div className="text-[12px] font-semibold">{session.time}</div>
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-gray-900">{session.member}</h4>
                  <p className="text-[12px] text-gray-600 mt-1">{session.type} • {session.focus}</p>
                  
                  {session.status === 'completed' ? (
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-[12px]">
                      <CheckCircle className="w-3 h-3" />
                      <span className="font-medium">Completed</span>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2 bg-[#F59E0B] text-white rounded-lg text-[12px] font-medium hover:bg-[#F59E0B]/90 transition-colors flex items-center justify-center gap-1">
                        <Play className="w-3 h-3" />
                        Start Session
                      </button>
                      <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="border-2 border-[#F59E0B] text-[#F59E0B] rounded-xl p-3 text-[13px] font-medium hover:bg-[#F59E0B] hover:text-white transition-colors">
            Message Member
          </button>
          <button className="border-2 border-[#327f74] text-[#327f74] rounded-xl p-3 text-[13px] font-medium hover:bg-[#327f74] hover:text-white transition-colors">
            Create Workout
          </button>
          <button className="border-2 border-[#F5C742] text-[#F5C742] rounded-xl p-3 text-[13px] font-medium hover:bg-[#F5C742] hover:text-white transition-colors">
            Track Progress
          </button>
          <button className="border-2 border-purple-500 text-purple-500 rounded-xl p-3 text-[13px] font-medium hover:bg-purple-500 hover:text-white transition-colors">
            View Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
