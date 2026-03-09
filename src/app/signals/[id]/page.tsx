'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

interface PublicSignalDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  district?: string | null;
  createdAt: string;
  category?: {
    key?: string | null;
    name?: string | null;
    nameBg?: string | null;
    nameEn?: string | null;
  } | null;
}

export default function PublicSignalDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<PublicSignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!params?.id) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports/public/${params.id}`);

        if (!response.ok) {
          throw new Error('Сигналът не е намерен или не е публичен.');
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Възникна грешка при зареждане.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 animate-pulse mx-auto" />
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--s-bg)' }}>
        <div className="max-w-md w-full rounded-2xl p-6 text-center" style={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)' }}>
          <p className="text-[var(--s-text)] font-semibold">{error || 'Сигналът не е намерен.'}</p>
          <Link
            href="/map"
            className="inline-flex items-center justify-center mt-4 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.25em]"
            style={{ background: 'var(--s-orange)', color: '#fff' }}
          >
            Назад към картата
          </Link>
        </div>
      </div>
    );
  }

  const statusBgMap: Record<string, string> = {
    PENDING: 'rgba(255,167,38,0.2)',
    IN_REVIEW: 'rgba(99,179,237,0.2)',
    IN_PROGRESS: 'rgba(129,140,248,0.2)',
    RESOLVED: 'rgba(6,214,160,0.2)',
    REJECTED: 'rgba(255,71,87,0.2)',
  };

  const statusColorMap: Record<string, string> = {
    PENDING: '#FFB86C',
    IN_REVIEW: '#78D9FF',
    IN_PROGRESS: '#A8AEFF',
    RESOLVED: '#20E0AC',
    REJECTED: '#FF8A94',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/map" className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)] hover:text-[var(--s-text)] transition">
          ← Обратно към картата
        </Link>

        <div className="mt-4 rounded-3xl p-6 md:p-8" style={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)' }}>
          <div className="flex items-start gap-4 flex-wrap justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-muted)]">Публичен сигнал</p>
              <h1 className="rc-display text-2xl md:text-4xl font-extrabold text-[var(--s-text)] mt-2">{report.title}</h1>
            </div>
            <span
              className="px-3 py-1.5 rounded-full border text-xs font-bold"
              style={{
                background: statusBgMap[report.status] || 'rgba(255,255,255,0.08)',
                color: statusColorMap[report.status] || 'var(--s-muted2)',
                borderColor: statusColorMap[report.status] || 'var(--s-border)',
              }}
            >
              {getStatusLabel(report.status)}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-6 text-sm">
            <div className="rounded-xl p-3" style={{ background: 'var(--s-surface2)' }}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--s-muted)]">Категория</p>
              <p className="text-[var(--s-text)] font-semibold mt-1">{formatCategoryLabel(report.category || null, 'Без категория')}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--s-surface2)' }}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--s-muted)]">Дата</p>
              <p className="text-[var(--s-text)] font-semibold mt-1">{new Date(report.createdAt).toLocaleString('bg-BG')}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--s-surface2)' }}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--s-muted)]">Локация</p>
              <p className="text-[var(--s-text)] font-semibold mt-1">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--s-surface2)' }}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--s-muted)]">Адрес</p>
              <p className="text-[var(--s-text)] font-semibold mt-1">{report.address || 'Няма посочен адрес'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl p-4" style={{ background: 'var(--s-surface2)' }}>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--s-muted)]">Описание</p>
            <p className="text-[var(--s-muted2)] mt-2 whitespace-pre-wrap leading-relaxed">{report.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
