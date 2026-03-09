import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { sendEmail } from '@/hooks/lib/email';

interface RouteContext {
  params: Promise<{ batchId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  // Check authentication and authorization
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { batchId } = await context.params;
    
    // Get the batch with all related data
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
      return NextResponse.json(
        { error: 'Dispatch batch not found' },
        { status: 404 }
      );
    }

    // Verify the batch is ready to send (must be signed)
    if (batch.status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'Batch must be signed before sending. Current status: ' + batch.status },
        { status: 400 }
      );
    }

    // Find the signed document
    const signedDoc = batch.documents.find(doc => doc.kind === 'SIGNED');
    if (!signedDoc) {
      return NextResponse.json(
        { error: 'No signed document found for this batch' },
        { status: 400 }
      );
    }

    // Verify the institution has an email
    if (!batch.institution.email) {
      return NextResponse.json(
        { error: 'Institution does not have an email address' },
        { status: 400 }
      );
    }

    // Read the signed PDF file
    const pdfPath = path.join(process.cwd(), 'public', signedDoc.filePath);
    let pdfBuffer: Buffer;
    
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch (error) {
      console.error('Failed to read signed PDF:', error);
      return NextResponse.json(
        { error: 'Signed document file not found on server' },
        { status: 500 }
      );
    }

    // Prepare email content
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
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7C3AED,#06b6d4);padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;">ResQCity</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;">Препратени граждански сигнали</h1>
        </td></tr>
        
        <!-- Body -->
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
              <strong>Дата на генериране:</strong> ${new Date(batch.createdAt).toLocaleDateString('bg-BG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <p style="color:#374151;font-size:15px;line-height:1.6;margin:24px 0 0;">
            Прикаченият документ съдържа подробна информация за всеки сигнал, включително: 
            адрес на местоположение, категория, описание и таксономична информация за препоръчване.
          </p>

          <p style="color:#374151;font-size:15px;line-height:1.6;margin:20px 0 0;">
            Документът е подписан с квалифициран електронен подпис (КЕП) в съответствие с българското законодателство.
          </p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">

          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
            При възникване на въпроси или необходимост от допълнителна информация, моля свържете се с 
            отдела за градско управление или отговорете на този имейл.
          </p>
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">
            © ${new Date().getFullYear()} ResQCity — Платформа за граждански сигнали и градско управление
          </p>
          <p style="color:#9ca3af;font-size:11px;margin:0;">
            Този имейл е генериран автоматично. За технически въпроси: support@resqcity.bg
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
Дата на генериране: ${new Date(batch.createdAt).toLocaleString('bg-BG')}

Прикаченият документ съдържа подробна информация за всеки сигнал и е подписан с квалифициран електронен подпис (КЕП).

© ${new Date().getFullYear()} ResQCity — Платформа за граждански сигнали и градско управление
`;

    // Send email with attachment
    console.log(`[Dispatch] Sending email to ${batch.institution.email} for batch ${batchId}`);
    
    const emailSent = await sendEmail({
      to: batch.institution.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: signedDoc.fileName,
          content: pdfBuffer,
          contentType: signedDoc.mimeType,
        },
      ],
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email. Please check SMTP configuration.' },
        { status: 500 }
      );
    }

    // Update batch status to SENT
    await prisma.institutionDispatchBatch.update({
      where: { id: batchId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    console.log(`[Dispatch] Batch ${batchId} successfully sent to ${batch.institution.email}`);

    return NextResponse.json({
      success: true,
      message: 'Dispatch batch sent successfully',
      sentTo: batch.institution.email,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Send dispatch batch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send dispatch batch',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
