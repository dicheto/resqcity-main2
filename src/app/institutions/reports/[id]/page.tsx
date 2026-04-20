'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useI18n } from '@/i18n';

export default function InstitutionReportDetailPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [opinionNote, setOpinionNote] = useState('');
  const [opinionFile, setOpinionFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const statusOptions = [
    { value: 'PENDING', label: tr('В обработка', 'Pending', 'قيد المعالجة') },
    { value: 'IN_REVIEW', label: tr('Преглеждан', 'In review', 'قيد المراجعة') },
    { value: 'IN_PROGRESS', label: tr('В процес', 'In progress', 'قيد التنفيذ') },
    { value: 'RESOLVED', label: tr('Решен', 'Resolved', 'تم الحل') },
    { value: 'REJECTED', label: tr('Отхвърлен', 'Rejected', 'مرفوض') },
  ];

  const getAuthHeaders = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchReport = async () => {
    try {
      const meResponse = await axios.get('/api/auth/me', { headers: getAuthHeaders() });
      if (meResponse.data?.user?.role !== 'INSTITUTION') {
        router.replace('/institutions/auth/login');
        return;
      }

      const response = await axios.get(`/api/reports/${params.id}`, { headers: getAuthHeaders() });
      setReport(response.data);
      setStatus(response.data.status);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || tr('Неуспешно зареждане на сигнала.', 'Failed to load report.', 'فشل تحميل البلاغ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!params?.id) {
      return;
    }

    fetchReport();
  }, [params?.id]);

  const updateStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError('');
    setOk('');

    try {
      await axios.patch(
        `/api/reports/${params.id}`,
        { status, note },
        { headers: getAuthHeaders() }
      );
      setOk(tr('Статусът е обновен.', 'Status updated.', 'تم تحديث الحالة.'));
      setNote('');
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || tr('Неуспешна промяна на статус.', 'Failed to change status.', 'فشل تغيير الحالة.'));
    } finally {
      setWorking(false);
    }
  };

  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) {
      return;
    }

    setWorking(true);
    setError('');
    setOk('');

    try {
      await axios.post(
        `/api/reports/${params.id}/comments`,
        { content: comment },
        { headers: getAuthHeaders() }
      );
      setComment('');
      setOk(tr('Коментарът е добавен.', 'Comment added.', 'تمت إضافة التعليق.'));
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || tr('Неуспешно добавяне на коментар.', 'Failed to add comment.', 'فشل إضافة التعليق.'));
    } finally {
      setWorking(false);
    }
  };

  const uploadOpinion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opinionFile) {
      setError(tr('Изберете файл за становището.', 'Select an opinion file.', 'اختر ملف الرأي.'));
      return;
    }

    setWorking(true);
    setError('');
    setOk('');

    try {
      const formData = new FormData();
      formData.append('file', opinionFile);
      formData.append('note', opinionNote);

      await axios.post(`/api/institutions/reports/${params.id}/opinion`, formData, {
        headers: getAuthHeaders(),
      });

      setOpinionFile(null);
      setOpinionNote('');
      setOk(tr('Становището е качено.', 'Opinion uploaded.', 'تم رفع الرأي.'));
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || tr('Неуспешно качване на становище.', 'Failed to upload opinion.', 'فشل رفع الرأي.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)', color: 'var(--s-muted)' }}>{tr('Зареждане...', 'Loading...', 'جار التحميل...')}</div>;
  }

  if (!report) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)', color: 'var(--s-muted)' }}>{tr('Сигналът не е намерен.', 'Report not found.', 'البلاغ غير موجود.')}</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--s-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <Link href="/institutions" className="text-sm text-[var(--s-muted)] hover:text-[var(--s-text)]">{tr('← Назад към списъка', '← Back to list', '← العودة إلى القائمة')}</Link>

        <div className="mt-4 rounded-3xl border border-[var(--s-border)] bg-[var(--s-surface)] p-6">
          <h1 className="rc-display text-2xl font-bold text-[var(--s-text)]">{report.title}</h1>
          <p className="text-sm text-[var(--s-muted)] mt-2">{report.description}</p>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <form onSubmit={updateStatus} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{tr('Промяна на статус', 'Change status', 'تغيير الحالة')}</p>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="site-input">
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <textarea className="site-input" rows={3} placeholder={tr('Бележка към промяната', 'Note for the change', 'ملاحظة للتغيير')} value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">
                {tr('Запази статус', 'Save status', 'حفظ الحالة')}
              </button>
            </form>

            <form onSubmit={uploadOpinion} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{tr('Становище (документ)', 'Opinion (document)', 'الرأي (مستند)')}</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setOpinionFile(e.target.files?.[0] || null)}
                className="site-input"
              />
              <textarea className="site-input" rows={2} placeholder={tr('Кратка бележка', 'Short note', 'ملاحظة قصيرة')} value={opinionNote} onChange={(e) => setOpinionNote(e.target.value)} />
              <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">
                {tr('Качи становище', 'Upload opinion', 'رفع الرأي')}
              </button>
            </form>
          </div>

          <form onSubmit={addComment} className="mt-6 rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">{tr('Коментар', 'Comment', 'تعليق')}</p>
            <textarea className="site-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tr('Добавете коментар...', 'Add a comment...', 'أضف تعليقًا...')} />
            <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">{tr('Публикувай', 'Publish', 'نشر')}</button>
          </form>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          {ok && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{ok}</div>}

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)] mb-3">{tr('Коментари', 'Comments', 'التعليقات')}</p>
            <div className="space-y-2">
              {(report.comments || []).map((item: any) => (
                <div key={item.id} className="rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)] px-4 py-3">
                  <p className="text-[var(--s-text)] text-sm whitespace-pre-wrap">{item.content}</p>
                  <p className="text-xs text-[var(--s-muted)] mt-2">{new Date(item.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
