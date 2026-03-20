'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'В обработка' },
  { value: 'IN_REVIEW', label: 'Преглеждан' },
  { value: 'IN_PROGRESS', label: 'В процес' },
  { value: 'RESOLVED', label: 'Решен' },
  { value: 'REJECTED', label: 'Отхвърлен' },
];

export default function InstitutionReportDetailPage() {
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
      setError(err?.response?.data?.error || 'Неуспешно зареждане на сигнала.');
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
      setOk('Статусът е обновен.');
      setNote('');
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неуспешна промяна на статус.');
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
      setOk('Коментарът е добавен.');
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неуспешно добавяне на коментар.');
    } finally {
      setWorking(false);
    }
  };

  const uploadOpinion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opinionFile) {
      setError('Изберете файл за становището.');
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
      setOk('Становището е качено.');
      await fetchReport();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неуспешно качване на становище.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)', color: 'var(--s-muted)' }}>Зареждане...</div>;
  }

  if (!report) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)', color: 'var(--s-muted)' }}>Сигналът не е намерен.</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--s-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <Link href="/institutions" className="text-sm text-[var(--s-muted)] hover:text-[var(--s-text)]">← Назад към списъка</Link>

        <div className="mt-4 rounded-3xl border border-[var(--s-border)] bg-[var(--s-surface)] p-6">
          <h1 className="rc-display text-2xl font-bold text-[var(--s-text)]">{report.title}</h1>
          <p className="text-sm text-[var(--s-muted)] mt-2">{report.description}</p>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <form onSubmit={updateStatus} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">Промяна на статус</p>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="site-input">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <textarea className="site-input" rows={3} placeholder="Бележка към промяната" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">
                Запази статус
              </button>
            </form>

            <form onSubmit={uploadOpinion} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">Становище (документ)</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setOpinionFile(e.target.files?.[0] || null)}
                className="site-input"
              />
              <textarea className="site-input" rows={2} placeholder="Кратка бележка" value={opinionNote} onChange={(e) => setOpinionNote(e.target.value)} />
              <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">
                Качи становище
              </button>
            </form>
          </div>

          <form onSubmit={addComment} className="mt-6 rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)]">Коментар</p>
            <textarea className="site-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавете коментар..." />
            <button type="submit" disabled={working} className="btn-site-primary text-sm px-4 py-2 rounded-xl">Публикувай</button>
          </form>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          {ok && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{ok}</div>}

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--s-muted)] mb-3">Коментари</p>
            <div className="space-y-2">
              {(report.comments || []).map((item: any) => (
                <div key={item.id} className="rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)] px-4 py-3">
                  <p className="text-[var(--s-text)] text-sm whitespace-pre-wrap">{item.content}</p>
                  <p className="text-xs text-[var(--s-muted)] mt-2">{new Date(item.createdAt).toLocaleString('bg-BG')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
