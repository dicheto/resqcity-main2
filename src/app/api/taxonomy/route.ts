import { NextResponse } from 'next/server';
import { loadSignalRoutingTaxonomy } from '@/hooks/lib/taxonomy';
import { prisma } from '@/hooks/lib/prisma';

export async function GET() {
  try {
    const dbCategories = await prisma.taxonomyCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            situations: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (dbCategories.length > 0) {
      return NextResponse.json({
        categories: dbCategories.map((category) => ({
          name: category.nameBg,
          nameBg: category.nameBg,
          nameEn: category.nameEn,
          nameAr: category.nameAr,
          icon: category.icon,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.nameBg,
            nameBg: subcategory.nameBg,
            nameEn: subcategory.nameEn,
            nameAr: subcategory.nameAr,
            situations: subcategory.situations.map((situation) => ({
              name: situation.nameBg,
              nameBg: situation.nameBg,
              nameEn: situation.nameEn,
              nameAr: situation.nameAr,
            })),
          })),
        })),
      });
    }

    const taxonomy = await loadSignalRoutingTaxonomy();
    return NextResponse.json({
      categories: (taxonomy.categories || []).map((category) => ({
        ...category,
        nameBg: category.name,
        nameEn: category.name,
        nameAr: category.name,
        subcategories: (category.subcategories || []).map((subcategory) => ({
          ...subcategory,
          nameBg: subcategory.name,
          nameEn: subcategory.name,
          nameAr: subcategory.name,
          situations: (subcategory.situations || []).map((situation) => ({
            ...situation,
            nameBg: situation.name,
            nameEn: situation.name,
            nameAr: situation.name,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error('Taxonomy fetch error:', error);
    return NextResponse.json({ error: 'Failed to load taxonomy' }, { status: 500 });
  }
}
