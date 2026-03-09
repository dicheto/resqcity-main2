import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        category: {
          include: {
            institutionMappings: {
              include: {
                institution: true,
              },
            },
          },
        },
        routingTargets: {
          include: {
            institution: true,
          },
          orderBy: {
            institution: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        description: (report as any).description,
        images: (report as any).images || [],
        category: report.category,
        taxonomySubcategory: report.taxonomySubcategory,
        taxonomySituation: report.taxonomySituation,
      },
      routingTargets: report.routingTargets,
      categoryDefaultInstitutions: report.category.institutionMappings.map((mapping) => mapping.institution),
    });
  } catch (error) {
    console.error('Report routing fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch routing data' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { selectedInstitutionIds, notesByInstitutionId } = body;

    if (!Array.isArray(selectedInstitutionIds)) {
      return NextResponse.json(
        { error: 'selectedInstitutionIds must be an array' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({ where: { id: params.id } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const institutions = await prisma.institution.findMany({
      where: {
        id: { in: selectedInstitutionIds },
        active: true,
      },
      select: { id: true },
    });

    const validInstitutionIds = new Set(institutions.map((item) => item.id));

    const existingTargets = await prisma.reportRoutingTarget.findMany({
      where: { reportId: params.id },
      select: { id: true, institutionId: true },
    });

    for (const target of existingTargets) {
      const shouldInclude = target.institutionId ? validInstitutionIds.has(target.institutionId) : false;
      await prisma.reportRoutingTarget.update({
        where: { id: target.id },
        data: {
          included: shouldInclude,
          source: 'ADMIN_UPDATED',
          notes:
            target.institutionId && typeof notesByInstitutionId?.[target.institutionId] === 'string'
              ? notesByInstitutionId[target.institutionId]
              : null,
        },
      });
    }

    for (const institutionId of validInstitutionIds) {
      const exists = existingTargets.some((item) => item.institutionId === institutionId);
      if (!exists) {
        await prisma.reportRoutingTarget.create({
          data: {
            reportId: params.id,
            institutionId,
            included: true,
            source: 'ADMIN_UPDATED',
            notes:
              typeof notesByInstitutionId?.[institutionId] === 'string'
                ? notesByInstitutionId[institutionId]
                : null,
          },
        });
      }
    }

    await prisma.reportHistory.create({
      data: {
        reportId: params.id,
        action: 'ROUTING_UPDATED',
        description: `Routing institutions updated by ${authResult.user.email}`,
      },
    });

    const routingTargets = await prisma.reportRoutingTarget.findMany({
      where: { reportId: params.id },
      include: { institution: true },
      orderBy: {
        institution: {
          name: 'asc',
        },
      },
    });

    return NextResponse.json({ routingTargets });
  } catch (error) {
    console.error('Report routing update error:', error);
    return NextResponse.json({ error: 'Failed to update routing data' }, { status: 500 });
  }
}
