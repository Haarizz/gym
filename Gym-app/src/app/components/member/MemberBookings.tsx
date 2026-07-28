import { Calendar, Clock, Users, MapPin, Plus } from 'lucide-react';

export default function MemberBookings() {
  const upcomingBookings = [
    {
      id: 1,
      class: 'Morning Yoga Flow',
      date: '2026-03-26',
      time: '06:00 AM',
      duration: '60 min',
      trainer: 'Maya Singh',
      location: 'Studio A',
      spots: 12,
      spotsLeft: 3,
      status: 'confirmed',
    },
    {
      id: 2,
      class: 'HIIT Training',
      date: '2026-03-26',
      time: '05:30 PM',
      duration: '45 min',
      trainer: 'Rahul Mehta',
      location: 'Main Floor',
      spots: 15,
      spotsLeft: 0,
      status: 'confirmed',
    },
    {
      id: 3,
      class: 'Strength & Conditioning',
      date: '2026-03-27',
      time: '07:00 AM',
      duration: '60 min',
      trainer: 'Amit Patel',
      location: 'Weight Room',
      spots: 10,
      spotsLeft: 5,
      status: 'confirmed',
    },
  ];

  const pastBookings = [
    {
      class: 'Cardio Blast',
      date: '2026-03-24',
      time: '06:00 PM',
      trainer: 'Priya Sharma',
      attended: true,
    },
    {
      class: 'Power Yoga',
      date: '2026-03-23',
      time: '07:00 AM',
      trainer: 'Maya Singh',
      attended: true,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Upcoming</div>
          <div className="text-[20px] font-semibold text-[#F5C742]">{upcomingBookings.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">This Week</div>
          <div className="text-[20px] font-semibold text-[#327f74]">5</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Attended</div>
          <div className="text-[20px] font-semibold text-[#F59E0B]">42</div>
        </div>
      </div>

      {/* Book New Class Button */}
      <button className="w-full bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        <span className="font-semibold">Book a New Class</span>
      </button>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Upcoming Classes</h3>
        <div className="space-y-3">
          {upcomingBookings.map((booking) => (
            <div key={booking.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#F5C742] transition-colors">
              {/* Class Title */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-[15px] font-semibold text-gray-900">{booking.class}</h4>
                  <p className="text-[12px] text-gray-600">with {booking.trainer}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium border border-green-200">
                  CONFIRMED
                </span>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#F5C742]/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#F5C742]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-600">Date</div>
                    <div className="text-[13px] font-semibold text-gray-900">
                      {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#327f74]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#327f74]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-600">Time</div>
                    <div className="text-[13px] font-semibold text-gray-900">{booking.time}</div>
                  </div>
                </div>
              </div>

              {/* Location & Capacity */}
              <div className="flex items-center justify-between text-[12px] pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>{booking.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-600" />
                  <span className={`font-medium ${booking.spotsLeft === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {booking.spotsLeft > 0 ? `${booking.spotsLeft} spots left` : 'Full'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors">
                  View Details
                </button>
                <button className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-[13px] font-medium hover:bg-red-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Bookings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Past Classes</h3>
        <div className="space-y-2">
          {pastBookings.map((booking, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <h4 className="text-[14px] font-semibold text-gray-900">{booking.class}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-gray-600">
                    {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[12px] text-gray-600">{booking.time}</span>
                  <span className="text-[12px] text-gray-600">{booking.trainer}</span>
                </div>
              </div>
              {booking.attended && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                  ✓ Attended
                </span>
              )}
            </div>
          ))}
        </div>
        <button className="w-full mt-3 py-2 text-[#F5C742] text-[13px] font-medium hover:underline">
          View All History
        </button>
      </div>
    </div>
  );
}
