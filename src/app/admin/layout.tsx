'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, FileText, Car, Navigation2, MapPin,
  Tags, Users, Shield, Moon, Sun, LogOut, Menu, X,
  Bell, ChevronRight, Activity, Building2, ArrowLeft,
} from 'lucide-react';
import AdminNotifications from '@/components/AdminNotifications';

const ADMIN_COPY = {
  groupCore: 'Основни',
  groupOps: 'Операции',
  groupSettings: 'Настройки',
  home: 'Начало',
  reports: 'Сигнали',
  vehicleIncidents: 'Авто сигнали',
  routing: 'Маршрутизация',
  heatmap: 'Топлинна карта',
  categories: 'Категории',
  institutions: 'Институции',
  responsible: 'Отговорни лица',
  security: 'Сигурност',
  loading: 'Зареждане...',
  administration: 'Администрация',
  switchToLight: 'Светла тема',
  switchToDark: 'Тъмна тема',
  logout: 'Изход',
  panel: 'Контролен панел',
  site: 'Сайт',
} as const;

type NavItem = { href: string; label: string; icon: any; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

function getNavGroups(): NavGroup[] {
  const t = ADMIN_COPY;
  return [
    {
      label: t.groupCore,
      items: [
        { href: '/admin', label: t.home, icon: LayoutDashboard, exact: true },
        { href: '/admin/reports', label: t.reports, icon: FileText },
        { href: '/admin/vehicle-incidents', label: t.vehicleIncidents, icon: Car },
      ],
    },
    {
      label: t.groupOps,
      items: [
        { href: '/admin/dispatch', label: t.routing, icon: Navigation2 },
        { href: '/admin/heatmap', label: t.heatmap, icon: MapPin },
      ],
    },
    {
      label: t.groupSettings,
      items: [
        { href: '/admin/categories', label: t.categories, icon: Tags },
        { href: '/admin/institutions', label: t.institutions, icon: Building2 },
        { href: '/admin/responsible-persons', label: t.responsible, icon: Users },
        { href: '/admin/security', label: t.security, icon: Shield },
      ],
    },
  ];
}

function getPageTitle(pathname: string): string {
  const navGroups = getNavGroups();
  const flat = navGroups.flatMap(g => g.items);
  const match = [...flat].reverse().find(item =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );
  return match?.label ?? ADMIN_COPY.home;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const copy = ADMIN_COPY;
  const navGroups = getNavGroups();
  const [user, setUser] = useState<any>(null);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Init theme before paint
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('site-theme') ?? localStorage.getItem('admin-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'site-theme' && e.newValue) {
        const nextDark = e.newValue === 'dark';
        setDark(nextDark);
        document.documentElement.classList.toggle('dark', nextDark);
        document.documentElement.classList.toggle('light', !nextDark);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('site-theme', next ? 'dark' : 'light');
    localStorage.setItem('admin-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      if (!['ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COUNCILOR'].includes(parsedUser.role)) {
        console.warn(`User role ${parsedUser.role} is not authorized for admin panel`);
        router.push('/dashboard');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/auth/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (!user) {
    return (
      <div className="admin-root min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 animate-pulse shadow-lg shadow-orange-500/30" />
          <p className="text-xs admin-muted uppercase tracking-[0.4em]">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root flex min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        sidebar-panel
        fixed lg:sticky lg:top-0 z-30 h-screen
        transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-[260px] flex flex-col flex-shrink-0
      `}>
        {/* Brand */}
        <div className="px-5 pt-7 pb-5">
          <Link href="/admin" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
            <Image
              src="/branding/logo-cut.png"
              alt="ResQ София"
              width={48}
              height={58}
              className="h-11 w-auto object-contain flex-shrink-0"
              priority
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] admin-muted font-medium">ResQ</p>
              <p className="text-[15px] font-bold rc-display admin-text leading-tight">{copy.administration}</p>
            </div>
          </Link>
        </div>

        <div className="mx-5 h-px admin-divider mb-1" />

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.45em] admin-muted font-semibold">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${active ? 'nav-item-active' : 'nav-item-inactive'}
                      `}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight size={13} className="opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-5 h-px admin-divider" />

        {/* Bottom: Theme + User */}
        <div className="px-4 py-4 space-y-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl nav-item-inactive text-sm transition-all duration-200 group"
            >
              <span className={`
                relative w-8 h-4 rounded-full flex-shrink-0 transition-colors duration-300
                ${dark ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}
              `}>
                <span className={`
                  absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300
                  ${dark ? 'translate-x-4' : 'translate-x-0'}
                `} />
              </span>
              <span className="admin-muted text-xs">
                {dark ? copy.switchToLight : copy.switchToDark}
              </span>
              <span className="ml-auto">
                {dark
                  ? <Sun size={14} className="admin-muted group-hover:text-amber-400 transition-colors" />
                  : <Moon size={14} className="admin-muted group-hover:text-violet-400 transition-colors" />
                }
              </span>
            </button>
          )}

          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold admin-text truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] admin-muted truncate">{user.role?.replace('_', ' ').toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              title={copy.logout}
              className="p-1.5 rounded-lg nav-item-inactive flex-shrink-0 transition-all duration-200"
            >
              <LogOut size={14} className="admin-muted" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="topbar-panel px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl nav-item-inactive"
            >
              <Menu size={18} className="admin-muted" />
            </button>
            <div>
              <p className="text-[10px] admin-muted uppercase tracking-widest">{copy.panel}</p>
              <p className="text-base font-bold rc-display admin-text">{getPageTitle(pathname)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl topbar-btn transition-all duration-200"
                title={dark ? copy.switchToLight : copy.switchToDark}
                aria-label={dark ? copy.switchToLight : copy.switchToDark}
              >
                {dark ? <Sun size={16} className="admin-muted" /> : <Moon size={16} className="admin-muted" />}
              </button>
            )}
            <div className="relative">
              <AdminNotifications />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl topbar-btn">
              <Activity size={13} className="text-emerald-400" />
              <span className="text-xs admin-muted">Live</span>
            </div>
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl topbar-btn text-xs admin-muted transition-all duration-200"
            >
              <ArrowLeft size={13} /> {copy.site}
            </Link>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 admin-bg p-5 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
