import { promises as fs } from 'fs';
import path from 'path';

interface TaxonomySituation {
  name: string;
  nameEn?: string;
  nameAr?: string;
  responsible_bodies?: string[];
}

interface TaxonomySubcategory {
  name: string;
  nameEn?: string;
  nameAr?: string;
  responsible_bodies?: string[];
  situations?: TaxonomySituation[];
}

interface TaxonomyCategory {
  name: string;
  nameEn?: string;
  nameAr?: string;
  icon?: string;
  category_responsible_bodies?: string[];
  subcategories?: TaxonomySubcategory[];
}

interface TaxonomyFile {
  categories: TaxonomyCategory[];
}

const I18N_TAXONOMY_FILE_NAME = 'signal_routing_taxonomy_i18n.json';
const FALLBACK_TAXONOMY_FILE_NAME = 'signal_routing_taxonomy_bg.json';

export async function loadSignalRoutingTaxonomy(): Promise<TaxonomyFile> {
  const i18nTaxonomyPath = path.join(process.cwd(), I18N_TAXONOMY_FILE_NAME);
  const fallbackTaxonomyPath = path.join(process.cwd(), FALLBACK_TAXONOMY_FILE_NAME);
  const taxonomyPath = await fs
    .access(i18nTaxonomyPath)
    .then(() => i18nTaxonomyPath)
    .catch(() => fallbackTaxonomyPath);
  const raw = await fs.readFile(taxonomyPath, 'utf8');
  return JSON.parse(raw) as TaxonomyFile;
}

function addBodies(target: Set<string>, bodies?: string[]) {
  for (const body of bodies ?? []) {
    const normalized = body.trim();
    if (normalized) {
      target.add(normalized);
    }
  }
}

export function getCategoryInstitutions(category: TaxonomyCategory): string[] {
  const set = new Set<string>();

  addBodies(set, category.category_responsible_bodies);

  return [...set];
}

export function getAllReferencedInstitutions(category: TaxonomyCategory): string[] {
  const set = new Set<string>();

  addBodies(set, category.category_responsible_bodies);

  for (const subcategory of category.subcategories ?? []) {
    addBodies(set, subcategory.responsible_bodies);
    for (const situation of subcategory.situations ?? []) {
      addBodies(set, situation.responsible_bodies);
    }
  }

  return [...set];
}

export function getSituationInstitutions(
  category: TaxonomyCategory,
  subcategoryName?: string,
  situationName?: string
): string[] {
  const set = new Set<string>();

  addBodies(set, category.category_responsible_bodies);

  const subcategory = (category.subcategories ?? []).find((item) => item.name === subcategoryName);
  if (!subcategory) {
    return [...set];
  }

  addBodies(set, subcategory.responsible_bodies);

  const situation = (subcategory.situations ?? []).find((item) => item.name === situationName);
  addBodies(set, situation?.responsible_bodies);

  return [...set];
}
