import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { sendEmail } from '@/hooks/lib/email';
import { uploadDispatchDocument, readDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

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
    const formData = await request.formData();

    const file = formData.get('signedPdf') as File;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid signedPdf file' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
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

    if (!batch.institution.email) {
      return NextResponse.json({ error: 'Institution does not have an email address' }, { status: 400 });
    }

    // Read uploaded file
    const fileBuffer = await file.arrayBuffer();
    const signedPdfBuffer = Buffer.from(fileBuffer);

    // Create signed document record
    const signedFileName = `batch-${batchId}-manually-signed-${Date.now()}.pdf`;
    const uploadedSigned = await uploadDispatchDocument({
      batchId,
      fileName: signedFileName,
      buffer: signedPdfBuffer,
      mimeType: 'application/pdf',
      folder: 'signed',
    });

    // Create signature metadata file (for records, manual upload details)
    const signatureMetadata = {
      batchId,
      signedAt: new Date().toISOString(),
      signedBy: authResult.user.userId,
      reasonText: 'Document manually signed and uploaded',
      signatureMethod: 'MANUAL_UPLOAD',
      uploadedFileName: file.name,
      documentHash: require('crypto')
        .createHash('sha256')
        .update(signedPdfBuffer)
        .digest('hex'),
    };

    const signatureMetadataBuffer = Buffer.from(JSON.stringify(signatureMetadata, null, 2));
    const metadataFileName = `batch-${batchId}-manual-signature-metadata-${Date.now()}.json`;
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
        data: batch.items.map((item: any) => ({
          reportId: item.reportId,
          action: 'DISPATCH_SIGNED',
          description: `Batch ${batchId} signed manually (external signature) and uploaded by: ${authResult.user.userId}`,
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
              <strong>Подписан:</strong> ${new Date().toLocaleString('bg-BG')}<br>
              <strong>Метод на подписване:</strong> Административен подпис (външен)
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
Подписан: ${new Date().toLocaleString('bg-BG')}
Метод на подписване: Административен подпис (външен)

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
      message: 'Batch with manually signed PDF uploaded and sent successfully',
      batchId,
      signedDocumentPath: uploadedSigned.filePath,
      sentTo: batch.institution.email,
      signedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Manual sign and send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload signed PDF and send batch',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
