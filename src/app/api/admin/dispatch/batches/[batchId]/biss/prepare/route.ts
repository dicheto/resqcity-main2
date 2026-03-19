import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { readDispatchDocument } from '@/hooks/lib/dispatch-document-storage';
import { buildBissSignPayload } from '@/hooks/lib/biss';

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
    const requestedHashAlgorithm = String(body?.hashAlgorithm || 'SHA256').toUpperCase();

    if (requestedHashAlgorithm !== 'SHA256' && requestedHashAlgorithm !== 'SHA512') {
      return NextResponse.json({ error: 'Unsupported hashAlgorithm. Use SHA256 or SHA512.' }, { status: 400 });
    }

    const batch = await prisma.institutionDispatchBatch.findUnique({
      where: { id: batchId },
      include: {
        documents: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Dispatch batch not found' }, { status: 404 });
    }

    const draft = batch.documents.find((doc) => doc.kind === 'DRAFT');
    if (!draft) {
      return NextResponse.json({ error: 'Draft dispatch PDF not found' }, { status: 400 });
    }

    const draftBuffer = await readDispatchDocument(draft.filePath);
    const draftBase64 = draftBuffer.toString('base64');

    const signPayload = buildBissSignPayload({
      contentsB64: [draftBase64],
      hashAlgorithm: requestedHashAlgorithm,
      confirmText: [`Подписвате пакет ${batchId}`],
    });

    return NextResponse.json({
      batchId,
      draft: {
        fileName: draft.fileName,
        filePath: draft.filePath,
        mimeType: draft.mimeType,
      },
      signRequest: signPayload,
      mode: signPayload._strictMode ? 'strict' : 'universal',
      allowTestMode: process.env.BISS_ALLOW_TEST_MODE === 'true',
      portCandidates: [53952, 53953, 53954, 53955],
    });
  } catch (error) {
    console.error('BISS prepare error:', error);
    return NextResponse.json(
      {
        error: 'Failed to prepare BISS signing payload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
