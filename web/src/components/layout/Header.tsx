import React from 'react';
import { Menu, Bell, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Operations Dashboard',
  '/tasks': 'Collection Tasks & Routes',
  '/tasks/create': 'Create Collection Task',
  '/availability': 'Collector Availability',
  '/locations': 'LGAs, Wards & Polling Units',
  '/pickups': 'Resident Pickup Requests',
  '/collectors': 'Waste Collectors Directory',
  '/residents': 'Registered Residents',
  '/payments': 'Payments & Billing Log',
  '/users': 'System User Accounts',
  '/logs': 'System Activity Audit Logs',
  '/profile': 'Administrator Profile',
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Match title or subpath
  let currentTitle = pageTitles[location.pathname];
  if (!currentTitle) {
    if (location.pathname.startsWith('/tasks/')) currentTitle = 'Task Details';
    else if (location.pathname.startsWith('/collectors/')) currentTitle = 'Collector Details';
    else if (location.pathname.startsWith('/residents/')) currentTitle = 'Resident Details';
    else if (location.pathname.startsWith('/pickups/')) currentTitle = 'Pickup Request Details';
    else currentTitle = 'Admin Portal';
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{currentTitle}</h2>
          <p className="text-xs text-slate-500 hidden sm:block">Akure Waste Management Authority</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Environment / System Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>System Online</span>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs uppercase">
            {user?.name ? user.name[0] : 'A'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-800 leading-none">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-brand-teal inline" /> Administrator
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log Out"
            className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
