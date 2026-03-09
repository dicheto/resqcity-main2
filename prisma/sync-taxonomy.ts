import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface TaxonomySituation {
  name: string;
  responsible_bodies?: string[];
}

interface TaxonomySubcategory {
  name: string;
  responsible_bodies?: string[];
  situations?: TaxonomySituation[];
}

interface TaxonomyCategory {
  name: string;
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
  const taxonomyPath = path.join(process.cwd(), 'signal_routing_taxonomy_bg.json');
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

  for (let index = 0; index < taxonomy.categories.length; index += 1) {
    const category = taxonomy.categories[index];
    const generatedName = slugify(category.name) || `taxonomy_category_${index + 1}`;

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
            nameEn: existingCategory.nameEn || category.name,
            icon: category.icon || existingCategory.icon,
            active: true,
          },
        })
      : await prisma.reportCategory.create({
          data: {
            name: generatedName,
            nameBg: category.name,
            nameEn: category.name,
            icon: category.icon,
            active: true,
          },
        });

    if (existingCategory) {
      updatedCategories += 1;
    } else {
      createdCategories += 1;
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
  }

  console.log('Taxonomy sync completed.');
  console.log(`Categories: +${createdCategories} created, ${updatedCategories} updated`);
  console.log(`Institutions: +${createdInstitutions} created`);
  console.log(`Mappings: +${createdMappings} created`);
}

main()
  .catch((error) => {
    console.error('Taxonomy sync failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
