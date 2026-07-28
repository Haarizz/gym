import { User, Mail, Phone, Settings, LogOut, Bell, Shield, MapPin } from 'lucide-react';

export default function StaffProfile() {
  const profile = {
    name: 'Priya Patel',
    email: 'priya.patel@gymbios.com',
    phone: '+1 (555) 234-5678',
    role: 'Front Desk Executive',
    branch: 'Downtown',
    employeeId: 'EMP-2024-042',
    joinedDate: '2024-01-15',
  };

  const stats = [
    { label: 'Total Conversions', value: '156' },
    { label: 'Active Leads', value: '34' },
    { label: 'Rating', value: '4.6★' },
    { label: 'Experience', value: '2+ yrs' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#327f74] to-[#2a6b62] rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[28px] font-bold">
            PP
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] font-bold">{profile.name}</h2>
            <p className="text-[13px] text-white/90">{profile.role}</p>
            <div className="flex items-center gap-1 mt-2 text-[12px]">
              <MapPin className="w-3 h-3" />
              <span>{profile.branch} Branch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-[12px] text-gray-600 mb-1">{stat.label}</div>
            <div className="text-[24px] font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-gray-900">Personal Information</h3>
          <button className="text-[#327f74] text-[13px] font-medium">Edit</button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-gray-600">Email</div>
              <div className="text-[14px] text-gray-900">{profile.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-gray-600">Phone</div>
              <div className="text-[14px] text-gray-900">{profile.phone}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-gray-600">Employee ID</div>
              <div className="text-[14px] text-gray-900">{profile.employeeId}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-gray-600">Branch</div>
              <div className="text-[14px] text-gray-900">{profile.branch}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Settings</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-[14px] text-gray-900">Notifications</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="text-[14px] text-gray-900">Privacy & Security</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-[14px] text-gray-900">App Preferences</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-4">Support</h3>
        <div className="space-y-2">
          <button className="w-full text-left py-3 text-[14px] text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            Help Center
          </button>
          <button className="w-full text-left py-3 text-[14px] text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            Contact Manager
          </button>
          <button className="w-full text-left py-3 text-[14px] text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            Report an Issue
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <button className="w-full bg-red-50 border-2 border-red-200 text-red-600 rounded-xl py-3 font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
        <LogOut className="w-5 h-5" />
        Logout
      </button>

      {/* App Version */}
      <div className="text-center text-[12px] text-gray-500 pb-4">
        GymBios v1.0.0
      </div>
    </div>
  );
}
