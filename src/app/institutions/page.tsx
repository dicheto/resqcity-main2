'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useI18n } from '@/i18n';

interface ReportItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  category?: { nameBg?: string | null };
  district?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'В обработка',
  IN_REVIEW: 'Преглеждан',
  IN_PROGRESS: 'В процес',
  RESOLVED: 'Решен',
  REJECTED: 'Отхвърлен',
};

export default function InstitutionPortalPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const copy = {
    title: locale === 'bg' ? 'Сигнали към вашата институция' : locale === 'en' ? 'Reports for your institution' : 'البلاغات المرسلة إلى مؤسستكم',
    refresh: locale === 'bg' ? 'Обнови' : locale === 'en' ? 'Refresh' : 'تحديث',
    logout: locale === 'bg' ? 'Изход' : locale === 'en' ? 'Logout' : 'تسجيل الخروج',
    loading: locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...',
    empty: locale === 'bg' ? 'Няма сигнали към вашата институция.' : locale === 'en' ? 'No reports for your institution.' : 'لا توجد بلاغات لمؤسستكم.',
    uncategorized: locale === 'bg' ? 'Без категория' : locale === 'en' ? 'Uncategorized' : 'بدون فئة',
  };
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = async () => {
    try {
      const meResponse = await axios.get('/api/auth/me', { headers: getAuthHeaders() });
      const role = meResponse.data?.user?.role;

      if (role !== 'INSTITUTION') {
        router.replace('/institutions/auth/login');
        return;
      }

      const response = await axios.get('/api/reports?limit=100', { headers: getAuthHeaders() });
      setReports(response.data?.reports || []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неуспешно зареждане на сигналите.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/institutions/auth/login');
  };

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--s-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-teal)]">Institution Portal</p>
            <h1 className="rc-display text-3xl font-bold text-[var(--s-text)] mt-2">{copy.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-site-ghost text-sm px-4 py-2 rounded-xl">{copy.refresh}</button>
            <button onClick={logout} className="btn-site-primary text-sm px-4 py-2 rounded-xl">{copy.logout}</button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="rounded-3xl site-card-glass p-8 text-[var(--s-muted)]">{copy.loading}</div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl site-card-glass p-8 text-[var(--s-muted)]">{copy.empty}</div>
        ) : (
          <div className="grid gap-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/institutions/reports/${report.id}`}
                className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface)] px-5 py-4 hover:border-[var(--s-orange)]/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--s-text)]">{report.title}</p>
                    <p className="text-xs text-[var(--s-muted)] mt-1">
                      {report.category?.nameBg || copy.uncategorized}{report.district ? ` • ${report.district}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--s-teal)] uppercase tracking-wider font-semibold">{STATUS_LABELS[report.status] || report.status}</p>
                    <p className="text-xs text-[var(--s-muted)] mt-1">{new Date(report.updatedAt).toLocaleString('bg-BG')}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
