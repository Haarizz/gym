import { Dumbbell, Users, Video, TrendingUp } from 'lucide-react';

interface ModeSelectionProps {
  onModeSelect: (mode: 'member' | 'admin' | 'trainer' | 'staff') => void;
}

export default function ModeSelection({ onModeSelect }: ModeSelectionProps) {
  return (
    <div className="min-h-screen w-full max-w-[390px] mx-auto bg-gradient-to-br from-[#f9fafe] to-[#eef7f6]">
      {/* Top App Bar */}
      <div className="bg-white px-5 py-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#327f74] flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[#1e293b] text-[20px] font-semibold">GymBios</h1>
            <p className="text-[#327f74] text-[12px]">Fitness Business OS</p>
          </div>
        </div>
        <p className="text-[#49587a] text-[14px] mt-2">
          Choose your experience to get started
        </p>
      </div>

      {/* Cards */}
      <div className="px-5 pt-8 space-y-4">
        {/* Admin Card */}
        <button
          onClick={() => onModeSelect('admin')}
          className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-[#327f74]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#327f74] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#1e293b] text-[16px] font-semibold mb-1">
                GymBios Admin
              </h2>
              <p className="text-[#49587a] text-[13px] leading-relaxed">
                Command center for owners and managers. Track performance, manage staff, and analyze business metrics.
              </p>
            </div>
          </div>
        </button>

        {/* Member Card */}
        <button
          onClick={() => onModeSelect('member')}
          className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-[#F5C742]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5C742] flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#1e293b] text-[16px] font-semibold mb-1">
                GymBios Member
              </h2>
              <p className="text-[#49587a] text-[13px] leading-relaxed">
                Your fitness journey. Check-in, book classes, manage membership, and connect with trainers.
              </p>
            </div>
          </div>
        </button>

        {/* Trainer/Staff Card */}
        <button
          onClick={() => onModeSelect('trainer')}
          className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-[#F59E0B]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#1e293b] text-[16px] font-semibold mb-1">
                GymBios Trainer
              </h2>
              <p className="text-[#49587a] text-[13px] leading-relaxed">
                Manage your schedule, track performance, connect with members, and view earnings.
              </p>
            </div>
          </div>
        </button>

        {/* Staff Card */}
        <button
          onClick={() => onModeSelect('staff')}
          className="w-full bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-[#327f74]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#327f74] to-[#2a6b62] flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#1e293b] text-[16px] font-semibold mb-1">
                GymBios Staff
              </h2>
              <p className="text-[#49587a] text-[13px] leading-relaxed">
                Front desk operations. Manage leads, handle sales, track performance, and schedule tasks.
              </p>
            </div>
          </div>
        </button>

        {/* Virtual Studio Coming Soon */}
        <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl p-5 text-left border-2 border-dashed border-gray-300 opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-300 flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[#1e293b] text-[16px] font-semibold">
                  Virtual Studio
                </h2>
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded-full">Coming Soon</span>
              </div>
              <p className="text-[#49587a] text-[13px] leading-relaxed">
                Create and manage online fitness programs, live sessions, and digital memberships.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Accent */}
      <div className="px-5 mt-8">
        <div className="h-1 bg-gradient-to-r from-[#327f74] via-[#F5C742] to-[#F59E0B] rounded-full"></div>
      </div>
    </div>
  );
}