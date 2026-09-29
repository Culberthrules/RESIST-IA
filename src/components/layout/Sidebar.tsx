'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/(auth)/actions';
import {
  LayoutDashboard,
  Upload,
  ClipboardCheck,
  LogOut,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  userName: string;
  userRole: string;
  labName: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Data', icon: Upload },
  { href: '/review', label: 'Review Queue', icon: ClipboardCheck },
];

export function Sidebar({ userName, userRole, labName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col bg-surface-900/80 backdrop-blur-xl border-r border-surface-800 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 z-50 w-6 h-6 bg-surface-700 hover:bg-surface-600 border border-surface-600 rounded-full flex items-center justify-center text-surface-300 hover:text-surface-100 transition-all duration-200 shadow-lg"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={`p-4 border-b border-surface-800 ${collapsed ? 'px-3' : 'px-5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="fade-in">
              <h1 className="text-lg font-bold gradient-text leading-tight">RESIST-IA</h1>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">AMR Surveillance</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-surface-500 group-hover:text-surface-300'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={`border-t border-surface-800 p-4 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-surface-200 truncate">{userName}</p>
            <p className="text-xs text-surface-500 truncate">{labName}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              {userRole}
            </span>
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className={`flex items-center gap-2 text-sm text-surface-400 hover:text-danger-400 transition-colors w-full ${
              collapsed ? 'justify-center py-2' : 'px-1'
            }`}
            title="Sign out"
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
