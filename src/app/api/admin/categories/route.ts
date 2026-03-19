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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const where = active === 'true' ? { active: true } : {};

    const categories = await prisma.reportCategory.findMany({
      where,
      include: {
        institutionMappings: {
          include: {
            institution: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
        _count: {
          select: {
            reports: true,
            responsiblePersons: true,
          },
        },
      },
      orderBy: { nameBg: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    const { name, nameEn, nameBg, description, icon, color } = body;

    if (!name || !nameEn || !nameBg) {
      return NextResponse.json(
        { error: 'Name, nameEn, and nameBg are required' },
        { status: 400 }
      );
    }

    const category = await prisma.reportCategory.create({
      data: {
        name,
        nameEn,
        nameBg,
        description,
        icon,
        color,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
