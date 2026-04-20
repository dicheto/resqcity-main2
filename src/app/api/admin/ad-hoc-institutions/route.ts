import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken as verifyJwtToken } from '@/hooks/lib/auth';
import { isAdminRole } from '@/hooks/lib/roles';
export const dynamic = 'force-dynamic';

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
    const { reportId, name, email, phone, contactPerson, address, notes } = body;

    if (!reportId || !name) {
      return NextResponse.json(
        { error: 'reportId and name are required' },
        { status: 400 }
      );
    }

    // Verify report exists
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Create ad-hoc institution
    const adHocInstitution = await prisma.adHocInstitution.create({
      data: {
        reportId,
        name,
        email,
        phone,
        contactPerson,
        address,
        notes,
      },
    });

    // Create routing target for this ad-hoc institution
    const routingTarget = await prisma.reportRoutingTarget.create({
      data: {
        reportId,
        adHocInstitutionId: adHocInstitution.id,
        recommendation: 'OTHER',
        included: true,
      },
    });

    return NextResponse.json(
      { institution: adHocInstitution, routingTarget },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating ad-hoc institution:', error);
    return NextResponse.json(
      { error: 'Failed to create ad-hoc institution' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId is required' },
        { status: 400 }
      );
    }

    const institutions = await prisma.adHocInstitution.findMany({
      where: { reportId },
      include: {
        routingTargets: true,
      },
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('Error fetching ad-hoc institutions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad-hoc institutions' },
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

    // Delete will cascade to routing targets
    const deleted = await prisma.adHocInstitution.delete({
      where: { id },
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error deleting ad-hoc institution:', error);
    return NextResponse.json(
      { error: 'Failed to delete ad-hoc institution' },
      { status: 500 }
    );
  }
}
