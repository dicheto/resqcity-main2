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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const person = await prisma.responsiblePerson.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        subcategoryAssignments: {
          select: {
            id: true,
            categoryId: true,
            subcategoryName: true,
          },
          orderBy: { subcategoryName: 'asc' },
        },
        _count: {
          select: { assignedReports: true },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Responsible person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error('Error fetching responsible person:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responsible person' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, position, district, categoryId, active, subcategoryNames } = body;

    const current = await prisma.responsiblePerson.findUnique({
      where: { id: params.id },
      select: { categoryId: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Responsible person not found' }, { status: 404 });
    }

    const effectiveCategoryId = categoryId || current.categoryId;

    const person = await prisma.responsiblePerson.update({
      where: { id: params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(position !== undefined && { position }),
        ...(district && { district }),
        ...(categoryId && { categoryId }),
        ...(active !== undefined && { active }),
      },
      include: {
        category: true,
      },
    });

    if (subcategoryNames !== undefined) {
      const normalizedSubcategoryNames = normalizeSubcategoryNames(subcategoryNames);

      await prisma.responsiblePersonSubcategory.deleteMany({
        where: { responsiblePersonId: params.id },
      });

      if (normalizedSubcategoryNames.length > 0) {
        await prisma.responsiblePersonSubcategory.createMany({
          data: normalizedSubcategoryNames.map((subcategoryName) => ({
            responsiblePersonId: params.id,
            categoryId: effectiveCategoryId,
            subcategoryName,
          })),
          skipDuplicates: true,
        });
      }
    }

    const withAssignments = await prisma.responsiblePerson.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        subcategoryAssignments: {
          select: {
            id: true,
            categoryId: true,
            subcategoryName: true,
          },
          orderBy: { subcategoryName: 'asc' },
        },
      },
    });

    return NextResponse.json({ person: withAssignments || person });
  } catch (error) {
    console.error('Error updating responsible person:', error);
    return NextResponse.json(
      { error: 'Failed to update responsible person' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete will cascade to:
    // - subcategoryAssignments (via onDelete: Cascade in schema)
    const deleted = await prisma.responsiblePerson.delete({
      where: { id: params.id },
    });

    // Clear assignments from reports that were assigned to this person
    // This sets assignedToId to NULL
    await prisma.report.updateMany({
      where: { assignedToId: params.id },
      data: { assignedToId: null },
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error deleting responsible person:', error);
    return NextResponse.json(
      { error: 'Failed to delete responsible person' },
      { status: 500 }
    );
  }
}
