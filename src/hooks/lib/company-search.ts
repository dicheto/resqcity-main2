import axios from 'axios';
import type {
  CompanySearchResult,
  PaginatedSearchResponse,
  SubjectCompanyRelation,
  SubjectSearchResult,
} from '@/types/company-search';

const REGISTRY_BASE_URL = 'https://portal.registryagency.bg/CR/api/Deeds';
const DEFAULT_PAGE_SIZE = 25;
const REQUEST_TIMEOUT_MS = 9000;

type RegistrySummaryItem = {
  isPhysical?: boolean;
  ident?: string;
  name?: string;
  companyFullName?: string;
};

type RegistrySubjectItem = {
  isPhysical?: boolean;
  ident?: string;
  name?: string;
};

type RegistrySubjectCompanyItem = {
  companyFullName?: string;
  uic?: string;
  fieldName?: string;
};

function buildPaginatedResponse<T>(items: T[], page: number, pageSize: number): PaginatedSearchResponse<T> {
  return {
    items,
    page,
    pageSize,
    hasMore: items.length >= pageSize,
  };
}

function normalizeCompany(item: RegistrySummaryItem): CompanySearchResult {
  return {
    ident: String(item.ident ?? '').trim(),
    name: String(item.name ?? '').trim(),
    companyFullName: String(item.companyFullName ?? item.name ?? '').trim(),
    isPhysical: Boolean(item.isPhysical),
  };
}

function normalizeSubject(item: RegistrySubjectItem): SubjectSearchResult {
  return {
    ident: String(item.ident ?? '').trim(),
    name: String(item.name ?? '').trim(),
    isPhysical: Boolean(item.isPhysical),
  };
}

function normalizeSubjectCompany(item: RegistrySubjectCompanyItem): SubjectCompanyRelation {
  return {
    companyFullName: String(item.companyFullName ?? '').trim(),
    uic: String(item.uic ?? '').trim(),
    fieldName: String(item.fieldName ?? '').trim(),
  };
}

async function fetchRegistryArray<T>(path: string, params: Record<string, string | number | boolean>): Promise<T[]> {
  const request = async () => {
    const response = await axios.get<T[]>(`${REGISTRY_BASE_URL}${path}`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      validateStatus: (status: number) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      throw new Error(`Registry request failed with status ${response.status}`);
    }

    return Array.isArray(response.data) ? response.data : [];
  };

  try {
    return await request();
  } catch (error) {
    // Single retry for transient failures to keep serverless execution predictable.
    return request();
  }
}

export async function searchCompaniesByName(
  query: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedSearchResponse<CompanySearchResult>> {
  const items = await fetchRegistryArray<RegistrySummaryItem>('/Summary', {
    page,
    pageSize,
    count: 0,
    name: query,
    selectedSearchFilter: 1,
    includeHistory: true,
  });

  return buildPaginatedResponse(items.map(normalizeCompany), page, pageSize);
}

export async function searchCompanyByEik(
  eik: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedSearchResponse<CompanySearchResult>> {
  const items = await fetchRegistryArray<RegistrySummaryItem>('/Summary', {
    page,
    pageSize,
    count: 0,
    name: '',
    ident: eik,
    selectedSearchFilter: 1,
    includeHistory: true,
  });

  return buildPaginatedResponse(items.map(normalizeCompany), page, pageSize);
}

export async function searchSubjectsByName(
  query: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedSearchResponse<SubjectSearchResult>> {
  const items = await fetchRegistryArray<RegistrySubjectItem>('/Subjects', {
    page,
    pageSize,
    count: 0,
    name: query,
    selectedSearchFilter: 0,
    includeHistory: false,
  });

  return buildPaginatedResponse(items.map(normalizeSubject), page, pageSize);
}

export async function getSubjectCompanies(uid: string, name: string): Promise<SubjectCompanyRelation[]> {
  const items = await fetchRegistryArray<RegistrySubjectCompanyItem>('/SubjectInFields', {
    uid,
    name,
    searchInHistory: false,
    type: 1,
  });

  return items.map(normalizeSubjectCompany);
}
