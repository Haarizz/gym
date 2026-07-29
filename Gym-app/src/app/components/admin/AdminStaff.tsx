import { Search, Star, TrendingUp, Target, MessageCircle, Calendar } from 'lucide-react';

export default function AdminStaff() {
  const staffMembers = [
    {
      name: 'Rahul Sharma',
      role: 'Sales Manager',
      target: '₹2L',
      achieved: '₹2.4L',
      conversion: '85%',
      ptHandled: 24,
      attendance: '95%',
      rating: 4.8,
      status: 'excellent',
    },
    {
      name: 'Priya Patel',
      role: 'Front Desk',
      target: '₹1.5L',
      achieved: '₹1.6L',
      conversion: '78%',
      ptHandled: 18,
      attendance: '92%',
      rating: 4.6,
      status: 'on-track',
    },
    {
      name: 'Amit Kumar',
      role: 'Sales Executive',
      target: '₹1.8L',
      achieved: '₹1.3L',
      conversion: '62%',
      ptHandled: 12,
      attendance: '88%',
      rating: 4.2,
      status: 'at-risk',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'on-track':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'at-risk':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff by name or role..."
          className="flex-1 bg-transparent text-[14px] outline-none"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Total Staff</div>
          <div className="text-[20px] font-semibold text-gray-900">20</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Present</div>
          <div className="text-[20px] font-semibold text-green-600">18</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-600 mb-1">Absent</div>
          <div className="text-[20px] font-semibold text-red-600">2</div>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        {staffMembers.map((staff, index) => (
          <div key={index} className="bg-white rounded-2xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-full flex items-center justify-center text-white font-semibold">
                  {staff.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">{staff.name}</h3>
                  <p className="text-[12px] text-gray-600">{staff.role}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(staff.status)}`}>
                {staff.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-gray-600" />
                  <span className="text-[11px] text-gray-600">Target Achievement</span>
                </div>
                <div className="text-[14px] font-semibold text-gray-900">
                  {staff.achieved} / {staff.target}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-gray-600" />
                  <span className="text-[11px] text-gray-600">Conversion</span>
                </div>
                <div className="text-[14px] font-semibold text-gray-900">{staff.conversion}</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="flex items-center justify-between text-[12px] mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-600" />
                <span className="text-gray-600">PT: {staff.ptHandled}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-gray-600" />
                <span className="text-gray-600">Attendance: {staff.attendance}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-gray-900 font-medium">{staff.rating}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-[#327f74] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a6b62] transition-colors">
                View Details
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Button */}
      <button className="w-full py-3 bg-gradient-to-r from-[#327f74] to-[#2a6b62] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all">
        + Add New Staff Member
      </button>
    </div>
  );
}
