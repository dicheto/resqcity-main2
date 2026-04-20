'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import type {
  CompanyDetails,
  CompanySearchMode,
  CompanySearchResult,
  PaginatedSearchResponse,
  SubjectCompanyRelation,
  SubjectSearchResult,
} from '@/types/company-search';
import {
  getCompanyDetailsClient,
  getSubjectCompaniesClient,
  searchCompaniesByNameClient,
  searchCompanyByEikClient,
  searchSubjectsByNameClient,
} from '@/hooks/lib/company-search-client';
import { useI18n } from '@/i18n';

const PAGE_SIZE = 25;

type SearchResponse = PaginatedSearchResponse<CompanySearchResult | SubjectSearchResult>;

function getValidationMessage(
  mode: CompanySearchMode,
  value: string,
  tr: (bg: string, en: string, ar: string) => string
): string {
  const query = value.trim();

  if (!query) {
    return tr('Въведете стойност за търсене.', 'Enter a search value.', 'أدخل قيمة للبحث.');
  }

  if (mode === 'eik') {
    if (!/^\d+$/.test(query)) {
      return tr('ЕИК трябва да съдържа само цифри.', 'UIC must contain digits only.', 'يجب أن يحتوي الرقم الموحد على أرقام فقط.');
    }
    if (!/^\d{9,13}$/.test(query)) {
      return tr('ЕИК трябва да е между 9 и 13 цифри.', 'UIC must be between 9 and 13 digits.', 'يجب أن يكون الرقم الموحد بين 9 و13 رقمًا.');
    }
    return '';
  }

  if (query.length < 2) {
    return tr('Въведете поне 2 символа.', 'Enter at least 2 characters.', 'أدخل حرفين على الأقل.');
  }

  return '';
}

export default function CompanySearchPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const MODE_LABELS: Record<CompanySearchMode, string> = {
    'company-name': tr('По име на фирма', 'By company name', 'حسب اسم الشركة'),
    eik: tr('По ЕИК', 'By UIC', 'حسب الرقم الموحد'),
    person: tr('По име на лице', 'By person name', 'حسب اسم الشخص'),
  };
  const [mode, setMode] = useState<CompanySearchMode>('company-name');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Array<CompanySearchResult | SubjectSearchResult>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [personCompanies, setPersonCompanies] = useState<Record<string, SubjectCompanyRelation[]>>({});
  const [personCompaniesLoading, setPersonCompaniesLoading] = useState<Record<string, boolean>>({});
  const [personCompaniesError, setPersonCompaniesError] = useState<Record<string, string>>({});
  const [selectedCompanyUic, setSelectedCompanyUic] = useState('');
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [companyDetailsLoading, setCompanyDetailsLoading] = useState(false);
  const [companyDetailsError, setCompanyDetailsError] = useState('');

  const inFlightControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, SearchResponse>>(new Map());
  const companyDetailsCacheRef = useRef<Map<string, CompanyDetails>>(new Map());

  const closeCompanyDetailsModal = () => {
    setSelectedCompanyUic('');
    setCompanyDetails(null);
    setCompanyDetailsError('');
    setCompanyDetailsLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setResults([]);
    setPage(1);
    setHasMore(false);
    setError('');
    setHasSearched(false);
    setPersonCompanies({});
    setPersonCompaniesLoading({});
    setPersonCompaniesError({});
    setSelectedCompanyUic('');
    setCompanyDetails(null);
    setCompanyDetailsLoading(false);
    setCompanyDetailsError('');
    searchCacheRef.current.clear();
    companyDetailsCacheRef.current.clear();
  }, [mode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCompanyDetailsModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const validationMessage = useMemo(() => getValidationMessage(mode, debouncedQuery || query, tr), [mode, debouncedQuery, query, tr]);

  const runSearch = async (
    searchQuery: string,
    nextPage: number,
    append: boolean,
    source: 'debounce' | 'submit' | 'load-more'
  ) => {
    const normalizedQuery = searchQuery.trim();
    const validation = getValidationMessage(mode, normalizedQuery, tr);

    if (validation) {
      if (source === 'submit') {
        setError(validation);
      }
      return;
    }

    const cacheKey = `${mode}:${normalizedQuery}:${nextPage}:${PAGE_SIZE}`;
    const cached = searchCacheRef.current.get(cacheKey);

    if (cached) {
      setError('');
      setHasSearched(true);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setResults((prev: Array<CompanySearchResult | SubjectSearchResult>) => (append ? [...prev, ...cached.items] : cached.items));
      return;
    }

    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSelectedCompanyUic('');
      setCompanyDetails(null);
      setCompanyDetailsError('');
      if (source === 'submit') {
        setResults([]);
      }
    }
    setError('');

    try {
      let response: SearchResponse;

      if (mode === 'company-name') {
        response = await searchCompaniesByNameClient({
          query: normalizedQuery,
          page: nextPage,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });
      } else if (mode === 'eik') {
        response = await searchCompanyByEikClient({
          query: normalizedQuery,
          page: nextPage,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });
      } else {
        response = await searchSubjectsByNameClient({
          query: normalizedQuery,
          page: nextPage,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });
      }

      searchCacheRef.current.set(cacheKey, response);
      setHasSearched(true);
      setPage(response.page);
      setHasMore(response.hasMore);
      setResults((prev: Array<CompanySearchResult | SubjectSearchResult>) => (append ? [...prev, ...response.items] : response.items));
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      setError(err?.message || tr('Възникна грешка при търсенето.', 'An error occurred while searching.', 'حدث خطأ أثناء البحث.'));
      if (!append) {
        setResults([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    const validation = getValidationMessage(mode, debouncedQuery, tr);
    if (validation) {
      return;
    }

    runSearch(debouncedQuery, 1, false, 'debounce');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();
    const validation = getValidationMessage(mode, normalizedQuery, tr);

    if (validation) {
      setError(validation);
      return;
    }

    await runSearch(normalizedQuery, 1, false, 'submit');
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !debouncedQuery) {
      return;
    }
    await runSearch(debouncedQuery, page + 1, true, 'load-more');
  };

  const handleShowPersonCompanies = async (subject: SubjectSearchResult) => {
    const uid = subject.ident;

    if (!uid || personCompaniesLoading[uid]) {
      return;
    }

    if (personCompanies[uid]) {
      return;
    }

    setPersonCompaniesLoading((prev: Record<string, boolean>) => ({ ...prev, [uid]: true }));
    setPersonCompaniesError((prev: Record<string, string>) => ({ ...prev, [uid]: '' }));

    try {
      const relations = await getSubjectCompaniesClient(subject.ident, subject.name);
      setPersonCompanies((prev: Record<string, SubjectCompanyRelation[]>) => ({ ...prev, [uid]: relations }));
    } catch (err: any) {
      setPersonCompaniesError((prev: Record<string, string>) => ({ ...prev, [uid]: err?.message || tr('Неуспешно зареждане на свързаните фирми.', 'Failed to load related companies.', 'فشل تحميل الشركات المرتبطة.') }));
    } finally {
      setPersonCompaniesLoading((prev: Record<string, boolean>) => ({ ...prev, [uid]: false }));
    }
  };

  const handleShowCompanyDetails = async (uic: string) => {
    const normalizedUic = uic.trim();
    if (!/^\d{9,13}$/.test(normalizedUic)) {
      closeCompanyDetailsModal();
      setCompanyDetailsError(tr('Липсва валиден ЕИК за зареждане на детайли.', 'Missing valid UIC for details.', 'لا يوجد رقم موحد صالح لتحميل التفاصيل.'));
      return;
    }

    if (selectedCompanyUic === normalizedUic && companyDetails) {
      return;
    }

    const cachedDetails = companyDetailsCacheRef.current.get(normalizedUic);
    if (cachedDetails) {
      setSelectedCompanyUic(normalizedUic);
      setCompanyDetails(cachedDetails);
      setCompanyDetailsError('');
      setCompanyDetailsLoading(false);
      return;
    }

    setSelectedCompanyUic(normalizedUic);
    setCompanyDetailsLoading(true);
    setCompanyDetailsError('');

    try {
      const details = await getCompanyDetailsClient(normalizedUic);
      companyDetailsCacheRef.current.set(normalizedUic, details);
      setCompanyDetails(details);
    } catch (err: any) {
      setCompanyDetails(null);
      setCompanyDetailsError(err?.message || tr('Неуспешно зареждане на фирмените детайли.', 'Failed to load company details.', 'فشل تحميل تفاصيل الشركة.'));
    } finally {
      setCompanyDetailsLoading(false);
    }
  };

  const renderCompanyRows = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--s-muted)] border-b border-[var(--s-border)]">
              <th className="py-3 pr-3">{tr('ЕИК/Идентификатор', 'UIC/Identifier', 'الرقم الموحد/المعرف')}</th>
              <th className="py-3 pr-3">{tr('Име', 'Name', 'الاسم')}</th>
              <th className="py-3">{tr('Пълно фирмено име', 'Full company name', 'الاسم الكامل للشركة')}</th>
              <th className="py-3 text-right">{tr('Действие', 'Action', 'إجراء')}</th>
            </tr>
          </thead>
          <tbody>
            {(results as CompanySearchResult[]).map((item) => (
              <tr
                key={`${item.ident}-${item.name}`}
                className="border-b border-[var(--s-border)]/70 hover:bg-[var(--s-surface2)]/70 cursor-pointer"
                onClick={() => handleShowCompanyDetails(item.ident)}
              >
                <td className="py-3 pr-3 text-[var(--s-muted2)]">{item.ident || '-'}</td>
                <td className="py-3 pr-3 font-medium text-[var(--s-text)]">{item.name || '-'}</td>
                <td className="py-3 text-[var(--s-muted2)]">{item.companyFullName || '-'}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    className="btn-site-ghost text-xs py-1.5 px-3 rounded-lg"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      handleShowCompanyDetails(item.ident);
                    }}
                  >
                    {tr('Детайли', 'Details', 'التفاصيل')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPersonRows = () => {
    return (
      <div className="space-y-3">
        {(results as SubjectSearchResult[]).map((subject) => {
          const relationItems = personCompanies[subject.ident] || [];
          const relationLoading = Boolean(personCompaniesLoading[subject.ident]);
          const relationError = personCompaniesError[subject.ident];

          return (
            <div key={subject.ident} className="rounded-2xl border border-[var(--s-border)] p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--s-text)]">{subject.name || tr('Без име', 'No name', 'بدون اسم')}</p>
                  <p className="text-xs text-[var(--s-muted)] mt-1 break-all">UID: {subject.ident}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShowPersonCompanies(subject)}
                  disabled={relationLoading}
                  className="btn-site-ghost text-xs py-2 px-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {relationLoading ? tr('Зареждане...', 'Loading...', 'جار التحميل...') : tr('Покажи свързаните фирми', 'Show related companies', 'عرض الشركات المرتبطة')}
                </button>
              </div>

              {relationError && (
                <p className="text-xs mt-3 text-[var(--s-red)]">{relationError}</p>
              )}

              {relationItems.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[var(--s-muted)] border-b border-[var(--s-border)]">
                        <th className="py-2 pr-3">{tr('Фирма', 'Company', 'الشركة')}</th>
                        <th className="py-2 pr-3">{tr('ЕИК', 'UIC', 'الرقم الموحد')}</th>
                        <th className="py-2">{tr('Поле', 'Field', 'حقل')}</th>
                        <th className="py-2 text-right">{tr('Действие', 'Action', 'إجراء')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relationItems.map((relation, idx) => (
                        <tr key={`${relation.uic}-${idx}`} className="border-b border-[var(--s-border)]/50">
                          <td className="py-2 pr-3 text-[var(--s-text)]">{relation.companyFullName || '-'}</td>
                          <td className="py-2 pr-3 text-[var(--s-muted2)]">{relation.uic || '-'}</td>
                          <td className="py-2 text-[var(--s-muted2)]">{relation.fieldName || '-'}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              className="btn-site-ghost text-[11px] py-1 px-2.5 rounded-md"
                              onClick={() => handleShowCompanyDetails(relation.uic)}
                            >
                              {tr('Детайли', 'Details', 'التفاصيل')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCompanyDetails = () => {
    if (!selectedCompanyUic) {
      return null;
    }

    if (companyDetailsLoading) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCompanyDetailsModal} />
          <div className="relative w-full max-w-4xl site-card rounded-2xl p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--s-muted)]">{tr('Детайли за фирма', 'Company details', 'تفاصيل الشركة')}</p>
              <button type="button" className="btn-site-ghost text-xs py-1.5 px-3 rounded-lg" onClick={closeCompanyDetailsModal}>{tr('Затвори', 'Close', 'إغلاق')}</button>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 rounded-lg" style={{ background: 'var(--s-surface2)' }} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (companyDetailsError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCompanyDetailsModal} />
          <div className="relative w-full max-w-3xl site-card rounded-2xl p-5 border border-[var(--s-red)]/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--s-muted)]">{tr('Детайли за фирма', 'Company details', 'تفاصيل الشركة')}</p>
              <button type="button" className="btn-site-ghost text-xs py-1.5 px-3 rounded-lg" onClick={closeCompanyDetailsModal}>{tr('Затвори', 'Close', 'إغلاق')}</button>
            </div>
            <p className="text-sm text-[var(--s-red)]">{companyDetailsError}</p>
          </div>
        </div>
      );
    }

    if (!companyDetails) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCompanyDetailsModal} />
        <div className="relative w-full max-w-6xl site-card rounded-2xl p-5 max-h-[88vh] overflow-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--s-muted)]">{tr('Детайли за фирма', 'Company details', 'تفاصيل الشركة')}</p>
              <h3 className="rc-display font-bold text-xl text-[var(--s-text)] mt-1">
                {companyDetails.fullName || companyDetails.companyName || companyDetails.uic}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-[var(--s-muted)]">
                  <p>{tr('ЕИК', 'UIC', 'الرقم الموحد')}: <span className="text-[var(--s-text)] font-semibold">{companyDetails.uic || '-'}</span></p>
                {companyDetails.entryDate && (
                  <p className="mt-1">{tr('Актуално към', 'Updated at', 'محدث في')}: {new Date(companyDetails.entryDate).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
                )}
              </div>
              <button type="button" className="btn-site-ghost text-xs py-1.5 px-3 rounded-lg" onClick={closeCompanyDetailsModal}>{tr('Затвори', 'Close', 'إغلاق')}</button>
            </div>
          </div>

          {companyDetails.fields.length === 0 ? (
            <p className="text-sm text-[var(--s-muted)]">{tr('Няма налични полета за визуализация.', 'No fields available for display.', 'لا توجد حقول متاحة للعرض.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--s-muted)] border-b border-[var(--s-border)]">
                    <th className="py-2 pr-3">Поле</th>
                    <th className="py-2">Стойност</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDetails.fields.slice(0, 60).map((field, index) => (
                    <tr key={`${field.code}-${index}`} className="border-b border-[var(--s-border)]/60 align-top">
                      <td className="py-2 pr-3 text-[var(--s-muted2)] w-[240px]">
                        <p className="font-medium text-[var(--s-text)]">{field.label}</p>
                      </td>
                      <td className="py-2 text-[var(--s-muted2)] whitespace-pre-wrap">{field.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-25" />
        <div className="max-w-6xl mx-auto relative">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">{tr('Справки', 'Lookup', 'استعلامات')}</p>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)] mt-2">{tr('Търсене на фирми', 'Company search', 'بحث الشركات')}</h1>
          <p className="text-sm text-[var(--s-muted)] mt-3 max-w-2xl">
            {tr('Търси по име на фирма, ЕИК или име на физическо лице и зареди свързаните участия при нужда.', 'Search by company name, UIC, or person name and load related links when needed.', 'ابحث باسم الشركة أو الرقم الموحد أو اسم الشخص وحمّل العلاقات المرتبطة عند الحاجة.')}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <form onSubmit={handleSubmit} className="site-card rounded-2xl p-5 space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs uppercase tracking-[0.25em] text-[var(--s-muted)] mb-2">{tr('Тип търсене', 'Search type', 'نوع البحث')}</label>
              <select
                className="site-input w-full"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as CompanySearchMode);
                  setQuery('');
                  setDebouncedQuery('');
                }}
              >
                <option value="company-name">{MODE_LABELS['company-name']}</option>
                <option value="eik">{MODE_LABELS.eik}</option>
                <option value="person">{MODE_LABELS.person}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.25em] text-[var(--s-muted)] mb-2">{tr('Търсене', 'Search', 'بحث')}</label>
              <input
                className="site-input w-full"
                type="text"
                value={query}
                placeholder={
                  mode === 'company-name'
                    ? tr('Пример: АФЕКТ', 'Example: AFFECT', 'مثال: AFFECT')
                    : mode === 'eik'
                      ? tr('Пример: 204441987', 'Example: 204441987', 'مثال: 204441987')
                      : tr('Пример: Мария Миланова', 'Example: Maria Milanova', 'مثال: Maria Milanova')
                }
                onChange={(event) => {
                  const nextValue = mode === 'eik' ? event.target.value.replace(/\D/g, '') : event.target.value;
                  setQuery(nextValue);
                }}
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className="btn-site-primary text-xs py-3 px-5 rounded-xl w-full disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading || !query.trim()}
              >
                {loading ? tr('Търсене...', 'Searching...', 'جار البحث...') : tr('Търси', 'Search', 'بحث')}
              </button>
            </div>
          </div>

          {validationMessage && query.trim() && (
            <p className="text-xs text-[var(--s-muted)]">{validationMessage}</p>
          )}

          <p className="text-xs text-[var(--s-muted)]">
            {tr('Заявките се изпращат след пауза от 500 ms или при натискане на бутона Търси.', 'Queries are sent after 500 ms pause or when pressing Search.', 'يتم إرسال الاستعلام بعد توقف 500 مللي ثانية أو عند الضغط على زر البحث.')}
          </p>
        </form>

        <div className="site-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="rc-display font-bold text-xl text-[var(--s-text)]">{tr('Резултати', 'Results', 'النتائج')}</h2>
            {hasSearched && !loading && (
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--s-muted)]">{results.length} {tr('записа', 'records', 'سجلات')}</span>
            )}
          </div>

          {loading && !loadingMore ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 rounded-xl" style={{ background: 'var(--s-surface2)' }} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[var(--s-red)]/30 bg-[rgba(255,71,87,0.08)] p-4 text-sm text-[var(--s-red)]">
              {error}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center py-10 text-[var(--s-muted)]">
              <p className="text-3xl mb-2">🔎</p>
              <p className="font-semibold text-[var(--s-muted2)]">{tr('Няма намерени резултати', 'No results found', 'لا توجد نتائج')}</p>
              <p className="text-sm mt-1">{tr('Променете заявката и опитайте отново.', 'Change the query and try again.', 'غيّر الاستعلام وحاول مرة أخرى.')}</p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-10 text-[var(--s-muted)]">
              <p className="text-sm">{tr('Въведете заявка и стартирайте търсене.', 'Enter a query and start searching.', 'أدخل استعلامًا وابدأ البحث.')}</p>
            </div>
          ) : mode === 'person' ? (
            renderPersonRows()
          ) : (
            renderCompanyRows()
          )}

          {hasMore && !error && results.length > 0 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-site-ghost text-xs py-2.5 px-5 rounded-xl disabled:opacity-70"
              >
                {loadingMore ? tr('Зареждане...', 'Loading...', 'جار التحميل...') : tr('Зареди още', 'Load more', 'تحميل المزيد')}
              </button>
            </div>
          )}
        </div>

      </div>

      {renderCompanyDetails()}
    </div>
  );
}
