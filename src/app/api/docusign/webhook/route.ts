import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';
import { downloadCombinedDocument, verifyDocusignWebhookHmac } from '@/hooks/lib/docusign';
import { uploadDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

interface DocusignWebhookEnvelope {
  envelopeId?: string;
  status?: string;
  customFields?: {
    textCustomFields?: Array<{
      name?: string;
      value?: string;
    }>;
  };
}

function getBatchIdFromEnvelope(payload: DocusignWebhookEnvelope): string | null {
  const fields = payload.customFields?.textCustomFields || [];
  const match = fields.find((item) => item.name === 'resqcity_batch_id');
  return match?.value || null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-docusign-signature-1');

  if (!verifyDocusignWebhookHmac(rawBody, signatureHeader)) {
    return NextResponse.json({ error: 'Invalid DocuSign webhook signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const envelopeData: DocusignWebhookEnvelope = body?.data?.envelopeSummary || body?.envelopeSummary || body;
    const envelopeId = envelopeData.envelopeId;
    const envelopeStatus = (envelopeData.status || '').toLowerCase();
    const batchId = getBatchIdFromEnvelope(envelopeData);

    if (!envelopeId || !batchId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'Missing envelopeId or batchId' });
    }

    const batch = await prisma.institutionDispatchBatch.findUnique({
      where: { id: batchId },
      include: {
        items: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'Batch not found' });
    }

    if (envelopeStatus === 'completed') {
      const pdfBuffer = await downloadCombinedDocument(envelopeId);
      const fileName = `batch-${batchId}-signed-docusign-${Date.now()}.pdf`;
      const uploaded = await uploadDispatchDocument({
        batchId,
        fileName,
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
      });

      await prisma.$transaction([
        prisma.dispatchDocument.create({
          data: {
            batchId,
            kind: 'SIGNED',
            fileName,
            filePath: uploaded.filePath,
            mimeType: 'application/pdf',
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
            description: `Batch ${batchId} signed in DocuSign envelope ${envelopeId}`,
          })),
          skipDuplicates: false,
        }),
      ]);
    }

    if (envelopeStatus === 'declined' || envelopeStatus === 'voided') {
      await prisma.reportHistory.createMany({
        data: batch.items.map((item) => ({
          reportId: item.reportId,
          action: 'DISPATCH_SIGNATURE_FAILED',
          description: `Batch ${batchId} DocuSign envelope ${envelopeId} status: ${envelopeStatus}`,
        })),
        skipDuplicates: false,
      });
    }

    return NextResponse.json({ ok: true, batchId, envelopeId, envelopeStatus });
  } catch (error) {
    console.error('DocuSign webhook error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process DocuSign webhook',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}