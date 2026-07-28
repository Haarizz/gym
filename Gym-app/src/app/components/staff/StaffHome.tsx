import { Users, UserPlus, Phone, Clock, Target, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export default function StaffHome() {
  const staffInfo = {
    name: 'Priya Patel',
    role: 'Front Desk Executive',
    branch: 'Downtown',
  };

  const todaysStats = {
    leadsAdded: 8,
    followUpsCompleted: 12,
    conversions: 3,
    checkins: 45,
  };

  const urgentFollowUps = [
    {
      name: 'Amit Kumar',
      phone: '+1 (555) 123-4567',
      inquiry: 'Premium Membership',
      lastContact: '2 days ago',
      priority: 'high',
    },
    {
      name: 'Sneha Reddy',
      phone: '+1 (555) 234-5678',
      inquiry: 'PT Package',
      lastContact: '1 day ago',
      priority: 'high',
    },
    {
      name: 'Rajesh Singh',
      phone: '+1 (555) 345-6789',
      inquiry: 'Basic Membership',
      lastContact: '3 days ago',
      priority: 'medium',
    },
  ];

  const recentConversions = [
    { name: 'Vikram Patel', plan: 'Premium Annual', amount: '₹24,999' },
    { name: 'Maya Sharma', plan: 'PT Package (12)', amount: '₹18,000' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-5 shadow-lg text-white">
        <h2 className="text-[20px] font-bold mb-1">
          Hello, {staffInfo.name.split(' ')[0]}! 👋
        </h2>
        <p className="text-[13px] text-white/90">{staffInfo.role}</p>
        <div className="flex items-center gap-2 mt-2 text-[13px]">
          <span className="text-white/80">Branch:</span>
          <span className="font-semibold">{staffInfo.branch}</span>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#F5C742]/10 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#F5C742]" />
            </div>
            <div className="text-[11px] text-gray-600">Leads Added</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">{todaysStats.leadsAdded}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#327f74]/10 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#327f74]" />
            </div>
            <div className="text-[11px] text-gray-600">Follow-ups</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">{todaysStats.followUpsCompleted}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-600">Conversions</div>
          </div>
          <div className="text-[20px] font-semibold text-green-600">{todaysStats.conversions}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-[11px] text-gray-600">Check-ins</div>
          </div>
          <div className="text-[20px] font-semibold text-gray-900">{todaysStats.checkins}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-gradient-to-r from-[#F5C742] to-[#F59E0B] text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <UserPlus className="w-6 h-6 mx-auto mb-2" />
          <div className="text-[13px] font-semibold">Add New Lead</div>
        </button>
        <button className="bg-gradient-to-r from-[#327f74] to-[#2a6b62] text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <CheckCircle className="w-6 h-6 mx-auto mb-2" />
          <div className="text-[13px] font-semibold">Member Check-in</div>
        </button>
      </div>

      {/* Urgent Follow-ups */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-[16px] font-semibold text-gray-900">Urgent Follow-ups</h3>
          </div>
          <button className="text-[#327f74] text-[13px] font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {urgentFollowUps.map((lead, index) => (
            <div key={index} className={`border-2 rounded-xl p-3 ${
              lead.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-[14px] font-semibold text-gray-900">{lead.name}</h4>
                  <p className="text-[12px] text-gray-600">{lead.inquiry}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                  lead.priority === 'high' 
                    ? 'bg-red-200 text-red-700' 
                    : 'bg-yellow-200 text-yellow-700'
                }`}>
                  {lead.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Last: {lead.lastContact}</span>
                <button className="px-3 py-1 bg-[#327f74] text-white rounded-lg text-[11px] font-medium hover:bg-[#2a6b62] transition-colors flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Call Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Conversions */}
      {recentConversions.length > 0 && (
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" />
            <h3 className="text-[15px] font-semibold">Today's Wins! 🎉</h3>
          </div>
          <div className="space-y-2">
            {recentConversions.map((conversion, index) => (
              <div key={index} className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold">{conversion.name}</div>
                    <div className="text-[11px] text-white/80">{conversion.plan}</div>
                  </div>
                  <div className="text-[15px] font-bold">{conversion.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">This Month</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Target Achievement</span>
            <span className="text-[14px] font-semibold text-green-600">78%</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Total Conversions</span>
            <span className="text-[14px] font-semibold text-gray-900">24</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[13px] text-gray-600">Revenue Generated</span>
            <span className="text-[14px] font-semibold text-[#F5C742]">₹3.2L</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] text-gray-600">Conversion Rate</span>
            <span className="text-[14px] font-semibold text-gray-900">62%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
