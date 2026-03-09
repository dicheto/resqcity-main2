import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { getAllReferencedInstitutions, loadSignalRoutingTaxonomy } from '@/hooks/lib/taxonomy';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const taxonomy = await loadSignalRoutingTaxonomy();
    const taxonomyCategoryNames = new Set(taxonomy.categories.map((category) => category.name));
    const taxonomyInstitutionNames = new Set(
      taxonomy.categories.flatMap((category) => getAllReferencedInstitutions(category))
    );

    // JSON е source of truth: първо деактивираме стари записи.
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

    // Премахваме стари category->institution връзки и ги изграждаме наново.
    await prisma.categoryInstitution.deleteMany({});

    let createdCategories = 0;
    let updatedCategories = 0;
    let createdInstitutions = 0;
    let createdMappings = 0;

    for (let index = 0; index < taxonomy.categories.length; index += 1) {
      const category = taxonomy.categories[index];
      const systemName = slugify(category.name) || `category_${index + 1}`;

      const existingCategory = await prisma.reportCategory.findFirst({
        where: {
          OR: [{ nameBg: category.name }, { name: systemName }],
        },
      });

      const dbCategory = existingCategory
        ? await prisma.reportCategory.update({
            where: { id: existingCategory.id },
            data: {
              name: existingCategory.name || systemName,
              nameBg: category.name,
              nameEn: existingCategory.nameEn || category.name,
              icon: category.icon || existingCategory.icon,
              active: true,
            },
          })
        : await prisma.reportCategory.create({
            data: {
              name: systemName,
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

      const institutions = getAllReferencedInstitutions(category);
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

        createdMappings += 1;
        await prisma.categoryInstitution.create({
          data: {
            categoryId: dbCategory.id,
            institutionId: institution.id,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Taxonomy synced successfully',
      summary: {
        totalTaxonomyCategories: taxonomy.categories.length,
        createdCategories,
        updatedCategories,
        createdInstitutions,
        createdMappings,
      },
    });
  } catch (error) {
    console.error('Taxonomy sync error:', error);
    return NextResponse.json({ error: 'Failed to sync taxonomy' }, { status: 500 });
  }
}
