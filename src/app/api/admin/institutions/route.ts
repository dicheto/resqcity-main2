import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const institutions = await prisma.institution.findMany({
      where: {
        active: true,
        ...(categoryId
          ? {
              categoryMappings: {
                some: {
                  categoryId,
                },
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        accountLinks: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                emailVerified: true,
              },
            },
          },
        },
        categoryMappings: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameBg: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('Institutions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { name, email, phone, notes, categoryIds, linkedUserIds, latitude, longitude } = body;

    if (!name) {
      return NextResponse.json({ error: 'Institution name is required' }, { status: 400 });
    }

    const institution = await prisma.institution.upsert({
      where: { name: name.trim() },
      update: {
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        active: true,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
      },
      create: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
      },
    });

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await prisma.categoryInstitution.upsert({
          where: {
            categoryId_institutionId: {
              categoryId,
              institutionId: institution.id,
            },
          },
          update: {},
          create: {
            categoryId,
            institutionId: institution.id,
          },
        });
      }
    }

    if (Array.isArray(linkedUserIds)) {
      await prisma.institutionAccount.deleteMany({ where: { institutionId: institution.id } });

      if (linkedUserIds.length > 0) {
        await prisma.institutionAccount.createMany({
          data: linkedUserIds.map((userId: string) => ({
            institutionId: institution.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ institution }, { status: 201 });
  } catch (error) {
    console.error('Institution create error:', error);
    return NextResponse.json({ error: 'Failed to save institution' }, { status: 500 });
  }
}
