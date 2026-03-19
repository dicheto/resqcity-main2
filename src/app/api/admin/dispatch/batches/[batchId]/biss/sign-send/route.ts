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
    const body = await request.json().catch(() => ({}));

    const status = String(body?.status || '').toLowerCase();
    const reasonCode = String(body?.reasonCode || '');
    const reasonText = String(body?.reasonText || '');
    const signatureType = String(body?.signatureType || '');
    const signatures = Array.isArray(body?.signatures) ? body.signatures : [];
    const signerCertificateB64 = String(body?.signerCertificateB64 || '');

    if (status !== 'ok') {
      return NextResponse.json(
        {
          error: 'BISS signing did not complete successfully',
          reasonCode,
          reasonText,
        },
        { status: 400 }
      );
    }

    if (!signatures[0] || typeof signatures[0] !== 'string') {
      return NextResponse.json({ error: 'Missing signature payload from BISS' }, { status: 400 });
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

    const signatureBuffer = Buffer.from(String(signatures[0]), 'base64');
    const signatureFileName = `batch-${batchId}-signature-biss-${Date.now()}.p7s`;
    const uploadedSignature = await uploadDispatchDocument({
      batchId,
      fileName: signatureFileName,
      buffer: signatureBuffer,
      mimeType: 'application/pkcs7-signature',
      folder: 'signed',
    });

    let uploadedSignerCertPath: string | null = null;
    let signerCertFileName: string | null = null;
    if (signerCertificateB64) {
      signerCertFileName = `batch-${batchId}-signer-cert-${Date.now()}.cer`;
      const signerCertBuffer = Buffer.from(signerCertificateB64, 'base64');
      const uploadedCert = await uploadDispatchDocument({
        batchId,
        fileName: signerCertFileName,
        buffer: signerCertBuffer,
        mimeType: 'application/pkix-cert',
        folder: 'signed',
      });
      uploadedSignerCertPath = uploadedCert.filePath;
    }

    await prisma.$transaction([
      prisma.dispatchDocument.create({
        data: {
          batchId,
          kind: 'SIGNED',
          fileName: signatureFileName,
          filePath: uploadedSignature.filePath,
          mimeType: 'application/pkcs7-signature',
          uploadedById: authResult.user.userId,
        },
      }),
      prisma.institutionDispatchBatch.update({
        where: { id: batchId },
        data: { status: 'PENDING_SIGNATURE' },
      }),
      prisma.reportHistory.createMany({
        data: batch.items.map((item) => ({
          reportId: item.reportId,
          action: 'DISPATCH_SIGNED',
          description: `Batch ${batchId} signed via local BISS. reasonCode=${reasonCode}`,
        })),
      }),
    ]);

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
              <strong>Подписан чрез:</strong> BISS локална услуга
            </p>
          </div>
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
Подписан чрез: BISS локална услуга
`;

    const emailResult = await sendEmail({
      to: batch.institution.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: draft.fileName,
          content: draftBuffer,
          contentType: draft.mimeType || 'application/pdf',
        },
        {
          filename: signatureFileName,
          content: signatureBuffer,
          contentType: 'application/pkcs7-signature',
        },
        ...(signerCertificateB64 && signerCertFileName
          ? [
              {
                filename: signerCertFileName,
                content: Buffer.from(signerCertificateB64, 'base64'),
                contentType: 'application/pkix-cert',
              },
            ]
          : []),
      ],
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          error: 'BISS signing succeeded but email sending failed. Please verify SMTP settings.',
          smtpError: emailResult.error,
          signatureFilePath: uploadedSignature.filePath,
        },
        { status: 500 }
      );
    }

    await prisma.institutionDispatchBatch.update({
      where: { id: batchId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Batch signed with BISS and sent successfully',
      batchId,
      signatureFilePath: uploadedSignature.filePath,
      signerCertFilePath: uploadedSignerCertPath,
      signatureType,
      sentTo: batch.institution.email,
    });
  } catch (error) {
    console.error('BISS sign and send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sign and send batch via BISS',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
