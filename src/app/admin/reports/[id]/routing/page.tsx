'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

type Recommendation = 'SITUATION' | 'SUBCATEGORY' | 'CATEGORY' | 'OTHER';

interface GroupRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactPerson?: string;
  isAdHoc: boolean;
}

interface RecipientGroup {
  recommendation: Recommendation;
  label: string;
  recipients: GroupRecipient[];
}

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

const GROUP_SHELL: Record<
  Recommendation,
  { ring: string; glow: string; chipOn: string; chipOff: string }
> = {
  SITUATION: {
    ring: 'border-amber-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    glow: 'from-amber-500/[0.12] via-transparent to-orange-500/[0.08]',
    chipOn:
      'border-amber-400/45 bg-gradient-to-br from-amber-500/25 to-orange-600/15 text-[var(--a-text)] shadow-[0_4px_20px_rgba(245,158,11,0.15)]',
    chipOff:
      'border-[var(--a-border)] bg-[var(--a-surface2)]/35 text-[var(--a-muted)] hover:border-amber-400/25 hover:bg-amber-500/5',
  },
  SUBCATEGORY: {
    ring: 'border-emerald-400/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    glow: 'from-emerald-500/[0.11] via-transparent to-teal-500/[0.07]',
    chipOn:
      'border-emerald-400/40 bg-gradient-to-br from-emerald-500/22 to-teal-600/12 text-[var(--a-text)] shadow-[0_4px_20px_rgba(16,185,129,0.12)]',
    chipOff:
      'border-[var(--a-border)] bg-[var(--a-surface2)]/35 text-[var(--a-muted)] hover:border-emerald-400/22 hover:bg-emerald-500/5',
  },
  CATEGORY: {
    ring: 'border-violet-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    glow: 'from-violet-500/[0.12] via-transparent to-indigo-500/[0.08]',
    chipOn:
      'border-violet-400/45 bg-gradient-to-br from-violet-500/22 to-indigo-600/14 text-[var(--a-text)] shadow-[0_4px_20px_rgba(139,92,246,0.14)]',
    chipOff:
      'border-[var(--a-border)] bg-[var(--a-surface2)]/35 text-[var(--a-muted)] hover:border-violet-400/25 hover:bg-violet-500/5',
  },
  OTHER: {
    ring: 'border-[var(--a-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    glow: 'from-[var(--a-muted)]/[0.08] via-transparent to-transparent',
    chipOn:
      'border-[var(--a-accent)]/40 bg-gradient-to-br from-[var(--a-accent)]/20 to-[var(--a-accent2)]/10 text-[var(--a-text)] shadow-[0_4px_18px_rgba(255,106,47,0.12)]',
    chipOff:
      'border-[var(--a-border)] bg-[var(--a-surface2)]/35 text-[var(--a-muted)] hover:border-[var(--a-accent)]/22 hover:bg-[var(--a-surface2)]/55',
  },
};

function authHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  const [taxonomySubcategory, setTaxonomySubcategory] = useState<string | null>(null);
  const [taxonomySituation, setTaxonomySituation] = useState<string | null>(null);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notesByInstitutionId, setNotesByInstitutionId] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = authHeader();
      const [routingResponse, groupedResponse] = await Promise.all([
        axios.get(`/api/reports/${reportId}/routing`, { headers }),
        axios.get(`/api/admin/recipients/grouped?reportId=${reportId}`),
      ]);

      const targets: RoutingTarget[] = routingResponse.data.routingTargets;
      setReportTitle(routingResponse.data.report.title);
      setReportDescription(routingResponse.data.report.description || '');
      setReportImages(routingResponse.data.report.images || []);
      setTaxonomySubcategory(routingResponse.data.report.taxonomySubcategory ?? null);
      setTaxonomySituation(routingResponse.data.report.taxonomySituation ?? null);
      setGroups(groupedResponse.data.groups || []);
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

  const totalRecipients = useMemo(
    () => groups.reduce((acc, g) => acc + g.recipients.length, 0),
    [groups]
  );

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
      const headers = authHeader();
      await axios.patch(
        `/api/reports/${reportId}/routing`,
        {
          selectedInstitutionIds: [...selectedIds],
          notesByInstitutionId,
        },
        { headers }
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
    <div className="px-6 py-10 max-w-5xl mx-auto relative">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem] opacity-90"
        aria-hidden
      >
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-40 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">Маршрутизация</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {reportTitle}
        </h1>
        {reportDescription && (
          <p className="admin-muted mt-2 text-sm">{reportDescription}</p>
        )}
        <p className="text-[var(--a-muted)] text-xs mt-2">
          Избери институции по произход от таксономията. Активните избори се отличават по цвят; бележките са по избор.
        </p>
        {(taxonomySubcategory || taxonomySituation) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {taxonomySubcategory && (
              <span className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface2)]/50 px-2.5 py-1 admin-muted backdrop-blur-sm">
                Подкатегория: <span className="admin-text font-medium">{taxonomySubcategory}</span>
              </span>
            )}
            {taxonomySituation && (
              <span className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface2)]/50 px-2.5 py-1 admin-muted backdrop-blur-sm">
                Ситуация: <span className="admin-text font-medium">{taxonomySituation}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {reportImages.length > 0 && (
        <div className="rounded-3xl data-card border border-[var(--a-border)] p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] admin-muted mb-4">Снимки ({reportImages.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {reportImages.map((url, idx) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--a-border)] aspect-square hover:opacity-80 transition"
              >
                <img src={url} alt={`Снимка ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.3em] admin-muted">
          Институции по произход · {totalRecipients} общо в списъците
        </p>

        {groups.map((group) => {
          const shell = GROUP_SHELL[group.recommendation];
          return (
            <section
              key={group.recommendation}
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-[var(--a-surface)]/65 ${shell.ring}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${shell.glow}`}
                aria-hidden
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <h2 className="text-base sm:text-lg font-semibold admin-text tracking-tight">
                    {group.label}
                  </h2>
                  <span className="text-xs admin-muted tabular-nums">
                    {group.recipients.length}{' '}
                    {group.recipients.length === 1 ? 'институция' : 'институции'}
                  </span>
                </div>

                {group.recipients.length === 0 ? (
                  <p className="text-sm admin-muted italic py-2">Няма институции в тази група за този сигнал.</p>
                ) : (
                  <ul className="space-y-3">
                    {group.recipients.map((institution) => {
                      const selected = selectedIds.has(institution.id);
                      return (
                        <li
                          key={institution.id}
                          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4 pb-3 border-b border-[var(--a-border)]/50 last:border-0 last:pb-0"
                        >
                          <button
                            type="button"
                            onClick={() => toggleInstitution(institution.id)}
                            className={`text-left rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 sm:max-w-[min(100%,20rem)] sm:shrink-0 ${
                              selected ? shell.chipOn : shell.chipOff
                            }`}
                          >
                            <span className="block leading-snug">{institution.name}</span>
                            {(institution.email || institution.contactPerson) && (
                              <span className="mt-1 block text-xs font-normal opacity-80">
                                {institution.email}
                                {institution.email && institution.contactPerson ? ' · ' : ''}
                                {institution.contactPerson}
                              </span>
                            )}
                          </button>
                          {selected && (
                            <textarea
                              className="flex-1 min-w-0 admin-input rounded-xl border-[var(--a-border)] min-h-[56px] text-base px-4 py-3 bg-[var(--a-surface)]/40 backdrop-blur-sm"
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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/reports')}
          className="flex-1 rounded-2xl border border-[var(--a-border)] admin-input py-3 text-sm uppercase tracking-[0.3em] admin-muted backdrop-blur-sm"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={saveRouting}
          disabled={saving}
          className="flex-1 rounded-2xl bg-[var(--a-text)] text-[var(--a-bg)] py-3 text-sm uppercase tracking-[0.3em] font-medium shadow-lg shadow-black/10 transition hover:opacity-95 disabled:opacity-50"
        >
          {saving ? 'Запис...' : 'Запиши маршрутизация'}
        </button>
      </div>
    </div>
  );
}
