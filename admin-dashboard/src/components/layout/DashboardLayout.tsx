'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Users, ClipboardCheck, MapPin, Car, Store,
  Phone, CreditCard, FileText, Trophy, Bell, StickyNote, AlertTriangle,
  Target, DollarSign, Calendar, Receipt, Settings, LogOut, Menu, ChevronLeft, ChevronRight,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/employees', icon: Users, label: 'Employees' },
  { href: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { href: '/live-map', icon: MapPin, label: 'Live Map' },
  { href: '/drivers', icon: Car, label: 'Drivers' },
  { href: '/retailers', icon: Store, label: 'Retailers' },
  { href: '/calls', icon: Phone, label: 'Call Logs' },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  { href: '/reports', icon: FileText, label: 'Daily Reports' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/notices', icon: Bell, label: 'Notices' },
  { href: '/notes', icon: StickyNote, label: 'Notes' },
  { href: '/warnings', icon: AlertTriangle, label: 'Warnings' },
  { href: '/targets', icon: Target, label: 'Targets' },
  { href: '/salary', icon: DollarSign, label: 'Salary' },
  { href: '/leaves', icon: Calendar, label: 'Leaves' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/app-config', icon: Settings, label: 'App Config' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const adminName = typeof window !== 'undefined' ? localStorage.getItem('adminName') || 'Admin' : 'Admin';

  const SidebarContent = ({ mobile = false }) => (
    <aside className={cn('flex flex-col bg-gray-900 text-white h-full transition-all duration-200', !mobile && (collapsed ? 'w-16' : 'w-56'))}>
      <div className={cn('flex items-center gap-2.5 px-4 py-4 border-b border-gray-800', collapsed && !mobile && 'justify-center px-0')}>
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        {(!collapsed || mobile) && <div><p className="text-sm font-bold text-white leading-tight">Movigo</p><p className="text-[10px] text-gray-400">FieldOps</p></div>}
        {!mobile && <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 rounded hover:bg-gray-800">{collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />}</button>}
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)}
              className={cn('flex items-center gap-2.5 my-0.5 px-3 py-2 text-xs font-medium transition-all',
                collapsed && !mobile ? 'mx-0 justify-center rounded-none px-0' : 'mx-2 rounded-lg',
                active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}
              title={collapsed && !mobile ? item.label : undefined}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn('p-3 border-t border-gray-800', collapsed && !mobile && 'px-0')}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">{adminName[0]?.toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-medium text-white truncate">{adminName}</p><p className="text-[10px] text-gray-400">Admin</p></div>
            <button onClick={handleLogout} className="p-1 rounded hover:bg-gray-700" title="Logout"><LogOut className="w-3.5 h-3.5 text-gray-400" /></button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center py-2 hover:bg-gray-800 rounded" title="Logout"><LogOut className="w-4 h-4 text-gray-400" /></button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:flex"><SidebarContent /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50 w-56"><SidebarContent mobile /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5 text-gray-600" /></button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">Movigo FieldOps Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
