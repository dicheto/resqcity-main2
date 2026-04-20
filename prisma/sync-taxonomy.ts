import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { getCategoryTranslations, getNodeTranslations } from './taxonomy-translations';

const prisma = new PrismaClient();

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function collectCategoryInstitutions(category: TaxonomyCategory): string[] {
  const institutions = new Set<string>();

  for (const body of category.category_responsible_bodies ?? []) {
    const normalized = body.trim();
    if (normalized) {
      institutions.add(normalized);
    }
  }

  for (const subcategory of category.subcategories ?? []) {
    for (const body of subcategory.responsible_bodies ?? []) {
      const normalized = body.trim();
      if (normalized) {
        institutions.add(normalized);
      }
    }

    for (const situation of subcategory.situations ?? []) {
      for (const body of situation.responsible_bodies ?? []) {
        const normalized = body.trim();
        if (normalized) {
          institutions.add(normalized);
        }
      }
    }
  }

  return [...institutions];
}

async function main() {
  const i18nTaxonomyPath = path.join(process.cwd(), 'signal_routing_taxonomy_i18n.json');
  const fallbackTaxonomyPath = path.join(process.cwd(), 'signal_routing_taxonomy_bg.json');
  const taxonomyPath = await fs
    .access(i18nTaxonomyPath)
    .then(() => i18nTaxonomyPath)
    .catch(() => fallbackTaxonomyPath);
  const raw = await fs.readFile(taxonomyPath, 'utf8');
  const taxonomy = JSON.parse(raw) as TaxonomyFile;

  const taxonomyCategoryNames = new Set(taxonomy.categories.map((category) => category.name));
  const taxonomyInstitutionNames = new Set(
    taxonomy.categories.flatMap((category) => collectCategoryInstitutions(category))
  );

  await prisma.reportCategory.updateMany({
    where: {
      nameBg: {
        notIn: [...taxonomyCategoryNames],
      },
    },
    data: { active: false },
  });

  await prisma.institution.updateMany({
    where: {
      name: {
        notIn: [...taxonomyInstitutionNames],
      },
    },
    data: { active: false },
  });

  await prisma.categoryInstitution.deleteMany({});

  let createdCategories = 0;
  let updatedCategories = 0;
  let createdInstitutions = 0;
  let createdMappings = 0;
  let syncedTaxonomyCategories = 0;
  let syncedTaxonomySubcategories = 0;
  let syncedTaxonomySituations = 0;
  const taxonomyCategoryModel = (prisma as any).taxonomyCategory;
  const taxonomySubcategoryModel = (prisma as any).taxonomySubcategory;
  const taxonomySituationModel = (prisma as any).taxonomySituation;
  const hasTaxonomyTables =
    typeof taxonomyCategoryModel?.upsert === 'function' &&
    typeof taxonomySubcategoryModel?.upsert === 'function' &&
    typeof taxonomySituationModel?.upsert === 'function';

  if (!hasTaxonomyTables) {
    console.warn(
      'Taxonomy i18n models are not available in Prisma Client. Run `npx prisma generate` and apply migrations, then rerun sync.'
    );
  }

  const totalCategories = taxonomy.categories.length;
  const totalSubcategories = taxonomy.categories.reduce(
    (count, category) => count + (category.subcategories?.length ?? 0),
    0
  );
  const totalSituations = taxonomy.categories.reduce(
    (count, category) =>
      count +
      (category.subcategories?.reduce((subCount, sub) => subCount + (sub.situations?.length ?? 0), 0) ?? 0),
    0
  );

  console.log(
    `Taxonomy workload: ${totalCategories} categories, ${totalSubcategories} subcategories, ${totalSituations} situations`
  );

  for (let index = 0; index < taxonomy.categories.length; index += 1) {
    const category = taxonomy.categories[index];
    console.log(`[${index + 1}/${totalCategories}] Processing category: ${category.name}`);
    const generatedName = slugify(category.name) || `taxonomy_category_${index + 1}`;
    const categoryTranslations = {
      en: category.nameEn || getCategoryTranslations(category.name).en,
      ar: category.nameAr || getCategoryTranslations(category.name).ar,
    };

    const existingCategory = await prisma.reportCategory.findFirst({
      where: {
        OR: [{ nameBg: category.name }, { name: generatedName }],
      },
    });

    const dbCategory = existingCategory
      ? await prisma.reportCategory.update({
          where: { id: existingCategory.id },
          data: {
            name: existingCategory.name || generatedName,
            nameBg: category.name,
            nameEn: categoryTranslations.en,
            icon: category.icon || existingCategory.icon,
            active: true,
          },
        })
      : await prisma.reportCategory.create({
          data: {
            name: generatedName,
            nameBg: category.name,
            nameEn: categoryTranslations.en,
            icon: category.icon,
            active: true,
          },
        });

    if (existingCategory) {
      updatedCategories += 1;
    } else {
      createdCategories += 1;
    }

    if (hasTaxonomyTables) {
      const taxonomyCategory = await taxonomyCategoryModel.upsert({
        where: { key: generatedName },
        update: {
          nameBg: category.name,
          nameEn: categoryTranslations.en,
          nameAr: categoryTranslations.ar,
          icon: category.icon || null,
          active: true,
          sortOrder: index,
          reportCategoryId: dbCategory.id,
        },
        create: {
          key: generatedName,
          nameBg: category.name,
          nameEn: categoryTranslations.en,
          nameAr: categoryTranslations.ar,
          icon: category.icon || null,
          active: true,
          sortOrder: index,
          reportCategoryId: dbCategory.id,
        },
      });
      syncedTaxonomyCategories += 1;

      for (let subIndex = 0; subIndex < (category.subcategories || []).length; subIndex += 1) {
        const subcategory = category.subcategories![subIndex];
        const subKey = `${generatedName}__${slugify(subcategory.name) || `subcategory_${subIndex + 1}`}`;
        const subTranslations = {
          en: subcategory.nameEn || getNodeTranslations(subcategory.name).en,
          ar: subcategory.nameAr || getNodeTranslations(subcategory.name).ar,
        };

        const taxonomySubcategory = await taxonomySubcategoryModel.upsert({
          where: { key: subKey },
          update: {
            nameBg: subcategory.name,
            nameEn: subTranslations.en,
            nameAr: subTranslations.ar,
            active: true,
            sortOrder: subIndex,
            categoryId: taxonomyCategory.id,
          },
          create: {
            key: subKey,
            nameBg: subcategory.name,
            nameEn: subTranslations.en,
            nameAr: subTranslations.ar,
            active: true,
            sortOrder: subIndex,
            categoryId: taxonomyCategory.id,
          },
        });
        syncedTaxonomySubcategories += 1;
        if ((subIndex + 1) % 5 === 0 || subIndex + 1 === (category.subcategories || []).length) {
          console.log(
            `   Subcategories: ${subIndex + 1}/${(category.subcategories || []).length} for "${category.name}"`
          );
        }

        for (let sitIndex = 0; sitIndex < (subcategory.situations || []).length; sitIndex += 1) {
          const situation = subcategory.situations![sitIndex];
          const situationKey = `${subKey}__${slugify(situation.name) || `situation_${sitIndex + 1}`}`;
          const situationTranslations = {
            en: situation.nameEn || getNodeTranslations(situation.name).en,
            ar: situation.nameAr || getNodeTranslations(situation.name).ar,
          };

          await taxonomySituationModel.upsert({
            where: { key: situationKey },
            update: {
              nameBg: situation.name,
              nameEn: situationTranslations.en,
              nameAr: situationTranslations.ar,
              active: true,
              sortOrder: sitIndex,
              subcategoryId: taxonomySubcategory.id,
            },
            create: {
              key: situationKey,
              nameBg: situation.name,
              nameEn: situationTranslations.en,
              nameAr: situationTranslations.ar,
              active: true,
              sortOrder: sitIndex,
              subcategoryId: taxonomySubcategory.id,
            },
          });
          syncedTaxonomySituations += 1;
        }
      }
    }

    const institutions = collectCategoryInstitutions(category);
    for (const institutionName of institutions) {
      const existingInstitution = await prisma.institution.findUnique({
        where: { name: institutionName },
      });

      const institution = existingInstitution
        ? await prisma.institution.update({
            where: { id: existingInstitution.id },
            data: { active: true },
          })
        : await prisma.institution.create({
            data: { name: institutionName, active: true },
          });

      if (!existingInstitution) {
        createdInstitutions += 1;
      }

      await prisma.categoryInstitution.create({
        data: {
          categoryId: dbCategory.id,
          institutionId: institution.id,
        },
      });
      createdMappings += 1;
    }
    console.log(
      `Category done [${index + 1}/${totalCategories}] | mappings so far: ${createdMappings}, taxonomy rows: C:${syncedTaxonomyCategories} S:${syncedTaxonomySubcategories} I:${syncedTaxonomySituations}`
    );
  }

  console.log('Taxonomy sync completed.');
  console.log(`Categories: +${createdCategories} created, ${updatedCategories} updated`);
  console.log(`Institutions: +${createdInstitutions} created`);
  console.log(`Mappings: +${createdMappings} created`);
  console.log(`Taxonomy categories synced: ${syncedTaxonomyCategories}`);
  console.log(`Taxonomy subcategories synced: ${syncedTaxonomySubcategories}`);
  console.log(`Taxonomy situations synced: ${syncedTaxonomySituations}`);
}

main()
  .catch((error) => {
    console.error('Taxonomy sync failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
