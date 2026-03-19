'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { formatCategoryLabel } from '@/hooks/lib/report-format';

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'В обработка',
    IN_REVIEW: 'Преглеждан',
    IN_PROGRESS: 'В процес',
    RESOLVED: 'Решен',
    REJECTED: 'Отхвърлен',
    NEW: 'В обработка',
  };
  return labels[status] || status;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthCountdown, setHealthCountdown] = useState(3);
  const [healthFlow, setHealthFlow] = useState<'idle' | 'countdown' | 'redirected'>('idle');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (!healthModalOpen) return;

    setHealthFlow('idle');
    setHealthCountdown(3);
  }, [healthModalOpen]);

  useEffect(() => {
    if (!healthModalOpen || healthFlow !== 'countdown') return;

    const interval = setInterval(() => {
      setHealthCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleHealthStatusRedirect();
          setHealthFlow('redirected');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [healthModalOpen, healthFlow]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    PENDING:     { label: 'В обработка', cls: 'chip chip-pending' },
    IN_REVIEW:   { label: 'Преглеждан',   cls: 'chip chip-progress' },
    IN_PROGRESS: { label: 'В процес', cls: 'chip chip-progress' },
    RESOLVED:    { label: 'Решен',    cls: 'chip chip-resolved' },
    REJECTED:    { label: 'Отхвърлен',    cls: 'chip chip-rejected' },
  };

  const total    = reports.length;
  const pending  = reports.filter(r => r.status === 'PENDING').length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;

  const handleHealthStatusRedirect = () => {
    const url = 'https://portal.nra.bg/details/health-insu-status';
    const openedTab = window.open(url, '_blank', 'noopener,noreferrer');

    if (!openedTab) {
      window.location.href = url;
    }
  };

  const startHealthCheckFlow = () => {
    setHealthCountdown(3);
    setHealthFlow('countdown');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="relative overflow-hidden py-14 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 glow-orb-orange opacity-20" />
        <div className="max-w-6xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-5">
            <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-pulse shadow-[0_0_6px_var(--s-orange)]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--s-orange)]">Гражданин</span>
          </div>
          <h1 className="rc-display font-extrabold text-4xl md:text-5xl text-[var(--s-text)] leading-tight mb-3">
            Твоето <span className="grad-orange">Табло</span>
          </h1>
          <p className="text-[var(--s-muted2)] text-sm max-w-lg">Управлявай сигналите си и следи статуса им в реално време.</p>

          <div className="flex items-center gap-3 mt-7">
            <Link href="/dashboard/new-report" className="btn-site-primary text-xs py-2.5 px-5 rounded-2xl">
              + Нов сигнал
            </Link>
            <Link href="/map" className="btn-site-ghost text-xs py-2.5 px-5 rounded-2xl">
              🗺 Картата
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Сигнала',     value: total,    icon: '📋', color: '#A78BFA', rgb: '167,139,250',  accent: 'rgba(139,92,246,0.18)' },
            { label: 'В обработка', value: pending,  icon: '⏳', color: '#FBBF24', rgb: '251,191,36',   accent: 'rgba(251,191,36,0.15)' },
            { label: 'Решени',      value: resolved, icon: '✅', color: '#34D399', rgb: '52,211,153',   accent: 'rgba(6,214,160,0.15)' },
          ].map(({ label, value, icon, color, rgb, accent }) => (
            <div key={label} className="relative overflow-hidden rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-1"
              style={{ background: `linear-gradient(135deg, var(--s-surface) 60%, ${accent})`, border: `1px solid rgba(${rgb},0.2)`, boxShadow: `0 0 0 0 rgba(${rgb},0)` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px rgba(${rgb},0.18)`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 rgba(${rgb},0)`)}
            >
              {/* Glow blob */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-50"
                style={{ background: `radial-gradient(circle, rgba(${rgb},0.6), transparent)` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.25)` }}>
                    {icon}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.45em]" style={{ color }}>{label}</span>
                </div>
                <p className="rc-display font-extrabold text-5xl leading-none" style={{ color }}>{value}</p>
                <div className="mt-4 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, rgba(${rgb},0.8), rgba(${rgb},0.1))` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link href="/vehicles" className="site-card p-5 rounded-2xl block group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'rgba(139,92,246,0.15)' }}>🚗</div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-violet)] mb-1 font-semibold">Автомобили</p>
            <h3 className="font-semibold text-[var(--s-text)]">Моят автопарк</h3>
            <p className="text-[var(--s-muted)] text-xs mt-1">Регистрирани превозни средства</p>
          </Link>

          <Link href="/my-incidents/new" className="site-card p-5 rounded-2xl block group"
            style={{ borderColor: 'rgba(255,71,87,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'rgba(255,71,87,0.12)' }}>🚨</div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-red)] mb-1 font-semibold">Инцидент</p>
            <h3 className="font-semibold text-[var(--s-text)]">Подай авто сигнал</h3>
            <p className="text-[var(--s-muted)] text-xs mt-1">Блокиране, произшествие, кражба</p>
          </Link>

          <Link href="/my-incidents" className="site-card p-5 rounded-2xl block group"
            style={{ borderColor: 'rgba(6,214,160,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'rgba(6,214,160,0.12)' }}>📍</div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-teal)] mb-1 font-semibold">История</p>
            <h3 className="font-semibold text-[var(--s-text)]">Моите авто сигнали</h3>
            <p className="text-[var(--s-muted)] text-xs mt-1">Преглед на подадените</p>
          </Link>

          <Link href="/dashboard/security" className="site-card p-5 rounded-2xl block group"
            style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'rgba(139,92,246,0.15)' }}>🔐</div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-violet)] mb-1 font-semibold">Сигурност</p>
            <h3 className="font-semibold text-[var(--s-text)]">Защита на акаунта</h3>
            <p className="text-[var(--s-muted)] text-xs mt-1">MFA и Passkeys</p>
          </Link>

          <Link href="/dashboard/company-search" className="site-card p-5 rounded-2xl block group"
            style={{ borderColor: 'rgba(251,191,36,0.22)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: 'rgba(251,191,36,0.14)' }}>🏢</div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#FBBF24] mb-1 font-semibold">Справки</p>
            <h3 className="font-semibold text-[var(--s-text)]">Търсене на фирми</h3>
            <p className="text-[var(--s-muted)] text-xs mt-1">Фирми, ЕИК и свързани лица</p>
          </Link>
        </div>

        {/* Reports list */}
        <div className="site-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="rc-display font-bold text-xl text-[var(--s-text)]">Последни сигнали</h2>
            {reports.length > 0 && (
              <Link href="/dashboard/reports" className="text-xs text-[var(--s-orange)] hover:underline">
                Виж всички →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--s-surface2)', opacity: 0.6 + i * 0.1 }} />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-[var(--s-muted)]">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold text-[var(--s-muted2)]">Няма сигнали</p>
              <p className="text-sm mt-1">Подай първия си сигнал</p>
              <Link href="/dashboard/new-report" className="inline-block mt-4 btn-site-primary text-xs py-2.5 px-5 rounded-2xl">
                Нов сигнал
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const cfg = STATUS_CFG[report.status] || { label: report.status, cls: 'chip chip-pending' };
                return (
                  <Link key={report.id} href={`/dashboard/reports/${report.id}`}
                    className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-[var(--s-border)] hover:border-[var(--s-orange)]/30 hover:bg-[var(--s-surface2)] transition-all group"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--s-text)] truncate group-hover:text-[var(--s-orange)] transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-[var(--s-muted)] text-xs mt-1 line-clamp-1">{report.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--s-muted)] mt-2 uppercase tracking-[0.3em]">
                        <span>{formatCategoryLabel(report.category || report.categoryId, 'Без категория')}</span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString('bg-BG')}</span>
                      </div>
                    </div>
                    <span className={cfg.cls} style={{ flexShrink: 0 }}>{cfg.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {moreMenuOpen && (
            <div
              className="absolute right-full mr-3 bottom-0 w-72 site-card rounded-2xl p-2 shadow-2xl"
              style={{ borderColor: 'var(--s-border)' }}
            >
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setHealthModalOpen(true);
                }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--s-surface2)] transition-colors"
              >
                <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--s-muted)] mb-1">Справка</p>
                <p className="font-semibold text-[var(--s-text)]">Здравноосигурителен статус</p>
                <p className="text-xs text-[var(--s-muted)] mt-1">Проверка през НАП</p>
              </button>
            </div>
          )}

          <button
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className="btn-site-primary px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          >
            Още
          </button>
        </div>
      </div>

      {healthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3, 7, 18, 0.68)' }}
          onClick={() => setHealthModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-3xl overflow-hidden border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--s-border)]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)]">Проверка</p>
                <h3 className="rc-display text-xl text-[var(--s-text)] font-bold">Здравноосигурителен статус</h3>
              </div>
              <button
                onClick={() => setHealthModalOpen(false)}
                className="btn-site-ghost text-xs px-4 py-2 rounded-xl"
              >
                Затвори
              </button>
            </div>

            <div className="p-6 space-y-4">
              {healthFlow === 'countdown' ? (
                <div className="rounded-2xl p-5 border" style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)' }}>
                  <p className="font-semibold text-[var(--s-text)]">Бивате пренасочени към НАП</p>
                  <p className="text-sm text-[var(--s-muted)] mt-1">Изчакайте {healthCountdown} сек...</p>
                </div>
              ) : healthFlow === 'redirected' ? (
                <div className="rounded-2xl p-5 border" style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.08)' }}>
                  <p className="font-semibold text-[var(--s-text)]">Вие бяхте пренасочени</p>
                  <p className="text-sm text-[var(--s-muted)] mt-1">След като приключите в НАП, потвърдете и продължете работа в ResQCity.</p>
                </div>
              ) : (
                <div className="rounded-2xl p-5 border" style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.08)' }}>
                  <p className="font-semibold text-[var(--s-text)]">Защитен достъп</p>
                  <p className="text-sm text-[var(--s-muted)] mt-1">Натиснете „Проверка" и след 3 секунди ще бъдете пренасочени към системата на НАП в нов таб.</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                {healthFlow === 'idle' && (
                  <button
                    onClick={startHealthCheckFlow}
                    className="btn-site-primary text-sm px-5 py-2.5 rounded-xl"
                  >
                    Проверка
                  </button>
                )}

                {healthFlow === 'countdown' && (
                  <button
                    disabled
                    className="btn-site-primary text-sm px-5 py-2.5 rounded-xl opacity-60 cursor-not-allowed"
                  >
                    Пренасочване...
                  </button>
                )}

                {healthFlow === 'redirected' && (
                  <>
                    <button
                      onClick={() => setHealthModalOpen(false)}
                      className="btn-site-primary text-sm px-5 py-2.5 rounded-xl"
                    >
                      Свършено в НАП - Продължи
                    </button>
                    <button
                      onClick={handleHealthStatusRedirect}
                      className="btn-site-ghost text-sm px-5 py-2.5 rounded-xl"
                    >
                      Отвори НАП отново
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden border border-[var(--s-border)] bg-[var(--s-bg)] min-h-[220px]">
                <div className="h-[220px] flex items-center justify-center text-center px-6">
                  <div>
                    <p className="text-sm text-[var(--s-muted)]">Порталът на НАП е защитен и не позволява вграждане в iframe от външен сайт.</p>
                    <p className="text-sm text-[var(--s-muted)] mt-2">Използвайте „Проверка", за да се отвори директно в НАП.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
