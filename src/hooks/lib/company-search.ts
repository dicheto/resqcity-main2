import axios from 'axios';
import type {
  CompanyDetails,
  CompanyDetailField,
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

type RegistryDetailField = {
  nameCode?: string;
  htmlData?: string;
  fieldEntryDate?: string;
};

type RegistryDeedDetail = {
  deedStatus?: number;
  companyName?: string;
  uic?: string;
  legalForm?: number;
  entryDate?: string;
  fullName?: string;
  sections?: Array<{
    subDeeds?: Array<{
      groups?: Array<{
        fields?: RegistryDetailField[];
      }>;
    }>;
  }>;
};

const FIELD_LABELS: Record<string, string> = {
  CR_F_1_L: 'ЕИК/ПИК',
  CR_F_2_L: 'Фирма/Наименование',
  CR_F_3_L: 'Правна форма',
  CR_F_4_L: 'Изписване на чужд език',
  CR_F_5_L: 'Седалище и адрес на управление',
  CR_F_6_L: 'Предмет на дейност',
  CR_F_6a_L: 'Основна дейност по НКИД',
  CR_F_7_L: 'Управители',
  CR_F_11_L: 'Начин на представляване',
  CR_F_19_L: 'Съдружници',
  CR_F_23_L: 'Едноличен собственик на капитала',
  CR_F_24_L: 'Прехвърляне на дружествен дял',
  CR_F_31_L: 'Размер',
  CR_F_32_L: 'Внесен капитал',
  CR_F_1001_L: 'Описание на обявения акт',
  CR_F_406_L: 'Описание',
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

async function fetchRegistryDetail(path: string, params: Record<string, string | number | boolean>): Promise<RegistryDeedDetail> {
  const request = async () => {
    const response = await axios.get<RegistryDeedDetail>(`${REGISTRY_BASE_URL}${path}`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      validateStatus: (status: number) => status >= 200 && status < 500,
    });

    if (response.status >= 400) {
      throw new Error(`Registry details request failed with status ${response.status}`);
    }

    return response.data || {};
  };

  try {
    return await request();
  } catch (error) {
    // Single retry for transient failures to keep serverless execution predictable.
    return request();
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*hr[^>]*>/gi, '\n----------------\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeDetailField(field: RegistryDetailField): CompanyDetailField | null {
  const code = String(field.nameCode ?? '').trim();
  const html = String(field.htmlData ?? '').trim();
  const value = stripHtml(html);

  if (!code || !value) {
    return null;
  }

  return {
    code,
    label: FIELD_LABELS[code] || code,
    value,
    entryDate: field.fieldEntryDate,
  };
}

function normalizeCompanyDetails(detail: RegistryDeedDetail): CompanyDetails {
  const fields: CompanyDetailField[] = [];

  for (const section of detail.sections || []) {
    for (const subDeed of section.subDeeds || []) {
      for (const group of subDeed.groups || []) {
        for (const field of group.fields || []) {
          const normalized = normalizeDetailField(field);
          if (normalized) {
            fields.push(normalized);
          }
        }
      }
    }
  }

  const uniqueFields: CompanyDetailField[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    const key = `${field.code}:${field.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFields.push(field);
    }
  }

  return {
    uic: String(detail.uic ?? '').trim(),
    companyName: String(detail.companyName ?? '').trim(),
    fullName: String(detail.fullName ?? detail.companyName ?? '').trim(),
    legalForm: detail.legalForm,
    deedStatus: detail.deedStatus,
    entryDate: detail.entryDate,
    fields: uniqueFields,
  };
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

export async function getCompanyDetails(uic: string, entryDate?: string): Promise<CompanyDetails> {
  const effectiveEntryDate = entryDate || `${new Date().toISOString().split('T')[0]}T21:59:59.999Z`;
  const detail = await fetchRegistryDetail(`/${encodeURIComponent(uic)}`, {
    entryDate: effectiveEntryDate,
    loadFieldsFromAllLegalForms: false,
  });

  return normalizeCompanyDetails(detail);
}
