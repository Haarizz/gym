import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, Calendar, TrendingUp, Wallet, UserCircle, ChevronLeft } from 'lucide-react';

export default function TrainerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/trainer', icon: Home, label: 'Home' },
    { path: '/trainer/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/trainer/performance', icon: TrendingUp, label: 'Performance' },
    { path: '/trainer/ledger', icon: Wallet, label: 'Ledger' },
    { path: '/trainer/profile', icon: UserCircle, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/trainer') {
      return location.pathname === '/trainer';
    }
    return location.pathname.startsWith(path);
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full max-w-[390px] mx-auto bg-[#f9fafe] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]/80 px-4 py-4 flex items-center gap-3">
        <button onClick={handleBack} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-[16px] font-semibold">Trainer Portal</h1>
          <p className="text-white/90 text-[12px]">Empower Your Members</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-[390px] bg-white border-t border-gray-200 px-1 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'text-[#F59E0B] bg-[#F59E0B]/10'
                  : 'text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
