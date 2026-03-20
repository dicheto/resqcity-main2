'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend,
} from 'recharts';
import {
  RefreshCw, TrendingUp, CheckCircle2, Clock, AlertCircle,
  XCircle, ArrowLeft, BarChart2, MapPin, Activity,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface StatsData {
  total: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  byStatus: { status: string; label: string; count: number }[];
  byCategory: { name: string; icon: string; count: number }[];
  byDistrict: { district: string; count: number }[];
  recentReports: {
    id: string; title: string; status: string; statusLabel: string;
    district: string | null; address: string | null;
    category: string | null; categoryIcon: string; createdAt: string;
  }[];
  dailyTrend: { date: string; count: number }[];
  generatedAt: string;
}

/* ─── Colour palette ─────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  PENDING:     '#FF6B2B',
  IN_REVIEW:   '#9F78FF',
  IN_PROGRESS: '#FFA726',
  RESOLVED:    '#06D6A0',
  REJECTED:    '#ef4444',
};
const CHART_PALETTE = ['#FF6B2B','#9F78FF','#06D6A0','#FFA726','#38bdf8','#fb7185','#a3e635','#f472b6'];

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('bg-BG', { day: '2-digit', month: 'short' });
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `преди ${diff} сек.`;
  if (diff < 3600)  return `преди ${Math.floor(diff / 60)} мин.`;
  if (diff < 86400) return `преди ${Math.floor(diff / 3600)} ч.`;
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:     <AlertCircle size={14} />,
  IN_REVIEW:   <Clock        size={14} />,
  IN_PROGRESS: <Activity     size={14} />,
  RESOLVED:    <CheckCircle2 size={14} />,
  REJECTED:    <XCircle      size={14} />,
};

/* ─── Custom tooltip for recharts ────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface)] shadow-xl text-xs">
      {label && <p className="text-[var(--s-muted)] mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-bold">{p.value} сигнала</p>
      ))}
    </div>
  );
}

/* ─── District heatmap cell ──────────────────────────────── */
function DistrictCell({ district, count, max }: { district: string; count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0;
  const bg = `rgba(255, 107, 43, ${0.08 + intensity * 0.55})`;
  const border = `rgba(255, 107, 43, ${0.15 + intensity * 0.5})`;
  return (
    <div
      className="flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-300 hover:scale-105 cursor-default"
      style={{ background: bg, borderColor: border }}
    >
      <MapPin size={12} style={{ color: `rgba(255,107,43,${0.5 + intensity * 0.5})` }} className="mb-1" />
      <p className="text-[10px] font-semibold text-[var(--s-text)] leading-tight">{district}</p>
      <p className="text-lg font-extrabold rc-display" style={{ color: `rgba(255,107,43,${0.6 + intensity * 0.4})` }}>{count}</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function StatisticsPage() {
  const [data, setData]         = useState<StatsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [countdown, setCountdown] = useState(120);
  const REFRESH_SEC = 120;

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('fetch failed');
      setData(await res.json());
      setCountdown(REFRESH_SEC);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    let refreshId: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = (ms: number) => {
      if (refreshId) clearTimeout(refreshId);
      refreshId = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await fetchData();
        }
        const jitterMs = Math.floor(Math.random() * 4000);
        scheduleRefresh(REFRESH_SEC * 1000 + jitterMs);
      }, ms);
    };

    scheduleRefresh(REFRESH_SEC * 1000);

    const tickId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setCountdown((c) => (c > 0 ? c - 1 : REFRESH_SEC));
      }
    }, 1000);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
        scheduleRefresh(REFRESH_SEC * 1000);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (refreshId) clearTimeout(refreshId);
      clearInterval(tickId);
    };
  }, [fetchData]);

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--s-orange)] border-t-transparent animate-spin" />
        <p className="text-[var(--s-muted)] text-sm">Зареждане на статистики…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
      <div className="text-center">
        <p className="text-[var(--s-muted)] mb-4">Грешка при зареждане на данните.</p>
        <button onClick={fetchData} className="btn-site-primary text-xs px-6 py-3">Опитай отново</button>
      </div>
    </div>
  );

  const maxDistrict = Math.max(...(data.byDistrict.map((d) => d.count)), 1);
  const resolved    = data.byStatus.find((s) => s.status === 'RESOLVED')?.count  ?? 0;
  const pending     = data.byStatus.find((s) => s.status === 'PENDING')?.count   ?? 0;
  const inProgress  = data.byStatus.find((s) => s.status === 'IN_PROGRESS')?.count ?? 0;
  const successRate = data.total > 0 ? Math.round((resolved / data.total) * 100) : 0;

  const trendData = data.dailyTrend.map((d) => ({
    ...d,
    label: fmtDate(d.date),
  }));

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>

      {/* ── Header bar ── */}
      <div className="sticky top-20 z-30 border-b border-[var(--s-border)] backdrop-blur-xl" style={{ background: 'var(--s-nav-top-bg)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-[var(--s-muted)] hover:text-[var(--s-text)] transition-colors text-xs">
              <ArrowLeft size={14} /> Начало
            </Link>
            <span className="text-[var(--s-border)]">/</span>
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[var(--s-orange)]" />
              <span className="font-bold text-[var(--s-text)] text-sm">Статистики</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:block text-xs text-[var(--s-muted)]">
              Последна актуализация:{' '}
              <span className="font-bold text-[var(--s-text)] tabular-nums">
                {new Date(data.generatedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--s-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--s-teal)] animate-pulse" />
              Автообновяване след <span className="font-bold text-[var(--s-text)] tabular-nums">{countdown}s</span>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-[var(--s-text)] hover:text-[var(--s-orange)] transition-colors border border-[var(--s-border)] px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--s-surface)' }}
            >
              <RefreshCw size={12} /> Обнови
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* ── Page title ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.55em] text-[var(--s-orange)] mb-2">Реални данни</p>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)]">
            Статистики на <span className="grad-orange">сигналите</span>
          </h1>
          <p className="text-[var(--s-muted)] text-sm mt-2 lg:hidden">
            Актуализирано: {new Date(data.generatedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Общо сигнали',    value: data.total,            color: 'var(--s-orange)',  icon: <BarChart2    size={18} /> },
            { label: 'Решени',           value: resolved,              color: 'var(--s-teal)',    icon: <CheckCircle2 size={18} /> },
            { label: 'Нови / Чакащи',   value: pending,               color: '#FFA726',          icon: <AlertCircle  size={18} /> },
            { label: 'В процес',         value: inProgress,            color: 'var(--s-violet)',  icon: <Activity     size={18} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="site-card p-6 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div>
                <p className="text-2xl font-extrabold rc-display" style={{ color }}>{value.toLocaleString('bg-BG')}</p>
                <p className="text-xs text-[var(--s-muted)] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Secondary KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="site-card p-5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)] mb-1">Решени днес</p>
            <p className="text-3xl font-extrabold rc-display grad-orange">{data.resolvedToday}</p>
          </div>
          <div className="site-card p-5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)] mb-1">Решени тази седмица</p>
            <p className="text-3xl font-extrabold rc-display grad-orange">{data.resolvedThisWeek}</p>
          </div>
          <div className="site-card p-5 rounded-2xl col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)] mb-1">Успеваемост</p>
            <p className="text-3xl font-extrabold rc-display grad-orange">{successRate}%</p>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--s-border)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${successRate}%`, background: 'var(--s-teal)' }} />
            </div>
          </div>
        </div>

        {/* ── Trend + Status donut ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Trend (spans 2 cols) */}
          <div className="site-card p-6 rounded-2xl lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-[var(--s-orange)]" />
              <h2 className="font-bold text-[var(--s-text)]">Сигнали последните 30 дни</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6B2B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--s-muted)', fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: 'var(--s-muted)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#FF6B2B" strokeWidth={2} fill="url(#gradOrange)" dot={false} activeDot={{ r: 4, fill: '#FF6B2B' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status donut */}
          <div className="site-card p-6 rounded-2xl">
            <h2 className="font-bold text-[var(--s-text)] mb-5">Разпределение по статус</h2>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} stroke="none">
                  {data.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#555'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any, name: any) => [`${val} бр.`, name]} contentStyle={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {data.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status] ?? '#555' }} />
                    <span className="text-[var(--s-muted2)]">{s.label}</span>
                  </div>
                  <span className="font-bold text-[var(--s-text)]">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── By category bar chart ── */}
        {data.byCategory.length > 0 && (
          <div className="site-card p-6 rounded-2xl">
            <h2 className="font-bold text-[var(--s-text)] mb-6">Сигнали по категория</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory} margin={{ top: 5, right: 5, bottom: 30, left: -20 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--s-muted)', fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: 'var(--s-muted)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── District heatmap ── */}
        {data.byDistrict.length > 0 && (
          <div className="site-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <MapPin size={16} className="text-[var(--s-orange)]" />
              <h2 className="font-bold text-[var(--s-text)]">Топлинна карта по район</h2>
              <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--s-muted)]">
                <span className="w-3 h-3 rounded bg-[rgba(255,107,43,0.12)] border border-[rgba(255,107,43,0.2)]" />по-малко
                <span className="w-3 h-3 rounded bg-[rgba(255,107,43,0.65)] border border-[rgba(255,107,43,0.8)]" />повече
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {data.byDistrict.map((d) => (
                <DistrictCell key={d.district} district={d.district} count={d.count} max={maxDistrict} />
              ))}
            </div>
          </div>
        )}

        {/* ── Recent reports feed ── */}
        <div className="site-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--s-border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-pulse" />
            <h2 className="font-bold text-[var(--s-text)]">Последни сигнали</h2>
          </div>
          <div className="divide-y divide-[var(--s-border)]">
            {data.recentReports.slice(0, 12).map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--s-surface)] transition-colors">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${STATUS_COLORS[r.status] ?? '#555'}18`, color: STATUS_COLORS[r.status] ?? '#555' }}
                >
                  {STATUS_ICON[r.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--s-text)] truncate">{r.title}</p>
                  <p className="text-xs text-[var(--s-muted)] truncate">
                    {r.categoryIcon} {r.category ?? '—'}{r.district ? ` · ${r.district}` : ''}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${STATUS_COLORS[r.status] ?? '#555'}18`, color: STATUS_COLORS[r.status] ?? '#555' }}
                  >
                    {r.statusLabel}
                  </span>
                  <p className="text-[10px] text-[var(--s-muted)] mt-1">{timeAgo(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom refresh note ── */}
        <p className="text-center text-xs text-[var(--s-muted)] pb-8">
          Страницата се самоактуализира автоматично на всеки {REFRESH_SEC} секунди.
        </p>
      </div>
    </div>
  );
}
