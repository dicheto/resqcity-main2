'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useI18n } from '@/i18n';

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
      'border-amber-400/50 bg-gradient-to-br from-amber-400/30 to-orange-500/18 text-[var(--a-text)] shadow-[0_2px_16px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-amber-300/20',
    chipOff:
      'border-[var(--a-border)]/80 bg-[var(--a-surface2)]/30 text-[var(--a-muted)] hover:border-amber-400/35 hover:bg-amber-500/[0.08] hover:text-[var(--a-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  },
  SUBCATEGORY: {
    ring: 'border-emerald-400/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    glow: 'from-emerald-500/[0.11] via-transparent to-teal-500/[0.07]',
    chipOn:
      'border-emerald-400/45 bg-gradient-to-br from-emerald-400/26 to-teal-600/14 text-[var(--a-text)] shadow-[0_2px_16px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-emerald-300/18',
    chipOff:
      'border-[var(--a-border)]/80 bg-[var(--a-surface2)]/30 text-[var(--a-muted)] hover:border-emerald-400/32 hover:bg-emerald-500/[0.07] hover:text-[var(--a-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  },
  CATEGORY: {
    ring: 'border-violet-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    glow: 'from-violet-500/[0.12] via-transparent to-indigo-500/[0.08]',
    chipOn:
      'border-violet-400/50 bg-gradient-to-br from-violet-400/28 to-indigo-600/16 text-[var(--a-text)] shadow-[0_2px_16px_rgba(139,92,246,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-violet-300/20',
    chipOff:
      'border-[var(--a-border)]/80 bg-[var(--a-surface2)]/30 text-[var(--a-muted)] hover:border-violet-400/35 hover:bg-violet-500/[0.08] hover:text-[var(--a-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  },
  OTHER: {
    ring: 'border-[var(--a-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    glow: 'from-[var(--a-muted)]/[0.08] via-transparent to-transparent',
    chipOn:
      'border-[var(--a-accent)]/45 bg-gradient-to-br from-[var(--a-accent)]/22 to-[var(--a-accent2)]/12 text-[var(--a-text)] shadow-[0_2px_14px_rgba(255,106,47,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-[var(--a-accent)]/15',
    chipOff:
      'border-[var(--a-border)]/80 bg-[var(--a-surface2)]/30 text-[var(--a-muted)] hover:border-[var(--a-accent)]/28 hover:bg-[var(--a-surface2)]/50 hover:text-[var(--a-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  },
};

function authHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ReportRoutingPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
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
    return <div className="text-center py-12 text-slate-500">{tr('Зареждане...', 'Loading...', 'جار التحميل...')}</div>;
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
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{tr('Маршрутизация', 'Routing', 'التوجيه')}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {reportTitle}
        </h1>
        {reportDescription && (
          <p className="admin-muted mt-2 text-sm">{reportDescription}</p>
        )}
        <p className="text-[var(--a-muted)] text-xs mt-2">
          {tr(
            'Избери институции по произход от таксономията. Активните избори се отличават по цвят; бележките са по избор.',
            'Select institutions by taxonomy origin. Active selections are color-highlighted; notes are optional.',
            'اختر المؤسسات حسب تصنيف المصدر. الاختيارات النشطة مميزة بالألوان؛ والملاحظات اختيارية.'
          )}
        </p>
        {(taxonomySubcategory || taxonomySituation) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {taxonomySubcategory && (
              <span className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface2)]/50 px-2.5 py-1 admin-muted backdrop-blur-sm">
                {tr('Подкатегория', 'Subcategory', 'الفئة الفرعية')}: <span className="admin-text font-medium">{taxonomySubcategory}</span>
              </span>
            )}
            {taxonomySituation && (
              <span className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface2)]/50 px-2.5 py-1 admin-muted backdrop-blur-sm">
                {tr('Ситуация', 'Situation', 'الحالة')}: <span className="admin-text font-medium">{taxonomySituation}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {reportImages.length > 0 && (
        <div className="rounded-3xl data-card border border-[var(--a-border)] p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] admin-muted mb-4">{tr('Снимки', 'Images', 'الصور')} ({reportImages.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {reportImages.map((url, idx) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--a-border)] aspect-square hover:opacity-80 transition"
              >
                <img src={url} alt={`${tr('Снимка', 'Image', 'صورة')} ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.3em] admin-muted">
          {tr('Институции по произход', 'Institutions by origin', 'المؤسسات حسب المصدر')} · {totalRecipients} {tr('общо в списъците', 'total in lists', 'إجمالي في القوائم')}
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
                    {group.recipients.length === 1 ? tr('институция', 'institution', 'مؤسسة') : tr('институции', 'institutions', 'مؤسسات')}
                  </span>
                </div>

                {group.recipients.length === 0 ? (
                  <p className="text-sm admin-muted italic py-2">{tr('Няма институции в тази група за този сигнал.', 'No institutions in this group for this report.', 'لا توجد مؤسسات في هذه المجموعة لهذا البلاغ.')}</p>
                ) : (
                  <>
                    <div
                      role="group"
                      aria-label={group.label}
                      className="flex flex-wrap gap-2 sm:gap-2.5"
                    >
                      {group.recipients.map((institution) => {
                        const selected = selectedIds.has(institution.id);
                        const hint = [institution.email, institution.contactPerson]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <button
                            key={institution.id}
                            type="button"
                            title={hint || institution.name}
                            onClick={() => toggleInstitution(institution.id)}
                            className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent2)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--a-bg)] active:scale-[0.98] ${
                              selected ? shell.chipOn : shell.chipOff
                            }`}
                          >
                            {selected && (
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--a-text)]/10 text-[0.65rem] font-bold leading-none text-[var(--a-text)]"
                                aria-hidden
                              >
                                ✓
                              </span>
                            )}
                            <span className="min-w-0 truncate leading-snug">{institution.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {group.recipients.some((r) => selectedIds.has(r.id)) && (
                      <div className="mt-5 rounded-xl bg-[var(--a-surface2)]/20 p-4 backdrop-blur-md sm:p-5">
                        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.28em] admin-muted">
                          {tr('Бележки към избраните', 'Notes for selected', 'ملاحظات للمختارين')}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {group.recipients
                            .filter((r) => selectedIds.has(r.id))
                            .map((institution) => (
                              <label
                                key={institution.id}
                                className="block min-w-[min(100%,17.5rem)] flex-1 basis-[14rem]"
                              >
                                <span className="mb-1.5 block truncate text-xs font-medium admin-text">
                                  {institution.name}
                                </span>
                                <textarea
                                  className="w-full resize-y rounded-xl border border-[var(--a-border)]/60 bg-[var(--a-surface)]/35 px-3 py-2.5 text-sm text-[var(--a-text)] placeholder:text-[var(--a-muted)] backdrop-blur-sm transition focus:border-[var(--a-accent2)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--a-accent2)]/30 min-h-[3.25rem]"
                                  rows={2}
                                  value={notesByInstitutionId[institution.id] || ''}
                                  onChange={(e) =>
                                    setNotesByInstitutionId((prev) => ({
                                      ...prev,
                                      [institution.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={tr('По избор…', 'Optional…', 'اختياري…')}
                                />
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
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
          {tr('Назад', 'Back', 'رجوع')}
        </button>
        <button
          type="button"
          onClick={saveRouting}
          disabled={saving}
          className="flex-1 rounded-2xl bg-[var(--a-text)] text-[var(--a-bg)] py-3 text-sm uppercase tracking-[0.3em] font-medium shadow-lg shadow-black/10 transition hover:opacity-95 disabled:opacity-50"
        >
          {saving ? tr('Запис...', 'Saving...', 'جار الحفظ...') : tr('Запиши маршрутизация', 'Save routing', 'حفظ التوجيه')}
        </button>
      </div>
    </div>
  );
}
