'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Layers, Clock, Activity, CheckCircle2, ArrowUpRight,
  Tags, Users, FileText, Car, MapPin, Navigation2,
  Shield, TrendingUp, AlertTriangle, Wifi, Database,
  Mail, Server,
} from 'lucide-react';
import { useI18n } from '@/i18n';

/* ── Animated counter ──────────────────────────── */
function useCounter(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ── Stat card ─────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  iconBg: string;
  icon: LucideIcon;
  delay?: number;
  trend?: string;
}
function StatCard({ label, value, iconBg, icon: Icon, delay = 0, trend }: StatCardProps) {
  const count = useCounter(value);
  return (
    <div
      className="stat-card animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className={`stat-icon-wrap ${iconBg}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
            <TrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-[0.35em] admin-muted font-medium">{label}</p>
      <p className="text-4xl font-bold rc-display admin-text mt-1.5 tabular-nums">{count}</p>
    </div>
  );
}

/* ── Quick action ──────────────────────────────── */
interface ActionProps {
  href: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  gradient: string;
  delay?: number;
}
function QuickAction({ href, icon: Icon, label, desc, gradient, delay = 0 }: ActionProps) {
  return (
    <Link
      href={href}
      className="quick-action-card animate-fade-up group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3.5 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold admin-text">{label}</p>
      <p className="text-[11px] admin-muted mt-0.5 leading-snug">{desc}</p>
    </Link>
  );
}

/* ── Category bar colors ───────────────────────── */
const BAR_COLORS = [
  'from-violet-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-teal-500 to-emerald-500',
  'from-indigo-500 to-purple-500',
  'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500',
];

/* ══════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const [stats, setStats] = useState<any>(null);
  const copy = {
    panel: locale === 'bg' ? 'Контролен панел' : locale === 'en' ? 'Control panel' : 'لوحة التحكم',
    allReports: locale === 'bg' ? 'Всички сигнали' : locale === 'en' ? 'All reports' : 'كل البلاغات',
    heatmap: locale === 'bg' ? 'Топлинна карта' : locale === 'en' ? 'Heatmap' : 'خريطة حرارية',
    total: locale === 'bg' ? 'Общо сигнали' : locale === 'en' ? 'Total reports' : 'إجمالي البلاغات',
    waiting: locale === 'bg' ? 'Изчакване' : locale === 'en' ? 'Pending' : 'بانتظار المعالجة',
    inProgress: locale === 'bg' ? 'В процес' : locale === 'en' ? 'In progress' : 'قيد التنفيذ',
    resolved: locale === 'bg' ? 'Решени' : locale === 'en' ? 'Resolved' : 'تم الحل',
    quick: locale === 'bg' ? 'Бърз достъп' : locale === 'en' ? 'Quick access' : 'وصول سريع',
    recent: locale === 'bg' ? 'Последни сигнали' : locale === 'en' ? 'Recent reports' : 'آخر البلاغات',
    system: locale === 'bg' ? 'Статус на системата' : locale === 'en' ? 'System status' : 'حالة النظام',
    systemsOn: locale === 'bg' ? 'Всички системи активни' : locale === 'en' ? 'All systems online' : 'كل الأنظمة تعمل',
    security: locale === 'bg' ? 'Сигурност на акаунта' : locale === 'en' ? 'Account security' : 'أمان الحساب',
    securityBtn: locale === 'bg' ? 'Настройки за сигурност' : locale === 'en' ? 'Security settings' : 'إعدادات الأمان',
  };
  const [loading, setLoading] = useState(true);
  const getLocalizedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return tr('Лека нощ', 'Good night', 'تصبح على خير');
    if (hour < 12) return tr('Добро утро', 'Good morning', 'صباح الخير');
    if (hour < 18) return tr('Добър ден', 'Good afternoon', 'مساء الخير');
    return tr('Добър вечер', 'Good evening', 'مساء الخير');
  };
  const quickActions = [
    {
      href: '/admin/categories',
      icon: Tags,
      label: tr('Категории', 'Categories', 'الفئات'),
      desc: tr('Управление', 'Manage', 'إدارة'),
      gradient: 'from-violet-500 to-indigo-500 text-white',
      delay: 300,
    },
    {
      href: '/admin/responsible-persons',
      icon: Users,
      label: tr('Отговорни лица', 'Responsible persons', 'الأشخاص المسؤولون'),
      desc: tr('Управление на лица', 'Manage persons', 'إدارة الأشخاص'),
      gradient: 'from-blue-500 to-cyan-500 text-white',
      delay: 360,
    },
    {
      href: '/admin/reports',
      icon: FileText,
      label: tr('Сигнали', 'Reports', 'البلاغات'),
      desc: tr('Преглед на всички', 'View all', 'عرض الكل'),
      gradient: 'from-amber-500 to-orange-500 text-white',
      delay: 420,
    },
    {
      href: '/admin/vehicle-incidents',
      icon: Car,
      label: tr('Авто сигнали', 'Vehicle reports', 'بلاغات المركبات'),
      desc: tr('Диспечер потвърждение', 'Dispatcher validation', 'تأكيد الموجّه'),
      gradient: 'from-rose-500 to-pink-500 text-white',
      delay: 480,
    },
    {
      href: '/admin/heatmap',
      icon: MapPin,
      label: tr('Топлинна карта', 'Heatmap', 'الخريطة الحرارية'),
      desc: tr('Визуализация', 'Visualization', 'عرض مرئي'),
      gradient: 'from-teal-500 to-emerald-500 text-white',
      delay: 540,
    },
    {
      href: '/admin/dispatch',
      icon: Navigation2,
      label: tr('Маршрутизация', 'Routing', 'التوجيه'),
      desc: tr('Автоматично насочване', 'Auto assignment', 'توجيه تلقائي'),
      gradient: 'from-orange-500 to-amber-500 text-white',
      delay: 600,
    },
  ];
  const statusCfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: tr('Изчакване', 'Pending', 'بانتظار المعالجة'), cls: 'badge-pending' },
    IN_PROGRESS: { label: tr('В процес', 'In progress', 'قيد التنفيذ'), cls: 'badge-progress' },
    RESOLVED: { label: tr('Решен', 'Resolved', 'تم الحل'), cls: 'badge-resolved' },
    REJECTED: { label: tr('Отхвърлен', 'Rejected', 'مرفوض'), cls: 'badge-rejected' },
  };
  const services = [
    { label: tr('API Сървър', 'API Server', 'خادم API'), icon: Server, status: 'ok', detail: tr('Отговаря нормално', 'Operating normally', 'يعمل بشكل طبيعي') },
    { label: tr('База данни', 'Database', 'قاعدة البيانات'), icon: Database, status: 'ok', detail: 'Supabase · pg' },
    { label: tr('WebSocket', 'WebSocket', 'ويب سوكيت'), icon: Wifi, status: 'ok', detail: 'Socket.IO · active' },
    { label: tr('SMTP поща', 'SMTP Mail', 'بريد SMTP'), icon: Mail, status: 'warn', detail: tr('IDLE · не изпраща', 'IDLE · not sending', 'خامل · لا يرسل') },
  ];

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const total = stats?.stats.totalReports ?? 0;
  const pending = stats?.stats.pendingReports ?? 0;
  const inProgress = stats?.stats.inProgressReports ?? 0;
  const resolved = stats?.stats.resolvedReports ?? 0;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-36 skeleton-card rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 skeleton-card rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── HERO BANNER ──────────────────────────────── */}
      <div
        className="welcome-banner rounded-3xl p-8 md:p-10 relative overflow-hidden animate-fade-up"
        style={{ animationFillMode: 'backwards' }}
      >
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-orange-400/25 to-rose-500/20 blur-3xl" />
          <div className="absolute -bottom-12 left-1/3 w-56 h-56 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/15 blur-3xl" />
          <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCA0MCBNIDAgMCBMIDQwIDQwIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
        </div>

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.5em] admin-muted font-semibold">{getLocalizedGreeting()},</p>
          <h1 className="text-3xl md:text-5xl font-extrabold rc-display admin-text mt-2 leading-none">
            {tr('Контролен', 'Control', 'لوحة')}<br />
            <span className="text-gradient-orange">{copy.panel}</span>
          </h1>
          <p className="admin-muted mt-3 max-w-lg text-sm leading-relaxed">
            {tr('Мониторинг на градските сигнали, управление на ресурси и диспечиране в реално време.', 'Monitor city reports, manage resources, and dispatch in real time.', 'مراقبة بلاغات المدينة وإدارة الموارد والتوجيه في الوقت الحقيقي.')}
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              <FileText size={15} /> {copy.allReports}
            </Link>
            <Link
              href="/admin/heatmap"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl topbar-btn text-sm font-medium admin-text hover:-translate-y-0.5 transition-all duration-200"
            >
              <MapPin size={15} /> {copy.heatmap}
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={copy.total} value={total} iconBg="stat-total" icon={Layers} delay={0} />
        <StatCard label={copy.waiting} value={pending} iconBg="stat-pending" icon={Clock} delay={80} />
        <StatCard label={copy.inProgress} value={inProgress} iconBg="stat-progress" icon={Activity} delay={160} />
        <StatCard label={copy.resolved} value={resolved} iconBg="stat-resolved" icon={CheckCircle2} delay={240} />
      </div>

      {/* ── QUICK ACTIONS ──────────────────────────── */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.45em] admin-muted font-semibold mb-4">{copy.quick}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </div>

      {/* ── DATA ROW ───────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Category distribution — 3 cols */}
        <div
          className="data-card rounded-3xl p-6 lg:col-span-3 animate-fade-up"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold rc-display admin-text">{tr('Категории сигнали', 'Report categories', 'فئات البلاغات')}</h2>
            <ArrowUpRight size={16} className="admin-muted" />
          </div>
          <div className="space-y-3.5">
            {(stats?.categoryStats ?? []).slice(0, 8).map((stat: any, i: number) => {
              const label = stat.categoryName || stat.category || tr('Неизвестно', 'Unknown', 'غير معروف');
              const count = typeof stat._count === 'number' ? stat._count : stat._count?._all ?? 0;
              const max = Math.max(
                ...(stats?.categoryStats ?? []).map((s: any) =>
                  typeof s._count === 'number' ? s._count : s._count?._all ?? 0
                ), 1
              );
              const pct = Math.round((count / max) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="admin-text font-medium truncate max-w-[72%]">
                      {String(label).replace(/_/g, ' ')}
                    </span>
                    <span className="admin-muted tabular-nums font-semibold">{count}</span>
                  </div>
                  <div className="h-1.5 admin-track rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${BAR_COLORS[i % BAR_COLORS.length]} rounded-full`}
                      style={{
                        width: `${pct}%`,
                        transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
                        transitionDelay: `${500 + i * 70}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent reports — 2 cols */}
        <div
          className="data-card rounded-3xl p-6 lg:col-span-2 animate-fade-up"
          style={{ animationDelay: '480ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold rc-display admin-text">{copy.recent}</h2>
            <Link href="/admin/reports" className="text-[11px] admin-muted hover:text-orange-400 flex items-center gap-1 transition-colors">
              {tr('Всички', 'All', 'الكل')} <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {(stats?.recentReports ?? []).slice(0, 8).map((report: any) => {
              const sc = statusCfg[report.status] ?? { label: report.status, cls: 'badge-pending' };
              return (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}/routing`}
                  className="report-row flex items-center gap-3 rounded-xl p-3 group transition-all duration-150"
                >
                  <AlertTriangle size={13} className="flex-shrink-0 text-orange-400/70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold admin-text truncate group-hover:text-orange-400 transition-colors">
                      {report.title}
                    </p>
                    <p className="text-[10px] admin-muted">
                      {report.user?.firstName} {report.user?.lastName}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SYSTEM STATUS ──────────────────────────── */}
      <div
        className="data-card rounded-3xl p-6 animate-fade-up"
        style={{ animationDelay: '560ms', animationFillMode: 'backwards' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold rc-display admin-text">{copy.system}</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {copy.systemsOn}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((svc) => {
            const Icon = svc.icon;
            const isOk = svc.status === 'ok';
            return (
              <div key={svc.label} className="system-card rounded-2xl p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOk ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                    <Icon size={15} className={isOk ? 'text-emerald-400' : 'text-amber-400'} />
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOk ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'} animate-pulse`} />
                </div>
                <p className="text-xs font-bold admin-text">{svc.label}</p>
                <p className="text-[10px] admin-muted mt-0.5">{svc.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECURITY FOOTER CARD ────────────────────── */}
      <div
        className="security-card rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up"
        style={{ animationDelay: '620ms', animationFillMode: 'backwards' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <p className="font-bold admin-text text-sm">{copy.security}</p>
            <p className="text-xs admin-muted mt-0.5">{tr('Управлявайте MFA, пасключове и достъп.', 'Manage MFA, passkeys, and access.', 'إدارة MFA ومفاتيح المرور والوصول.')}</p>
          </div>
        </div>
        <Link
          href="/admin/security"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {copy.securityBtn} <ArrowUpRight size={13} />
        </Link>
      </div>

    </div>
  );
}
