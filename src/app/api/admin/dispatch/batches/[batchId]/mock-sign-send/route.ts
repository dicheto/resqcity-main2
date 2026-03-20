import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { sendEmail } from '@/hooks/lib/email';
import { readDispatchDocument, uploadDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

interface RouteContext {
  params: Promise<{ batchId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { batchId } = await context.params;
    const body = await request.json();

    const {
      signedPdfBase64,
      reasonText = 'Document signed with mock administrative seal',
      signatures = [],
      signatureAlgorithm = 'RSA-SHA256',
      signedAt,
      signedBy,
    } = body;

    if (!signedPdfBase64 || typeof signedPdfBase64 !== 'string') {
      return NextResponse.json({ error: 'Missing signedPdfBase64' }, { status: 400 });
    }

    const batch = await prisma.institutionDispatchBatch.findUnique({
      where: { id: batchId },
      include: {
        institution: true,
        documents: true,
        items: {
          include: {
            report: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Dispatch batch not found' }, { status: 404 });
    }

    if (batch.status === 'SENT') {
      return NextResponse.json({ error: 'Batch is already sent' }, { status: 400 });
    }

    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      return NextResponse.json({ error: 'Draft dispatch PDF not found' }, { status: 400 });
    }

    if (!batch.institution.email) {
      return NextResponse.json({ error: 'Institution does not have an email address' }, { status: 400 });
    }

    const draftBuffer = await readDispatchDocument(draft.filePath);

    // Create signed document
    const signedPdfBuffer = Buffer.from(signedPdfBase64, 'base64');
    const signedFileName = `batch-${batchId}-signed-${Date.now()}.pdf`;
    const uploadedSigned = await uploadDispatchDocument({
      batchId,
      fileName: signedFileName,
      buffer: signedPdfBuffer,
      mimeType: 'application/pdf',
      folder: 'signed',
    });

    // Create signature metadata file (for records)
    const signatureMetadata = {
      batchId,
      signedAt: signedAt || new Date().toISOString(),
      signedBy: signedBy || authResult.user.userId,
      reasonText,
      signatureAlgorithm,
      documentHash: require('crypto')
        .createHash('sha256')
        .update(signedPdfBuffer)
        .digest('hex'),
      signatures,
    };

    const signatureMetadataBuffer = Buffer.from(JSON.stringify(signatureMetadata, null, 2));
    const metadataFileName = `batch-${batchId}-signature-metadata-${Date.now()}.json`;
    await uploadDispatchDocument({
      batchId,
      fileName: metadataFileName,
      buffer: signatureMetadataBuffer,
      mimeType: 'application/json',
      folder: 'signed',
    });

    // Update database: create signed document record and mark batch as SIGNED
    await prisma.$transaction([
      prisma.dispatchDocument.create({
        data: {
          batchId,
          kind: 'SIGNED',
          fileName: signedFileName,
          filePath: uploadedSigned.filePath,
          mimeType: 'application/pdf',
          uploadedById: authResult.user.userId,
        },
      }),
      prisma.institutionDispatchBatch.update({
        where: { id: batchId },
        data: { status: 'SIGNED' },
      }),
      prisma.reportHistory.createMany({
        data: batch.items.map((item) => ({
          reportId: item.reportId,
          action: 'DISPATCH_SIGNED',
          description: `Batch ${batchId} signed with mock administrative seal. Signed by: ${signedBy || authResult.user.userId}`,
        })),
      }),
    ]);

    // Send email to institution
    const reportsCount = batch.items.length;
    const emailSubject = `Граждански сигнали от ResQCity - ${reportsCount} сигнал(а)`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#7C3AED,#06b6d4);padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;">ResQCity</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;">Препратени граждански сигнали</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px;">Уважаеми представители на <strong>${batch.institution.name}</strong>,</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Препращаме Ви <strong style="color:#7C3AED;">${reportsCount} граждански сигнал(а)</strong>,
            получени чрез платформата ResQCity, които попадат в компетентността на вашата институция.
          </p>
          <div style="background:#f9fafb;border-left:4px solid #7C3AED;padding:16px 20px;margin:24px 0;border-radius:8px;">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
              <strong>Идентификатор на пакет:</strong> ${batch.id}<br>
              <strong>Брой сигнали:</strong> ${reportsCount}<br>
              <strong>Подписан:</strong> ${new Date(signedAt || new Date()).toLocaleString('bg-BG')}<br>
              <strong>Підписано от:</strong> Административна печат ResQCity
            </p>
          </div>
          <p style="color:#6B7280;font-size:13px;line-height:1.5;margin:24px 0 0;">
            Документът е подписан с административна печат на платформата ResQCity.
            За повече информация или въпроси, моля свържете се с нас.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailText = `
Уважаеми представители на ${batch.institution.name},

Препращаме Ви ${reportsCount} граждански сигнал(а), получени чрез платформата ResQCity.

Идентификатор на пакет: ${batch.id}
Брой сигнали: ${reportsCount}
Подписан: ${new Date(signedAt || new Date()).toLocaleString('bg-BG')}
Подписано от: Административна печат ResQCity

Документът е подписан с административна печат на платформата ResQCity.
`;

    const emailResult = await sendEmail({
      to: batch.institution.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: signedFileName,
          content: signedPdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          error: 'Batch signed but email sending failed',
          smtpError: emailResult.error,
          signedDocPath: uploadedSigned.filePath,
        },
        { status: 500 }
      );
    }

    // Final: Mark batch as SENT
    await prisma.institutionDispatchBatch.update({
      where: { id: batchId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Batch signed with mock signature and sent successfully',
      batchId,
      signedDocumentPath: uploadedSigned.filePath,
      sentTo: batch.institution.email,
      sincedAt: signedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mock sign and send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to mock sign and send batch',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
