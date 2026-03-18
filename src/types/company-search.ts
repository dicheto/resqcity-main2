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

export type CompanyDetailField = {
  code: string;
  label: string;
  value: string;
  entryDate?: string;
};

export type CompanyDetails = {
  uic: string;
  companyName: string;
  fullName: string;
  legalForm?: number;
  deedStatus?: number;
  entryDate?: string;
  fields: CompanyDetailField[];
};

export type PaginatedSearchResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total?: number;
};

export type CompanySearchMode = 'company-name' | 'eik' | 'person';
