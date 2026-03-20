import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';
import {
  buildInboundCommentBody,
  detectReportStatusFromText,
  extractReportIdFromText,
  normalizeInboundStatus,
  normalizeEmail,
  storeInboundAttachments,
  type InboundEmailPayload,
} from '@/hooks/lib/inbound-email';
import {
  sendSignalStatusChangedEmail,
  sendInboundEmailProcessingConfirmation,
} from '@/hooks/lib/email';

function safeEqual(secret: string, candidate: string): boolean {
  const left = Buffer.from(secret);
  const right = Buffer.from(candidate);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function collectAllowedSenderEmails(report: {
  user: { email: string } | null;
  assignedTo: { email: string } | null;
  routingTargets: Array<{
    institution: { email: string | null } | null;
    adHocInstitution: { email: string | null } | null;
    customizations: Array<{ customEmail: string | null }>;
  }>;
}): Set<string> {
  const allowed = new Set<string>();

  if (report.user?.email) {
    allowed.add(normalizeEmail(report.user.email));
  }

  if (report.assignedTo?.email) {
    allowed.add(normalizeEmail(report.assignedTo.email));
  }

  for (const target of report.routingTargets) {
    if (target.institution?.email) {
      allowed.add(normalizeEmail(target.institution.email));
    }

    if (target.adHocInstitution?.email) {
      allowed.add(normalizeEmail(target.adHocInstitution.email));
    }

    for (const customization of target.customizations) {
      if (customization.customEmail) {
        allowed.add(normalizeEmail(customization.customEmail));
      }
    }
  }

  allowed.delete('');
  return allowed;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.INBOUND_EMAIL_AUTH_TOKEN;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'INBOUND_EMAIL_AUTH_TOKEN is not configured' },
      { status: 500 }
    );
  }

  let payload: InboundEmailPayload;
  try {
    payload = (await request.json()) as InboundEmailPayload;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  try {
    const tokenFromHeader = request.headers.get('x-inbound-email-token') || '';
    const tokenFromBody = payload.authToken || '';
    const tokenToCheck = tokenFromHeader || tokenFromBody;

    if (!tokenToCheck || !safeEqual(configuredSecret, tokenToCheck)) {
      return NextResponse.json({ error: 'Unauthorized inbound request' }, { status: 401 });
    }

    const senderEmail = normalizeEmail(payload.from);
    if (!senderEmail || !senderEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid sender email' }, { status: 400 });
    }

    const extractedReportId = payload.reportId || extractReportIdFromText(payload.subject, payload.text, payload.html);
    if (!extractedReportId) {
      return NextResponse.json(
        { error: 'Cannot resolve signal id. Use #ID-<signal-id> in subject/body or provide reportId.' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: extractedReportId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        assignedTo: {
          select: {
            email: true,
          },
        },
        routingTargets: {
          where: { included: true },
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
                reportId: extractedReportId,
              },
              select: {
                customEmail: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    const allowedSenders = collectAllowedSenderEmails(report);
    if (!allowedSenders.has(senderEmail)) {
      return NextResponse.json(
        {
          error: 'Sender is not authorized for this signal',
          sender: senderEmail,
        },
        { status: 403 }
      );
    }

    const attachments = payload.attachments || [];
    const storedAttachments = await storeInboundAttachments(report.id, attachments);

    const explicitStatus = normalizeInboundStatus(payload.status);
    const inferredStatus = explicitStatus || detectReportStatusFromText(payload.updateNote, payload.subject, payload.text, payload.html);
    const shouldChangeStatus = Boolean(inferredStatus && inferredStatus !== report.status);

    const commentBody = buildInboundCommentBody(payload, storedAttachments);

    const updatedReport = await prisma.$transaction(async (tx: any) => {
      const senderUser = await tx.user.findUnique({
        where: { email: senderEmail },
        select: { id: true },
      });

      let current = report;

      if (shouldChangeStatus && inferredStatus) {
        current = await tx.report.update({
          where: { id: report.id },
          data: { status: inferredStatus },
          include: {
            user: { select: { email: true } },
            assignedTo: { select: { email: true } },
            routingTargets: {
              where: { included: true },
              include: {
                institution: { select: { email: true } },
                adHocInstitution: { select: { email: true } },
                customizations: {
                  where: { reportId: report.id },
                  select: { customEmail: true },
                },
              },
            },
          },
        });

        await tx.reportHistory.create({
          data: {
            reportId: report.id,
            action: 'STATUS_CHANGED_BY_EMAIL',
            oldStatus: report.status,
            newStatus: inferredStatus,
            description: `Status changed by inbound email from ${senderEmail}`,
          },
        });
      }

      if (storedAttachments.length > 0) {
        await tx.report.update({
          where: { id: report.id },
          data: {
            images: {
              push: storedAttachments.map((item) => item.publicPath),
            },
          },
        });
      }

      await tx.comment.create({
        data: {
          reportId: report.id,
          userId: senderUser?.id || report.userId,
          content: commentBody,
        },
      });

      await tx.reportHistory.create({
        data: {
          reportId: report.id,
          action: 'INBOUND_EMAIL_RECEIVED',
          oldStatus: shouldChangeStatus ? report.status : null,
          newStatus: shouldChangeStatus ? inferredStatus : null,
          description: `Inbound email processed from ${senderEmail}${storedAttachments.length ? ` with ${storedAttachments.length} attachment(s)` : ''}`,
        },
      });

      return current;
    });

    if (shouldChangeStatus && inferredStatus && report.user?.email) {
      await sendSignalStatusChangedEmail({
        email: report.user.email,
        signalTitle: report.title,
        signalId: report.id,
        signalTypeLabel: 'сигнал',
        oldStatus: report.status,
        newStatus: inferredStatus,
        details: `Промяната е получена по имейл от ${senderEmail}`,
        linkPath: `/dashboard/reports/${report.id}`,
      });
    }

    // Send confirmation email to the institution sender
    if (senderEmail) {
      try {
        await sendInboundEmailProcessingConfirmation({
          to: senderEmail,
          institutionName: 'Уважаема организация',
          reportId: report.id,
          reportTitle: report.title,
          oldStatus: report.status,
          newStatus: shouldChangeStatus && inferredStatus ? inferredStatus : undefined,
          updateNote: payload.updateNote,
          success: true,
        });
      } catch (emailError) {
        console.error('Failed to send institution confirmation email:', emailError);
        // Don't throw - this is not critical
      }
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      sender: senderEmail,
      statusChanged: shouldChangeStatus,
      oldStatus: report.status,
      newStatus: shouldChangeStatus ? inferredStatus : report.status,
      attachmentsStored: storedAttachments.length,
      resolvedReportStatus: updatedReport.status,
    });
  } catch (error) {
    console.error('Inbound email processing error:', error);

    // Try to extract sender email and reportId for error notification
    let senderEmail = '';
    let reportId = '';
    try {
      senderEmail = normalizeEmail(payload.from) || '';
      reportId = payload.reportId || extractReportIdFromText(payload.subject, payload.text, payload.html) || '';
    } catch {
      // If we can't extract sender info, just continue without notification
    }

    // Send error notification to institution if we have their email
    if (senderEmail) {
      try {
        await sendInboundEmailProcessingConfirmation({
          to: senderEmail,
          institutionName: 'Уважаема организация',
          reportId: reportId || 'unknown',
          reportTitle: 'Unknown Report',
          oldStatus: 'unknown',
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (emailError) {
        console.error('Failed to send error notification to institution:', emailError);
        // Don't throw - this is not critical
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to process inbound email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}