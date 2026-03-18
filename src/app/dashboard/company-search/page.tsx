'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  CompanySearchMode,
  CompanySearchResult,
  PaginatedSearchResponse,
  SubjectCompanyRelation,
  SubjectSearchResult,
} from '@/types/company-search';
import {
  getSubjectCompaniesClient,
  searchCompaniesByNameClient,
  searchCompanyByEikClient,
  searchSubjectsByNameClient,
} from '@/hooks/lib/company-search-client';

const PAGE_SIZE = 25;

type SearchResponse = PaginatedSearchResponse<CompanySearchResult | SubjectSearchResult>;

const MODE_LABELS: Record<CompanySearchMode, string> = {
  'company-name': 'По име на фирма',
  eik: 'По ЕИК',
  person: 'По име на лице',
};

function getValidationMessage(mode: CompanySearchMode, value: string): string {
  const query = value.trim();

  if (!query) {
    return 'Въведете стойност за търсене.';
  }

  if (mode === 'eik') {
    if (!/^\d+$/.test(query)) {
      return 'ЕИК трябва да съдържа само цифри.';
    }
    if (!/^\d{9,13}$/.test(query)) {
      return 'ЕИК трябва да е между 9 и 13 цифри.';
    }
    return '';
  }

  if (query.length < 2) {
    return 'Въведете поне 2 символа.';
  }

  return '';
}

export default function CompanySearchPage() {
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

  const inFlightControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, SearchResponse>>(new Map());

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
    searchCacheRef.current.clear();
  }, [mode]);

  const validationMessage = useMemo(() => getValidationMessage(mode, debouncedQuery || query), [mode, debouncedQuery, query]);

  const runSearch = async (
    searchQuery: string,
    nextPage: number,
    append: boolean,
    source: 'debounce' | 'submit' | 'load-more'
  ) => {
    const normalizedQuery = searchQuery.trim();
    const validation = getValidationMessage(mode, normalizedQuery);

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
      setError(err?.message || 'Възникна грешка при търсенето.');
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

    const validation = getValidationMessage(mode, debouncedQuery);
    if (validation) {
      return;
    }

    runSearch(debouncedQuery, 1, false, 'debounce');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();
    const validation = getValidationMessage(mode, normalizedQuery);

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
      setPersonCompaniesError((prev: Record<string, string>) => ({ ...prev, [uid]: err?.message || 'Неуспешно зареждане на свързаните фирми.' }));
    } finally {
      setPersonCompaniesLoading((prev: Record<string, boolean>) => ({ ...prev, [uid]: false }));
    }
  };

  const renderCompanyRows = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--s-muted)] border-b border-[var(--s-border)]">
              <th className="py-3 pr-3">ЕИК/Идентификатор</th>
              <th className="py-3 pr-3">Име</th>
              <th className="py-3">Пълно фирмено име</th>
            </tr>
          </thead>
          <tbody>
            {(results as CompanySearchResult[]).map((item) => (
              <tr key={`${item.ident}-${item.name}`} className="border-b border-[var(--s-border)]/70">
                <td className="py-3 pr-3 text-[var(--s-muted2)]">{item.ident || '-'}</td>
                <td className="py-3 pr-3 font-medium text-[var(--s-text)]">{item.name || '-'}</td>
                <td className="py-3 text-[var(--s-muted2)]">{item.companyFullName || '-'}</td>
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
                  <p className="font-semibold text-[var(--s-text)]">{subject.name || 'Без име'}</p>
                  <p className="text-xs text-[var(--s-muted)] mt-1 break-all">UID: {subject.ident}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShowPersonCompanies(subject)}
                  disabled={relationLoading}
                  className="btn-site-ghost text-xs py-2 px-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {relationLoading ? 'Зареждане...' : 'Покажи свързаните фирми'}
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
                        <th className="py-2 pr-3">Фирма</th>
                        <th className="py-2 pr-3">ЕИК</th>
                        <th className="py-2">Поле</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relationItems.map((relation, idx) => (
                        <tr key={`${relation.uic}-${idx}`} className="border-b border-[var(--s-border)]/50">
                          <td className="py-2 pr-3 text-[var(--s-text)]">{relation.companyFullName || '-'}</td>
                          <td className="py-2 pr-3 text-[var(--s-muted2)]">{relation.uic || '-'}</td>
                          <td className="py-2 text-[var(--s-muted2)]">{relation.fieldName || '-'}</td>
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-25" />
        <div className="max-w-6xl mx-auto relative">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">Справки</p>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)] mt-2">Търсене на фирми</h1>
          <p className="text-sm text-[var(--s-muted)] mt-3 max-w-2xl">
            Търси по име на фирма, ЕИК или име на физическо лице и зареди свързаните участия при нужда.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <form onSubmit={handleSubmit} className="site-card rounded-2xl p-5 space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs uppercase tracking-[0.25em] text-[var(--s-muted)] mb-2">Тип търсене</label>
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
              <label className="block text-xs uppercase tracking-[0.25em] text-[var(--s-muted)] mb-2">Търсене</label>
              <input
                className="site-input w-full"
                type="text"
                value={query}
                placeholder={
                  mode === 'company-name'
                    ? 'Пример: АФЕКТ'
                    : mode === 'eik'
                      ? 'Пример: 204441987'
                      : 'Пример: Мария Миланова'
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
                {loading ? 'Търсене...' : 'Търси'}
              </button>
            </div>
          </div>

          {validationMessage && query.trim() && (
            <p className="text-xs text-[var(--s-muted)]">{validationMessage}</p>
          )}

          <p className="text-xs text-[var(--s-muted)]">
            Заявките се изпращат след пауза от 500 ms или при натискане на бутона Търси.
          </p>
        </form>

        <div className="site-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="rc-display font-bold text-xl text-[var(--s-text)]">Резултати</h2>
            {hasSearched && !loading && (
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--s-muted)]">{results.length} записа</span>
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
              <p className="font-semibold text-[var(--s-muted2)]">Няма намерени резултати</p>
              <p className="text-sm mt-1">Променете заявката и опитайте отново.</p>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-10 text-[var(--s-muted)]">
              <p className="text-sm">Въведете заявка и стартирайте търсене.</p>
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
                {loadingMore ? 'Зареждане...' : 'Зареди още'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
