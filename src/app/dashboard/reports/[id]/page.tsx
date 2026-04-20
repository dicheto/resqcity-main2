'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { formatCategoryLabel } from '@/hooks/lib/report-format';
import { useI18n } from '@/i18n';

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

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [params.id]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/reports/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      router.push('/dashboard/reports');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/reports/${params.id}/comments`,
        { content: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComment('');
      fetchReport();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusCfg = (status: string): { label: string; style: React.CSSProperties } => {
    const map: Record<string, { label: string; style: React.CSSProperties }> = {
      PENDING:     { label: tr('В обработка', 'Pending', 'قيد المعالجة'), style: { background: 'rgba(255,167,38,0.12)', color: '#FFA726', borderColor: 'rgba(255,167,38,0.3)' } },
      IN_REVIEW:   { label: tr('Преглеждан', 'In review', 'قيد المراجعة'),   style: { background: 'rgba(99,179,237,0.12)', color: '#63B3ED', borderColor: 'rgba(99,179,237,0.3)' } },
      IN_PROGRESS: { label: tr('В процес', 'In progress', 'قيد التنفيذ'), style: { background: 'rgba(139,92,246,0.12)', color: '#A78BFA', borderColor: 'rgba(139,92,246,0.3)' } },
      RESOLVED:    { label: tr('Решен', 'Resolved', 'تم الحل'),    style: { background: 'rgba(6,214,160,0.12)',  color: '#06D6A0', borderColor: 'rgba(6,214,160,0.3)' } },
      REJECTED:    { label: tr('Отхвърлен', 'Rejected', 'مرفوض'),    style: { background: 'rgba(255,71,87,0.12)',  color: '#FF4757', borderColor: 'rgba(255,71,87,0.3)' } },
    };
    return map[status] || { label: status, style: {} };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 animate-pulse" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <p className="text-[var(--s-muted)]">{tr('Сигналът не е намерен', 'Report not found', 'الإشارة غير موجودة')}</p>
      </div>
    );
  }

  const statusCfg = getStatusCfg(report.status);

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="max-w-4xl mx-auto relative">
          <Link href="/dashboard/reports" className="inline-flex items-center gap-2 text-xs text-[var(--s-muted)] hover:text-[var(--s-text)] transition mb-5">
            {tr('← Назад към сигналите', '← Back to reports', '← عودة إلى البلاغات')}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">{tr('Детайли на сигнал', 'Report details', 'تفاصيل البلاغ')}</p>
              <h1 className="rc-display font-extrabold text-2xl md:text-3xl text-[var(--s-text)] mt-2">{report.title}</h1>
            </div>
            <span className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border" style={statusCfg.style}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Main info */}
        <div className="site-card rounded-2xl p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            {[
              { label: tr('Категория', 'Category', 'الفئة'), value: formatCategoryLabel(report.category || report.categoryId, tr('Без категория', 'No category', 'بدون فئة')) },
              { label: tr('Приоритет', 'Priority', 'الأولوية'), value: report.priority },
              { label: tr('Създаден', 'Created', 'تم الإنشاء'), value: new Date(report.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US') },
              { label: tr('Координати', 'Coordinates', 'الإحداثيات'), value: `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{label}</span>
                <p className="font-medium text-[var(--s-text)] mt-1">{value}</p>
              </div>
            ))}
          </div>
          {report.address && (
            <div className="mb-4 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{tr('Адрес', 'Address', 'العنوان')}</span>
              <p className="text-[var(--s-text)] mt-1">{report.address}</p>
            </div>
          )}
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{tr('Описание', 'Description', 'الوصف')}</span>
            <p className="text-[var(--s-muted2)] mt-2 whitespace-pre-wrap leading-relaxed">{report.description}</p>
          </div>
        </div>

        {/* Images */}
        {report.images && report.images.length > 0 && (
          <div className="site-card rounded-2xl p-6">
            <h2 className="rc-display font-bold text-lg text-[var(--s-text)] mb-4">
              {tr('Снимки', 'Images', 'الصور')} ({report.images.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.images.map((url: string, idx: number) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-[var(--s-border)] aspect-square hover:opacity-80 transition">
                  <img src={url} alt={`${tr('Снимка', 'Image', 'صورة')} ${idx + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="site-card rounded-2xl p-6">
          <h2 className="rc-display font-bold text-lg text-[var(--s-text)] mb-4">{tr('История', 'History', 'السجل')}</h2>
          <div className="space-y-3">
            {report.history.map((entry: any) => (
              <div key={entry.id} className="flex gap-4">
                <div className="w-1 rounded-full flex-shrink-0" style={{ background: 'var(--s-orange)', minHeight: '40px' }} />
                <div className="pb-3">
                  <div className="font-medium text-[var(--s-text)] text-sm">{entry.action.replace(/_/g, ' ')}</div>
                  {entry.description && (
                    <div className="text-[var(--s-muted)] text-sm mt-0.5">{entry.description}</div>
                  )}
                  <div className="text-[var(--s-muted)] text-xs mt-1">
                    {new Date(entry.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="site-card rounded-2xl p-6">
          <h2 className="rc-display font-bold text-lg text-[var(--s-text)] mb-4">
            {tr('Коментари', 'Comments', 'التعليقات')} ({report.comments.length})
          </h2>

          <form onSubmit={handleAddComment} className="mb-6 space-y-3">
            <textarea
              className="site-input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tr('Добави коментар...', 'Add comment...', 'أضف تعليقًا...')}
            />
            <button
              type="submit"
              className="btn-site-primary text-xs py-2.5 px-5 rounded-2xl disabled:opacity-40"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? tr('Публикуване...', 'Publishing...', 'جار النشر...') : tr('Публикувай', 'Publish', 'نشر')}
            </button>
          </form>

          <div className="space-y-4">
            {report.comments.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-[var(--s-border)] p-4 bg-[var(--s-surface2)]">
                <div className="flex items-center justify-between mb-2 text-xs text-[var(--s-muted)] uppercase tracking-[0.25em]">
                  <span className="font-semibold text-[var(--s-text)]">{c.user.firstName} {c.user.lastName}</span>
                  <span>{new Date(c.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>
                <p className="text-[var(--s-muted2)] text-sm leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
