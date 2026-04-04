'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  MapPin, FileText, ShieldCheck, Activity,
  ArrowRight, CheckCircle, ChevronRight, Smartphone, Users, BarChart2,
} from 'lucide-react';

interface RecentReport {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  district: string | null;
  address: string | null;
  category: string | null;
  categoryIcon: string;
  createdAt: string;
}
interface StatsData {
  total: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  byStatus: { status: string; label: string; count: number }[];
  recentReports: RecentReport[];
}
function statusColor(s: string) {
  switch (s) {
    case 'RESOLVED':    return 'var(--s-teal)';
    case 'IN_PROGRESS': return '#FFA726';
    case 'IN_REVIEW':   return 'var(--s-violet)';
    case 'REJECTED':    return '#ef4444';
    default:            return 'var(--s-orange)';
  }
}
function statusIcon(s: string) {
  switch (s) {
    case 'RESOLVED':    return '✅';
    case 'IN_PROGRESS': return '🏗️';
    case 'IN_REVIEW':   return '🔍';
    case 'REJECTED':    return '❌';
    default:            return '🚨';
  }
}

const FEATURES = [
  { icon: MapPin,     grad: 'from-orange-500 to-rose-500',   glow: 'rgba(255,107,43,0.28)', badge: 'LIVE',   title: 'Интерактивна карта',  desc: 'Виж всички активни сигнали в реално време на интерактивна карта. Филтрирай по район и категория.', href: '/map' },
  { icon: FileText,   grad: 'from-violet-500 to-indigo-600', glow: 'rgba(139,92,246,0.28)', badge: '60 СЕК', title: 'Подай сигнал',         desc: 'Снимка, локация, описание — и готово. Системата автоматично насочва сигнала към правилния орган.', href: '/dashboard/new-report' },
  { icon: Activity,   grad: 'from-teal-500 to-cyan-500',     glow: 'rgba(6,214,160,0.28)',  badge: 'АВТО',   title: 'Следи статуса',        desc: 'Следи как сигналът ти се обработва — до пълното му решаване. Push известия включени.', href: '/dashboard' },
  { icon: ShieldCheck, grad: 'from-emerald-500 to-teal-500',  glow: 'rgba(16,185,129,0.28)', badge: 'БЕЗП',   title: 'Сигурност и поверителност', desc: 'Всички данни са криптирани и защитени. Анонимни сигнали позволени.', href: '/gdpr-policy' },
];

const STATS = [
  { icon: FileText,   label: 'Общо сигнали', value: '2,847' },
  { icon: CheckCircle, label: 'Разрешени',   value: '1,923' },
  { icon: Activity,   label: 'В процес',     value: '456' },
  { icon: Users,      label: 'Активни потребители', value: '12,543' },
];

export default function HomePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Управлявай града си заедно
            </h1>
            <p className="mt-6 text-lg leading-8 text-orange-100">
              ResQCity е платформа за докладване и управление на градски проблеми.
              Докладвайте проблеми, следете статуса и вижте как градът се подобрява.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard/new-report"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
              >
                Подай сигнал
              </Link>
              <Link
                href="/map"
                className="text-sm font-semibold leading-6 text-white hover:text-orange-100 transition-colors"
              >
                Виж картата <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Как работи ResQCity?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Проста и ефективна система за подобряване на живота в града.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${feature.grad} shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                      <div className="absolute -inset-1 rounded-lg opacity-25 blur" style={{ background: feature.glow }} />
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gradient-to-r ${feature.grad} text-white`}>
                      {feature.badge}
                    </span>
                    {feature.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                    <p className="flex-auto">{feature.desc}</p>
                    <p className="mt-6">
                      <Link
                        href={feature.href}
                        className="text-sm font-semibold leading-6 text-orange-600 hover:text-orange-500 transition-colors"
                      >
                        Научи повече <ArrowRight className="ml-1 inline h-4 w-4" />
                      </Link>
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-slate-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Статистика в реално време
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Виж как градът се подобрява благодарение на активните граждани.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                STATS.map((stat, index) => (
                  <div key={index} className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      {stat.label}
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      {stat.value}
                    </dd>
                  </div>
                ))
              ) : stats ? (
                <>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      Общо сигнали
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      {stats.total}
                    </dd>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      Разрешени днес
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      {stats.resolvedToday}
                    </dd>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 shadow-lg">
                      <Activity className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      Разрешени тази седмица
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      {stats.resolvedThisWeek}
                    </dd>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      Активни потребители
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      12,543
                    </dd>
                  </div>
                </>
              ) : (
                STATS.map((stat, index) => (
                  <div key={index} className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                    <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      {stat.label}
                    </dt>
                    <dd className="mt-2 text-3xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                      {stat.value}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Recent Reports Section */}
      {stats?.recentReports && stats.recentReports.length > 0 && (
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Последни сигнали
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                Виж най-новите проблеми, докладвани от гражданите.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recentReports.slice(0, 6).map((report) => (
                  <div key={report.id} className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{report.categoryIcon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {report.category}
                        </span>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                        style={{ backgroundColor: statusColor(report.status) + '20', color: statusColor(report.status) }}
                      >
                        {statusIcon(report.status)} {report.statusLabel}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {report.district && `${report.district}, `}{report.address}
                    </p>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(report.createdAt).toLocaleDateString('bg-BG')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Готов си да помогнеш на града?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-orange-100">
              Присъедини се към хилядите граждани, които вече използват ResQCity за подобряване на живота в града.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/register"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
              >
                Регистрирай се
              </Link>
              <Link
                href="/map"
                className="text-sm font-semibold leading-6 text-white hover:text-orange-100 transition-colors"
              >
                Разгледай картата <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}