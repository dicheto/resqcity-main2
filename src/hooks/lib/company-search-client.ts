import type {
  CompanySearchResult,
  PaginatedSearchResponse,
  SubjectCompanyRelation,
  SubjectSearchResult,
} from '@/types/company-search';

type SearchParams = {
  query: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
};

function getAuthHeader(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: {
      ...getAuthHeader(),
    },
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Неуспешна заявка');
  }

  return data as T;
}

export async function searchCompaniesByNameClient({
  query,
  page = 1,
  pageSize = 25,
  signal,
}: SearchParams): Promise<PaginatedSearchResponse<CompanySearchResult>> {
  const params = new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) });
  return fetchJson<PaginatedSearchResponse<CompanySearchResult>>(`/api/company-search/by-name?${params.toString()}`, signal);
}

export async function searchCompanyByEikClient({
  query,
  page = 1,
  pageSize = 25,
  signal,
}: SearchParams): Promise<PaginatedSearchResponse<CompanySearchResult>> {
  const params = new URLSearchParams({ eik: query, page: String(page), pageSize: String(pageSize) });
  return fetchJson<PaginatedSearchResponse<CompanySearchResult>>(`/api/company-search/by-eik?${params.toString()}`, signal);
}

export async function searchSubjectsByNameClient({
  query,
  page = 1,
  pageSize = 25,
  signal,
}: SearchParams): Promise<PaginatedSearchResponse<SubjectSearchResult>> {
  const params = new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) });
  return fetchJson<PaginatedSearchResponse<SubjectSearchResult>>(`/api/company-search/by-person?${params.toString()}`, signal);
}

export async function getSubjectCompaniesClient(uid: string, name: string): Promise<SubjectCompanyRelation[]> {
  const params = new URLSearchParams({ uid, name });
  return fetchJson<SubjectCompanyRelation[]>(`/api/company-search/person-companies?${params.toString()}`);
}
