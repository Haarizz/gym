import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Users, Tag, BarChart3, ChevronLeft } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/staff', icon: Users, label: 'Staff' },
    { path: '/admin/deals', icon: Tag, label: 'Deals' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleBack = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full max-w-[390px] mx-auto bg-[#f9fafe] flex flex-col">
      {/* Header */}
      <div className="bg-[#327f74] px-4 py-4 flex items-center gap-3">
        <button onClick={handleBack} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-[16px] font-semibold">Admin</h1>
          <p className="text-white/80 text-[12px]">Command Center</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-[390px] bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'text-[#327f74] bg-[#327f74]/10'
                  : 'text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}