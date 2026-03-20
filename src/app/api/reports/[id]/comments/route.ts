import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { sendReportCommentEmail } from '@/hooks/lib/email';
import { canInstitutionAccessReport } from '@/hooks/lib/institution-access';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (authResult.user.role === 'CITIZEN' && report.userId !== authResult.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (authResult.user.role === 'INSTITUTION') {
      const canAccess = await canInstitutionAccessReport(authResult.user.userId, params.id);
      if (!canAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        reportId: params.id,
        userId: authResult.user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Уведомяване на автора на сигнала, когато някой друг добави коментар
    if (
      report?.user?.email &&
      report.user.id !== authResult.user.userId
    ) {
      const commenterName =
        `${authResult.user.firstName || ''} ${authResult.user.lastName || ''}`.trim() ||
        authResult.user.email;
      sendReportCommentEmail(
        report.user.email,
        report.title || 'Сигнал',
        params.id,
        commenterName,
        content
      ).catch((err) => console.error('[Email] Report comment:', err));
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
