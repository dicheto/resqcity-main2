import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { isAdminRole } from '@/hooks/lib/roles';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!isAdminRole(decoded.role)) {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
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
