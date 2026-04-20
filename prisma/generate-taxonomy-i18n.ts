import { promises as fs } from 'fs';
import path from 'path';

type TaxonomySituation = {
  name: string;
  nameEn?: string;
  nameAr?: string;
  responsible_bodies?: string[];
};

type TaxonomySubcategory = {
  name: string;
  nameEn?: string;
  nameAr?: string;
  responsible_bodies?: string[];
  situations?: TaxonomySituation[];
};

type TaxonomyCategory = {
  name: string;
  nameEn?: string;
  nameAr?: string;
  icon?: string;
  category_responsible_bodies?: string[];
  subcategories?: TaxonomySubcategory[];
};

type TaxonomyFile = {
  metadata?: Record<string, unknown>;
  categories: TaxonomyCategory[];
};

const SOURCE_FILE = 'signal_routing_taxonomy_bg.json';
const TARGET_FILE = 'signal_routing_taxonomy_i18n.json';
const CACHE_FILE = path.join('prisma', 'taxonomy-translation-cache.json');

type Cache = Record<string, { en: string; ar: string }>;

async function translate(text: string, target: 'en' | 'ar'): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=bg&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation API failed (${response.status})`);
  }
  const data = (await response.json()) as any[];
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part: any[]) => part?.[0] || '').join('')
    : '';
  return translated || text;
}

async function readCache(cachePath: string): Promise<Cache> {
  try {
    const raw = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(raw) as Cache;
  } catch {
    return {};
  }
}

async function writeCache(cachePath: string, cache: Cache) {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

async function getTranslation(text: string, cache: Cache): Promise<{ en: string; ar: string }> {
  if (cache[text]) {
    return cache[text];
  }

  const en = await translate(text, 'en');
  const ar = await translate(text, 'ar');
  const value = { en, ar };
  cache[text] = value;
  return value;
}

function collectUniqueLabels(taxonomy: TaxonomyFile): string[] {
  const all = new Set<string>();
  for (const category of taxonomy.categories) {
    all.add(category.name);
    for (const subcategory of category.subcategories || []) {
      all.add(subcategory.name);
      for (const situation of subcategory.situations || []) {
        all.add(situation.name);
      }
    }
  }
  return [...all];
}

async function main() {
  const sourcePath = path.join(process.cwd(), SOURCE_FILE);
  const targetPath = path.join(process.cwd(), TARGET_FILE);
  const cachePath = path.join(process.cwd(), CACHE_FILE);

  const raw = await fs.readFile(sourcePath, 'utf8');
  const taxonomy = JSON.parse(raw) as TaxonomyFile;

  const cache = await readCache(cachePath);
  const labels = collectUniqueLabels(taxonomy);

  let processed = 0;
  for (const label of labels) {
    await getTranslation(label, cache);
    processed += 1;
    if (processed % 25 === 0) {
      await writeCache(cachePath, cache);
      console.log(`Translated ${processed}/${labels.length}`);
    }
  }
  await writeCache(cachePath, cache);

  const output: TaxonomyFile = {
    ...taxonomy,
    categories: taxonomy.categories.map((category) => {
      const categoryTranslation = cache[category.name] || { en: category.name, ar: category.name };
      return {
        ...category,
        nameEn: categoryTranslation.en,
        nameAr: categoryTranslation.ar,
        subcategories: (category.subcategories || []).map((subcategory) => {
          const subTranslation = cache[subcategory.name] || { en: subcategory.name, ar: subcategory.name };
          return {
            ...subcategory,
            nameEn: subTranslation.en,
            nameAr: subTranslation.ar,
            situations: (subcategory.situations || []).map((situation) => {
              const sitTranslation = cache[situation.name] || { en: situation.name, ar: situation.name };
              return {
                ...situation,
                nameEn: sitTranslation.en,
                nameAr: sitTranslation.ar,
              };
            }),
          };
        }),
      };
    }),
  };

  await fs.writeFile(targetPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Created ${TARGET_FILE} with full translations.`);
}

main().catch((error) => {
  console.error('Failed to generate i18n taxonomy:', error);
  process.exit(1);
});
