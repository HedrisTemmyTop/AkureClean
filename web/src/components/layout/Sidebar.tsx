import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Route,
  Navigation,
  Trash2,
  Truck,
  Users,
  CreditCard,
  ShieldCheck,
  FileText,
  User,
  LogOut,
  Sparkles,
  Calendar,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navLinks = [
    {
      group: 'Overview',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Operations',
      items: [
        { name: 'Collection Tasks', path: '/tasks', icon: Route },
        { name: 'Collector Availability', path: '/availability', icon: Calendar },
        { name: 'Live Driver Tracking', path: '/tracking', icon: Navigation },
        { name: 'Pickup Requests', path: '/pickups', icon: Trash2 },
        { name: 'LGAs, Wards & Polling Units', path: '/locations', icon: MapPin },
      ],
    },
    {
      group: 'People & Finance',
      items: [
        { name: 'Collectors (Drivers)', path: '/collectors', icon: Truck },
        { name: 'Residents', path: '/residents', icon: Users },
        { name: 'Payments & Billing', path: '/payments', icon: CreditCard },
      ],
    },
    {
      group: 'System',
      items: [
        { name: 'User Management', path: '/users', icon: ShieldCheck },
        { name: 'Audit Logs', path: '/logs', icon: FileText },
        { name: 'Admin Profile', path: '/profile', icon: User },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-teal to-brand-green flex items-center justify-center text-white shadow-md shadow-brand-teal/20">
            <Sparkles className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
              SmartEnv
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-teal/30 text-teal-300 px-1.5 py-0.5 rounded border border-brand-teal/40">
                Admin
              </span>
            </h1>
            <p className="text-xs text-slate-400">Waste Management Portal</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navLinks.map((group) => (
            <div key={group.group}>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-brand-teal text-white shadow-sm font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with logged-in admin user and logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-800/50 border border-teal-500/40 text-teal-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@smartenv.ng'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
