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

export async function POST(request: NextRequest) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, institutionId, adHocInstitutionId, recommendation } = body;

    if (!reportId || (!institutionId && !adHocInstitutionId)) {
      return NextResponse.json(
        { error: 'reportId and either institutionId or adHocInstitutionId are required' },
        { status: 400 }
      );
    }

    const routingTarget = await prisma.reportRoutingTarget.create({
      data: {
        reportId,
        institutionId: institutionId || null,
        adHocInstitutionId: adHocInstitutionId || null,
        recommendation: recommendation || 'OTHER',
        included: true,
      },
    });

    return NextResponse.json(routingTarget, { status: 201 });
  } catch (error) {
    console.error('Error creating routing target:', error);
    return NextResponse.json(
      { error: 'Failed to create routing target' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = await prisma.reportRoutingTarget.delete({
      where: { id },
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error deleting routing target:', error);
    return NextResponse.json(
      { error: 'Failed to delete routing target' },
      { status: 500 }
    );
  }
}
