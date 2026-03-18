export type CompanySearchResult = {
  ident: string;
  name: string;
  companyFullName: string;
  isPhysical: boolean;
};

export type SubjectSearchResult = {
  ident: string; // opaque uid token
  name: string;
  isPhysical: boolean;
};

export type SubjectCompanyRelation = {
  companyFullName: string;
  uic: string;
  fieldName: string;
};

export type PaginatedSearchResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total?: number;
};

export type CompanySearchMode = 'company-name' | 'eik' | 'person';
