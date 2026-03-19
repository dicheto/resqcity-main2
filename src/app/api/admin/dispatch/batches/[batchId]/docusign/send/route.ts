import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { createDispatchEnvelope } from '@/hooks/lib/docusign';
import { readDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

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

    const batch = await prisma.institutionDispatchBatch.findUnique({
      where: { id: batchId },
      include: {
        documents: true,
        items: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Dispatch batch not found' }, { status: 404 });
    }

    const draftDocument = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draftDocument) {
      return NextResponse.json({ error: 'Draft dispatch PDF not found' }, { status: 400 });
    }

    const signerName = String(body.signerName || `${authResult.user.firstName || ''} ${authResult.user.lastName || ''}`.trim() || authResult.user.email);
    const signerEmail = String(body.signerEmail || authResult.user.email).trim().toLowerCase();

    if (!signerEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid signerEmail' }, { status: 400 });
    }

    const pdfBuffer = await readDispatchDocument(draftDocument.filePath);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const envelope = await createDispatchEnvelope({
      batchId,
      documentName: draftDocument.fileName,
      documentBase64: pdfBuffer.toString('base64'),
      signerName,
      signerEmail,
      callbackUrl: `${appUrl}/api/docusign/webhook`,
    });

    await prisma.institutionDispatchBatch.update({
      where: { id: batchId },
      data: {
        status: 'PENDING_SIGNATURE',
      },
    });

    await prisma.reportHistory.createMany({
      data: batch.items.map((item) => ({
        reportId: item.reportId,
        action: 'DISPATCH_SENT_FOR_SIGNATURE',
        description: `Batch ${batchId} sent to DocuSign envelope ${envelope.envelopeId}`,
      })),
      skipDuplicates: false,
    });

    return NextResponse.json({
      success: true,
      batchId,
      envelopeId: envelope.envelopeId,
      envelopeStatus: envelope.status,
      message: 'Dispatch batch sent to DocuSign successfully',
    });
  } catch (error) {
    console.error('DocuSign send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send dispatch batch to DocuSign',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}