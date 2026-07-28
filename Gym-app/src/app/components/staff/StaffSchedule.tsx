import { Calendar, Clock, UserPlus, Phone, Plus } from 'lucide-react';

export default function StaffSchedule() {
  const todaysTasks = [
    {
      time: '09:00 AM',
      type: 'Follow-up',
      name: 'Amit Kumar',
      action: 'Call for membership inquiry',
      priority: 'high',
    },
    {
      time: '10:30 AM',
      type: 'Meeting',
      name: 'Branch Manager',
      action: 'Weekly performance review',
      priority: 'medium',
    },
    {
      time: '02:00 PM',
      type: 'Follow-up',
      name: 'Sneha Reddy',
      action: 'PT package discussion',
      priority: 'high',
    },
    {
      time: '04:00 PM',
      type: 'Tour',
      name: 'New Walk-in',
      action: 'Facility tour & consultation',
      priority: 'medium',
    },
  ];

  const upcomingFollowUps = [
    { name: 'Rajesh Singh', date: '2026-03-26', time: '11:00 AM', type: 'Basic Membership' },
    { name: 'Deepa Menon', date: '2026-03-27', time: '03:00 PM', type: 'Annual Plan' },
    { name: 'Karan Desai', date: '2026-03-28', time: '10:00 AM', type: 'PT Package' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">Today's Schedule</h2>
            <p className="text-[13px] text-gray-600">Wednesday, March 25, 2026</p>
          </div>
          <Calendar className="w-6 h-6 text-[#327f74]" />
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-gray-600">Tasks: {todaysTasks.length}</span>
          <span className="font-semibold text-[#327f74]">3 High Priority</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Today</div>
          <div className="text-[20px] font-semibold text-[#327f74]">{todaysTasks.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">This Week</div>
          <div className="text-[20px] font-semibold text-[#F5C742]">18</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Pending</div>
          <div className="text-[20px] font-semibold text-red-600">5</div>
        </div>
      </div>

      {/* Add Task Button */}
      <button className="w-full bg-gradient-to-r from-[#327f74] to-[#2a6b62] text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        <span className="font-semibold">Add New Task</span>
      </button>

      {/* Today's Tasks */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Today's Tasks</h3>
        <div className="space-y-3">
          {todaysTasks.map((task, index) => (
            <div
              key={index}
              className={`border-2 rounded-xl p-4 ${
                task.priority === 'high'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`${
                  task.priority === 'high' ? 'bg-red-500' : 'bg-[#327f74]'
                } rounded-lg px-3 py-2 text-white text-center min-w-[70px]`}>
                  <div className="text-[12px] font-semibold">{task.time}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      task.type === 'Follow-up'
                        ? 'bg-blue-100 text-blue-700'
                        : task.type === 'Meeting'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {task.type.toUpperCase()}
                    </span>
                    {task.priority === 'high' && (
                      <span className="px-2 py-0.5 bg-red-200 text-red-700 rounded-full text-[10px] font-medium">
                        URGENT
                      </span>
                    )}
                  </div>
                  <h4 className="text-[14px] font-semibold text-gray-900 mb-1">{task.name}</h4>
                  <p className="text-[12px] text-gray-600">{task.action}</p>
                  <div className="flex gap-2 mt-3">
                    {task.type === 'Follow-up' && (
                      <button className="flex-1 py-2 bg-[#327f74] text-white rounded-lg text-[12px] font-medium hover:bg-[#2a6b62] transition-colors flex items-center justify-center gap-1">
                        <Phone className="w-3 h-3" />
                        Call Now
                      </button>
                    )}
                    <button className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-[12px] font-medium hover:bg-gray-200 transition-colors">
                      Mark Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Follow-ups */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Upcoming Follow-ups</h3>
        <div className="space-y-3">
          {upcomingFollowUps.map((followup, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="bg-[#F5C742]/10 rounded-lg px-3 py-2 text-center min-w-[60px]">
                <div className="text-[10px] text-gray-600 uppercase">
                  {new Date(followup.date).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-[16px] font-bold text-[#F5C742]">
                  {new Date(followup.date).getDate()}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-[13px] font-semibold text-gray-900">{followup.name}</h4>
                <p className="text-[11px] text-gray-600">{followup.type}</p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{followup.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Tip */}
      <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-2xl p-4 shadow-sm text-white">
        <h3 className="text-[15px] font-semibold mb-2">Productivity Tip 💡</h3>
        <p className="text-[12px] text-white/90">
          Complete your high-priority follow-ups before noon to maximize conversion chances!
        </p>
      </div>
    </div>
  );
}
