import { Calendar as CalendarIcon, Clock, User, Plus, Filter } from 'lucide-react';
import { useState } from 'react';

export default function TrainerSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekSchedule = [
    {
      day: 'Mon',
      date: 25,
      sessions: [
        { time: '09:00 AM', member: 'Sarah Johnson', type: 'PT', duration: '60 min' },
        { time: '10:30 AM', member: 'Mike Chen', type: 'PT', duration: '45 min' },
        { time: '02:00 PM', member: 'Emma Davis', type: 'PT', duration: '60 min' },
      ],
    },
    {
      day: 'Tue',
      date: 26,
      sessions: [
        { time: '07:00 AM', member: 'James Wilson', type: 'PT', duration: '60 min' },
        { time: '11:00 AM', member: 'Lisa Brown', type: 'PT', duration: '45 min' },
        { time: '03:00 PM', member: 'Tom Anderson', type: 'PT', duration: '60 min' },
        { time: '05:00 PM', member: 'Alex Turner', type: 'PT', duration: '45 min' },
      ],
    },
    {
      day: 'Wed',
      date: 27,
      sessions: [
        { time: '09:00 AM', member: 'Sarah Johnson', type: 'PT', duration: '60 min' },
        { time: '02:00 PM', member: 'Emma Davis', type: 'PT', duration: '60 min' },
      ],
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <select className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-[14px] border border-gray-200">
            <option>This Week</option>
            <option>Next Week</option>
            <option>This Month</option>
          </select>
          <button className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-gray-600">March 25 - 31, 2026</span>
          <span className="font-semibold text-gray-900">17 Sessions</span>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">This Week</div>
          <div className="text-[20px] font-semibold text-[#F59E0B]">17</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Next Week</div>
          <div className="text-[20px] font-semibold text-[#327f74]">14</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Open Slots</div>
          <div className="text-[20px] font-semibold text-[#F5C742]">8</div>
        </div>
      </div>

      {/* Add Session Button */}
      <button className="w-full bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]/80 text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        <span className="font-semibold">Add New Session</span>
      </button>

      {/* Week Schedule */}
      <div className="space-y-3">
        {weekSchedule.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white rounded-2xl p-4 shadow-sm">
            {/* Day Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex flex-col items-center justify-center">
                  <div className="text-[10px] text-gray-600 uppercase">{day.day}</div>
                  <div className="text-[16px] font-bold text-[#F59E0B]">{day.date}</div>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">{day.day}day</h3>
                  <p className="text-[12px] text-gray-600">{day.sessions.length} sessions</p>
                </div>
              </div>
              <button className="text-[#F59E0B] text-[13px] font-medium">Details</button>
            </div>

            {/* Sessions List */}
            <div className="space-y-2">
              {day.sessions.map((session, sessionIndex) => (
                <div key={sessionIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="bg-[#F59E0B] rounded-lg px-3 py-2 text-white min-w-[70px] text-center">
                    <div className="text-[11px] font-semibold">{session.time}</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-gray-900">{session.member}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                      <span>{session.type}</span>
                      <span>•</span>
                      <span>{session.duration}</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <User className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Availability Settings */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-4 shadow-sm text-white">
        <h3 className="text-[15px] font-semibold mb-2">Manage Availability</h3>
        <p className="text-[12px] text-white/90 mb-3">
          Set your working hours and block off time when you're unavailable
        </p>
        <button className="bg-white text-[#327f74] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/90 transition-colors">
          Update Schedule
        </button>
      </div>
    </div>
  );
}
