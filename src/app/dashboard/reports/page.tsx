'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
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

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '' });

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);

      const response = await axios.get(`/api/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCfg = (status: string) => {
    const map: Record<string, { label: string; style: React.CSSProperties }> = {
      PENDING:     { label: 'В обработка', style: { background: 'rgba(255,167,38,0.12)', color: '#FFA726', borderColor: 'rgba(255,167,38,0.25)' } },
      IN_REVIEW:   { label: 'Преглеждан',   style: { background: 'rgba(99,179,237,0.12)', color: '#63B3ED', borderColor: 'rgba(99,179,237,0.25)' } },
      IN_PROGRESS: { label: 'В процес', style: { background: 'rgba(139,92,246,0.12)', color: '#A78BFA', borderColor: 'rgba(139,92,246,0.25)' } },
      RESOLVED:    { label: 'Решен',    style: { background: 'rgba(6,214,160,0.12)',  color: '#06D6A0', borderColor: 'rgba(6,214,160,0.25)' } },
      REJECTED:    { label: 'Отхвърлен',    style: { background: 'rgba(255,71,87,0.12)',  color: '#FF4757', borderColor: 'rgba(255,71,87,0.25)' } },
    };
    return map[status] || { label: status, style: {} };
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      {/* Header */}
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="max-w-6xl mx-auto relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">Сигнали</p>
            <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)] mt-2">Моите сигнали</h1>
          </div>
          <Link href="/dashboard/new-report" className="btn-site-primary text-xs py-2.5 px-5 rounded-2xl self-start md:self-auto">
            + Нов сигнал
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="site-card rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              className="site-input flex-1"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">Всички статуси</option>
              <option value="PENDING">В обработка</option>
              <option value="IN_REVIEW">Преглеждан</option>
              <option value="IN_PROGRESS">В процес</option>
              <option value="RESOLVED">Решен</option>
              <option value="REJECTED">Отхвърлен</option>
            </select>
            <select
              className="site-input flex-1"
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            >
              <option value="">Всички категории</option>
              <option value="POTHOLE">Дупки по пътя</option>
              <option value="STREET_LIGHT">Улично осветление</option>
              <option value="GARBAGE">Отпадъци</option>
              <option value="GRAFFITI">Графити</option>
              <option value="TRAFFIC_SIGNAL">Светофар</option>
              <option value="WATER_LEAK">Теч на вода</option>
              <option value="PARK_MAINTENANCE">Поддръжка на парк</option>
              <option value="NOISE_COMPLAINT">Шум</option>
              <option value="ILLEGAL_PARKING">Незаконно паркиране</option>
              <option value="OTHER">Друго</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 rounded-2xl site-card animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="site-card rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-[var(--s-muted2)]">Няма открити сигнали</p>
            <p className="text-sm text-[var(--s-muted)] mt-1">Смени филтрите или подай нов сигнал</p>
            <Link href="/dashboard/new-report" className="inline-block mt-5 btn-site-primary text-xs py-2.5 px-5 rounded-2xl">
              + Нов сигнал
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const cfg = getStatusCfg(report.status);
              return (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="block site-card rounded-2xl p-5 hover:border-[var(--s-orange)]/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg text-[var(--s-text)] group-hover:text-[var(--s-orange)] transition-colors truncate">{report.title}</h3>
                      <p className="text-[var(--s-muted)] text-sm mt-1 line-clamp-2">{report.description}</p>
                    </div>
                    <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={cfg.style}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--s-muted)] uppercase tracking-[0.25em]">
                    <span className="font-medium">{formatCategoryLabel(report.category || report.categoryId, 'Без категория')}</span>
                    <span>•</span>
                    <span>{report.priority}</span>
                    <span>•</span>
                    <span>{new Date(report.createdAt).toLocaleDateString('bg-BG')}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
