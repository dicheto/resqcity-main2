'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface Institution {
  id: string;
  name: string;
  email?: string;
}

interface RoutingTarget {
  id: string;
  institutionId: string;
  included: boolean;
  notes?: string | null;
  institution: Institution;
}

export default function ReportRoutingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reportId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [reportDescription, setReportDescription] = useState('');
  const [routingTargets, setRoutingTargets] = useState<RoutingTarget[]>([]);
  const [categoryDefaults, setCategoryDefaults] = useState<Institution[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notesByInstitutionId, setNotesByInstitutionId] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [routingResponse, institutionsResponse] = await Promise.all([
        axios.get(`/api/reports/${reportId}/routing`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/admin/institutions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const targets: RoutingTarget[] = routingResponse.data.routingTargets;
      setReportTitle(routingResponse.data.report.title);
      setReportDescription(routingResponse.data.report.description || '');
      setReportImages(routingResponse.data.report.images || []);
      setRoutingTargets(targets);
      setCategoryDefaults(routingResponse.data.categoryDefaultInstitutions || []);
      setAllInstitutions(institutionsResponse.data.institutions || []);
      setSelectedIds(new Set(targets.filter((item) => item.included).map((item) => item.institutionId)));

      const nextNotes: Record<string, string> = {};
      for (const target of targets) {
        if (target.notes) {
          nextNotes[target.institutionId] = target.notes;
        }
      }
      setNotesByInstitutionId(nextNotes);
    } catch (error) {
      console.error('Error loading routing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedInstitutions = useMemo(() => {
    return [...allInstitutions].sort((a, b) => a.name.localeCompare(b.name, 'bg'));
  }, [allInstitutions]);

  const toggleInstitution = (institutionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(institutionId)) {
        next.delete(institutionId);
      } else {
        next.add(institutionId);
      }
      return next;
    });
  };

  const saveRouting = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/api/reports/${reportId}/routing`,
        {
          selectedInstitutionIds: [...selectedIds],
          notesByInstitutionId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push('/admin/reports');
    } catch (error) {
      console.error('Error saving routing:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Зареждане...</div>;
  }

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">Маршрутизация</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {reportTitle}
        </h1>
        {reportDescription && (
          <p className="admin-muted mt-2 text-sm">{reportDescription}</p>
        )}
        <p className="text-[var(--a-muted2)] text-xs mt-2">
          Избери институции, към които сигналът ще бъде насочен. Можеш да добавяш бележки.
        </p>
      </div>

      {reportImages.length > 0 && (
        <div className="rounded-3xl data-card border border-[var(--a-border)] p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] admin-muted mb-4">Снимки ({reportImages.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {reportImages.map((url, idx) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--a-border)] aspect-square hover:opacity-80 transition">
                <img src={url} alt={`Снимка ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl data-card border border-[var(--a-border)] p-6 space-y-4">
        <div className="text-xs uppercase tracking-[0.3em] admin-muted">Препоръчани по категория</div>
        <div className="flex flex-wrap gap-2">
          {categoryDefaults.map((institution) => (
            <span key={institution.id} className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-sm text-blue-700">
              {institution.name}
            </span>
          ))}
        </div>

        <div className="border-t border-[var(--a-border)] pt-4 space-y-3">
          {sortedInstitutions.map((institution) => (
            <div key={institution.id} className="rounded-2xl border border-[var(--a-border)] p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(institution.id)}
                  onChange={() => toggleInstitution(institution.id)}
                />
                <span className="font-medium admin-text">{institution.name}</span>
                {institution.email && <span className="text-xs admin-muted">{institution.email}</span>}
              </label>
              {selectedIds.has(institution.id) && (
                <textarea
                  className="mt-3 admin-input rounded-xl border-[var(--a-border)]"
                  rows={2}
                  value={notesByInstitutionId[institution.id] || ''}
                  onChange={(e) =>
                    setNotesByInstitutionId((prev) => ({
                      ...prev,
                      [institution.id]: e.target.value,
                    }))
                  }
                  placeholder="Бележка към институцията (по избор)"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.push('/admin/reports')}
            className="flex-1 rounded-2xl border border-[var(--a-border)] admin-input py-3 text-sm uppercase tracking-[0.3em] admin-muted"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={saveRouting}
            disabled={saving}
            className="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-sm uppercase tracking-[0.3em]"
          >
            {saving ? 'Запис...' : 'Запиши маршрутизация'}
          </button>
        </div>
      </div>
    </div>
  );
}
