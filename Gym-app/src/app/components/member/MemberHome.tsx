import { Scan, Calendar, Dumbbell, Flame, Trophy, Clock, MapPin, Bell } from 'lucide-react';

export default function MemberHome() {
  const membershipStatus = {
    isActive: true,
    memberName: 'Sarah Johnson',
    gymName: 'FitZone Downtown',
    membershipType: 'Premium Annual',
    daysRemaining: 245,
    validUntil: '2026-12-25',
  };

  const todaysSchedule = [
    { time: '06:00 AM', class: 'Morning Yoga', trainer: 'Maya Singh', spots: '3 left' },
    { time: '05:30 PM', class: 'HIIT Training', trainer: 'Rahul Mehta', spots: 'Full' },
  ];

  const quickStats = [
    { label: 'Check-ins', value: '24', icon: Scan, color: 'bg-[#327f74]' },
    { label: 'Classes', value: '12', icon: Calendar, color: 'bg-[#F5C742]' },
    { label: 'Calories', value: '8.2K', icon: Flame, color: 'bg-[#F59E0B]' },
    { label: 'Streak', value: '7 days', icon: Trophy, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">
              Welcome back, {membershipStatus.memberName.split(' ')[0]}! 👋
            </h2>
            <p className="text-[13px] text-gray-600 mt-1">Ready to crush your goals today?</p>
          </div>
          <button className="relative p-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Active Membership Card */}
      <div className="bg-gradient-to-br from-[#F5C742] to-[#F59E0B] rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[12px] text-white/80 mb-1">Active Membership</div>
            <h3 className="text-[18px] font-bold">{membershipStatus.membershipType}</h3>
            <div className="flex items-center gap-1 mt-2 text-[13px]">
              <MapPin className="w-3 h-3" />
              <span>{membershipStatus.gymName}</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-medium">
            ACTIVE
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <div className="text-[11px] text-white/80">Days Remaining</div>
            <div className="text-[20px] font-bold">{membershipStatus.daysRemaining}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/80">Valid Until</div>
            <div className="text-[13px] font-semibold">
              {new Date(membershipStatus.validUntil).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Button */}
      <button className="w-full bg-gradient-to-r from-[#327f74] to-[#2a6b62] text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-center gap-3">
          <Scan className="w-6 h-6" />
          <div>
            <div className="text-[18px] font-bold">Check In Now</div>
            <div className="text-[12px] text-white/80">Gate access ready</div>
          </div>
        </div>
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-[14px] font-bold text-gray-900">{stat.value}</div>
            <div className="text-[10px] text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-gray-900">Today's Schedule</h3>
          <button className="text-[#F5C742] text-[13px] font-medium">View All</button>
        </div>

        {todaysSchedule.length > 0 ? (
          <div className="space-y-3">
            {todaysSchedule.map((session, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#F5C742]/10 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-[#F5C742] font-medium">
                      {session.time}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[14px] font-semibold text-gray-900">{session.class}</h4>
                    <p className="text-[12px] text-gray-600">with {session.trainer}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[11px] px-2 py-1 rounded-full ${
                        session.spots === 'Full' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {session.spots}
                      </span>
                      <button className="text-[#F5C742] text-[12px] font-medium">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-[13px]">
            No classes booked for today
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="border-2 border-[#F5C742] text-[#F5C742] rounded-xl p-3 text-[13px] font-medium hover:bg-[#F5C742] hover:text-white transition-colors">
            Book a Class
          </button>
          <button className="border-2 border-[#327f74] text-[#327f74] rounded-xl p-3 text-[13px] font-medium hover:bg-[#327f74] hover:text-white transition-colors">
            Contact Trainer
          </button>
          <button className="border-2 border-[#F59E0B] text-[#F59E0B] rounded-xl p-3 text-[13px] font-medium hover:bg-[#F59E0B] hover:text-white transition-colors">
            Buy Add-ons
          </button>
          <button className="border-2 border-purple-500 text-purple-500 rounded-xl p-3 text-[13px] font-medium hover:bg-purple-500 hover:text-white transition-colors">
            View Progress
          </button>
        </div>
      </div>

      {/* Offer Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-sm text-white">
        <h3 className="text-[15px] font-bold mb-1">Special Offer! 🎉</h3>
        <p className="text-[12px] text-white/90 mb-3">
          Renew your membership now and get 15% off + 1 month free PT sessions
        </p>
        <button className="bg-white text-purple-600 rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-white/90 transition-colors">
          View Offer
        </button>
      </div>
    </div>
  );
}
