import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { notifyReportUpdate } from '@/hooks/lib/websocket';
import { sendSignalStatusChangedEmail } from '@/hooks/lib/email';

function collectUniqueEmails(values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      continue;
    }

    unique.add(normalized);
  }

  return Array.from(unique);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
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
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Citizens can only view their own reports
    if (
      authResult.user.role === 'CITIZEN' &&
      report.userId !== authResult.user.userId
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    const { status, priority, assignedToId, note } = body;

    const currentReport = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
          },
        },
        category: true,
        routingTargets: {
          where: {
            included: true,
          },
          include: {
            institution: {
              select: {
                email: true,
              },
            },
            adHocInstitution: {
              select: {
                email: true,
              },
            },
            customizations: {
              where: {
                reportId: params.id,
              },
              select: {
                customEmail: true,
              },
            },
          },
        },
      },
    });

    if (!currentReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const updatedReport = await prisma.report.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedToId && { assignedToId }),
      },
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
      },
    });

    // Create history entry if status changed
    if (status && status !== currentReport.status) {
      await prisma.reportHistory.create({
        data: {
          reportId: params.id,
          action: 'STATUS_CHANGED',
          oldStatus: currentReport.status,
          newStatus: status,
          description: note || `Status changed from ${currentReport.status} to ${status}`,
        },
      });

      // Add comment if note is provided
      if (note) {
        await prisma.comment.create({
          data: {
            reportId: params.id,
            userId: authResult.user.userId,
            content: note,
          },
        });
      }

      // Send WebSocket notification to admin room
      const statusLabels: Record<string, string> = {
        PENDING: 'Изчакване',
        IN_REVIEW: 'На преглед',
        IN_PROGRESS: 'В процес',
        RESOLVED: 'Решен',
        REJECTED: 'Отхвърлен',
      };

      notifyReportUpdate(params.id, {
        reportId: params.id,
        title: updatedReport.title,
        oldStatus: currentReport.status,
        newStatus: status,
        statusLabel: statusLabels[status] || status,
        note: note || null,
        updatedBy: authResult.user.email,
        category: updatedReport.category?.nameBg || 'Без категория',
        timestamp: new Date().toISOString(),
      });

      const recipientEmails = collectUniqueEmails([
        currentReport.user?.email,
        currentReport.assignedTo?.email,
        ...currentReport.routingTargets.flatMap((target) => {
          const customEmail = target.customizations[0]?.customEmail;

          if (customEmail) {
            return [customEmail];
          }

          return [target.institution?.email, target.adHocInstitution?.email];
        }),
      ]);

      await Promise.allSettled(
        recipientEmails.map((email) =>
          sendSignalStatusChangedEmail({
            email,
            signalTitle: updatedReport.title,
            signalId: params.id,
            signalTypeLabel: 'сигнал',
            oldStatus: currentReport.status,
            newStatus: status,
            details: note || undefined,
            linkPath: `/dashboard/reports/${params.id}`,
          })
        )
      );
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    await prisma.report.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
