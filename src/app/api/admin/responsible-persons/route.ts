import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken as verifyJwtToken } from '@/hooks/lib/auth';
import { isAdminRole } from '@/hooks/lib/roles';

const prisma = new PrismaClient();

function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyJwtToken(token);

  if (!decoded || !isAdminRole(decoded.role)) {
    return null;
  }

  return decoded;
}

function normalizeSubcategoryNames(subcategoryNames: unknown): string[] {
  if (!Array.isArray(subcategoryNames)) {
    return [];
  }

  const unique = new Set<string>();
  for (const item of subcategoryNames) {
    if (typeof item !== 'string') {
      continue;
    }

    const trimmed = item.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return [...unique];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const categoryId = searchParams.get('categoryId');
    const active = searchParams.get('active');

    const where: any = {};
    if (district) where.district = district;
    if (categoryId) where.categoryId = categoryId;
    if (active === 'true') where.active = true;

    const persons = await prisma.responsiblePerson.findMany({
      where,
      include: {
        category: true,
        subcategoryAssignments: {
          select: {
            id: true,
            subcategoryName: true,
            categoryId: true,
          },
          orderBy: { subcategoryName: 'asc' },
        },
        _count: {
          select: { assignedReports: true },
        },
      },
      orderBy: [{ district: 'asc' }, { lastName: 'asc' }],
    });

    // Expose all institutions for full admin visibility, including inactive entries.
    const institutions = await prisma.institution.findMany({
      orderBy: { name: 'asc' },
      include: {
        categoryMappings: {
          include: {
            category: {
              select: {
                id: true,
                nameBg: true,
                icon: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ persons, institutions });
  } catch (error) {
    console.error('Error fetching responsible persons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responsible persons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, position, district, categoryId, subcategoryNames } = body;

    if (!firstName || !lastName || !email || !phone || !district || !categoryId) {
      return NextResponse.json(
        { error: 'All base fields are required' },
        { status: 400 }
      );
    }

    const normalizedSubcategoryNames = normalizeSubcategoryNames(subcategoryNames);

    const person = await prisma.responsiblePerson.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        position,
        district,
        categoryId,
        subcategoryAssignments:
          normalizedSubcategoryNames.length > 0
            ? {
                create: normalizedSubcategoryNames.map((subcategoryName) => ({
                  categoryId,
                  subcategoryName,
                })),
              }
            : undefined,
      },
      include: {
        category: true,
        subcategoryAssignments: {
          select: {
            id: true,
            subcategoryName: true,
            categoryId: true,
          },
          orderBy: { subcategoryName: 'asc' },
        },
      },
    });

    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    console.error('Error creating responsible person:', error);
    return NextResponse.json(
      { error: 'Failed to create responsible person' },
      { status: 500 }
    );
  }
}
