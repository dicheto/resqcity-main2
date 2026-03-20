import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { loadSignalRoutingTaxonomy, getSituationInstitutions } from '@/hooks/lib/taxonomy';
import { sendReportCreatedEmail } from '@/hooks/lib/email';
import { getUserInstitutionIds } from '@/hooks/lib/institution-access';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status');
  const category = searchParams.get('category');

  const where: any = {};
  
  // Citizens can only see their own reports
  if (authResult.user.role === 'CITIZEN') {
    where.userId = authResult.user.userId;
  } else if (authResult.user.role === 'INSTITUTION') {
    const institutionIds = await getUserInstitutionIds(authResult.user.userId);

    if (institutionIds.length === 0) {
      return NextResponse.json({
        reports: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      });
    }

    where.routingTargets = {
      some: {
        included: true,
        institutionId: {
          in: institutionIds,
        },
      },
    };
  }

  if (status) {
    where.status = status;
  }

  if (category) {
    where.categoryId = category;
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        category: true,
        assignedTo: true,
        routingTargets: {
          include: {
            institution: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      categoryId,
      priority,
      isPublic,
      latitude,
      longitude,
      address,
      district,
      images,
      taxonomySubcategory,
      taxonomySituation,
    } = body;

    // Validate required fields
    if (!title || !description || !categoryId || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find responsible person for this category, district and (optionally) taxonomy subcategory.
    let assignedToId = null;
    if (district) {
      let responsiblePerson = null;

      if (typeof taxonomySubcategory === 'string' && taxonomySubcategory.trim()) {
        responsiblePerson = await prisma.responsiblePerson.findFirst({
          where: {
            categoryId,
            district,
            active: true,
            subcategoryAssignments: {
              some: {
                categoryId,
                subcategoryName: taxonomySubcategory.trim(),
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      if (!responsiblePerson) {
        responsiblePerson = await prisma.responsiblePerson.findFirst({
          where: {
            categoryId,
            district,
            active: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      if (responsiblePerson) {
        assignedToId = responsiblePerson.id;
      }
    }

    const reportCreateData: any = {
      title,
      description,
      categoryId,
      priority: priority || 'MEDIUM',
      latitude,
      longitude,
      address,
      district,
      images: images || [],
      taxonomySubcategory,
      taxonomySituation,
      userId: authResult.user.userId,
      assignedToId,
    };

    if (typeof isPublic !== 'undefined') {
      reportCreateData.isPublic = Boolean(isPublic);
    }

    const reportInclude = {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      category: true,
      assignedTo: true,
      routingTargets: {
        include: {
          institution: true,
        },
      },
    };

    let report;
    try {
      report = await prisma.report.create({
        data: reportCreateData,
        include: reportInclude,
      });
    } catch (createError) {
      // Backward compatibility for clients/schemas where Report.isPublic is not available.
      if (
        createError instanceof Error &&
        createError.message.includes('Unknown argument `isPublic`')
      ) {
        delete reportCreateData.isPublic;
        report = await prisma.report.create({
          data: reportCreateData,
          include: reportInclude,
        });
      } else {
        throw createError;
      }
    }

    const categoryDefaults = await prisma.categoryInstitution.findMany({
      where: { categoryId },
      select: { institutionId: true },
    });

    const targetInstitutionIds = new Set(categoryDefaults.map((item) => item.institutionId));

    try {
      const taxonomy = await loadSignalRoutingTaxonomy();
      const categoryData = taxonomy.categories.find(
        (item) => item.name === report.category.nameBg
      );

      if (categoryData) {
        const situationInstitutions = getSituationInstitutions(
          categoryData,
          taxonomySubcategory,
          taxonomySituation
        );

        if (situationInstitutions.length > 0) {
          const institutions = await prisma.institution.findMany({
            where: {
              name: {
                in: situationInstitutions,
              },
            },
            select: { id: true },
          });

          for (const institution of institutions) {
            targetInstitutionIds.add(institution.id);
          }
        }
      }
    } catch (taxonomyError) {
      console.warn('Taxonomy lookup failed while creating report routing targets:', taxonomyError);
    }

    for (const institutionId of targetInstitutionIds) {
      const existing = await prisma.reportRoutingTarget.findFirst({
        where: { reportId: report.id, institutionId },
      });
      if (existing) {
        await prisma.reportRoutingTarget.update({
          where: { id: existing.id },
          data: { included: true },
        });
      } else {
        await prisma.reportRoutingTarget.create({
          data: {
            reportId: report.id,
            institutionId,
            source: 'CATEGORY_DEFAULT',
            included: true,
          },
        });
      }
    }

    // Create history entry
    await prisma.reportHistory.create({
      data: {
        reportId: report.id,
        action: 'CREATED',
        newStatus: 'PENDING',
        description: assignedToId 
          ? `Report created and assigned to ${report.assignedTo?.firstName} ${report.assignedTo?.lastName}`
          : 'Report created',
      },
    });

    const hydratedReport = await prisma.report.findUnique({
      where: { id: report.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        category: true,
        assignedTo: true,
        routingTargets: {
          include: {
            institution: true,
          },
        },
      },
    });

    // Изпращане на имейл за създаден сигнал (неблокиращо)
    if (hydratedReport?.user?.email) {
      sendReportCreatedEmail(
        hydratedReport.user.email,
        hydratedReport.title,
        hydratedReport.id,
        hydratedReport.category?.nameBg || 'Сигнал'
      ).catch((err) => console.error('[Email] Report created:', err));
    }

    return NextResponse.json(hydratedReport, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
