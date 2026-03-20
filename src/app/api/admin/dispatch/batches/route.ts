import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { generateDispatchPDF } from '@/hooks/lib/pdf-generator';
import { deleteDispatchDocuments, uploadDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const batches = await prisma.institutionDispatchBatch.findMany({
      include: {
        institution: true,
        items: {
          include: {
            report: {
              include: {
                category: true,
              },
            },
          },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Dispatch batches fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch batches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const reportIds: string[] | undefined = body?.reportIds;

    console.log('[Dispatch] Fetching routing targets with reportIds:', reportIds);
    
    // First, get all unsent batches and their report IDs to avoid duplicates
    const unsentBatches = await prisma.institutionDispatchBatch.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED'] }, // Not SENT yet
      },
      include: {
        items: {
          select: { reportId: true },
        },
      },
    });

    // Build a map of institution IDs to already-included report IDs
    const reportsByInstitution = new Map<string, Set<string>>();
    for (const batch of unsentBatches) {
      const key = batch.institutionId;
      const reportSet = reportsByInstitution.get(key) ?? new Set<string>();
      for (const item of batch.items) {
        reportSet.add(item.reportId);
      }
      reportsByInstitution.set(key, reportSet);
    }

    console.log('[Dispatch] Found unsent batches with already-included reports:', reportsByInstitution);
    
    // Fetch routing targets with their IDs first
    const targets = await prisma.reportRoutingTarget.findMany({
      where: {
        included: true,
        report: {
          status: {
            in: ['PENDING', 'IN_REVIEW', 'IN_PROGRESS'],
          },
          ...(Array.isArray(reportIds) && reportIds.length > 0 ? { id: { in: reportIds } } : {}),
        },
      },
    });

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'No routed reports found for dispatch generation' },
        { status: 400 }
      );
    }

    console.log('[Dispatch] Found', targets.length, 'routing targets');

    // Filter out reports that are already in unsent batches for the same institution
    const filteredTargets = targets.filter((target) => {
      const alreadyIncluded = reportsByInstitution.get(target.institutionId || '');
      if (!alreadyIncluded) {
        return true; // No unsent batch for this institution yet
      }
      const isDuplicate = alreadyIncluded.has(target.reportId);
      if (isDuplicate) {
        console.log(`[Dispatch] Filtering out duplicate report ${target.reportId} for institution ${target.institutionId}`);
      }
      return !isDuplicate;
    });

    if (filteredTargets.length === 0) {
      return NextResponse.json(
        { error: 'All routed reports are already in unsent batches for their respective institutions' },
        { status: 400 }
      );
    }

    console.log('[Dispatch] Filtered to', filteredTargets.length, 'unique targets (removed', targets.length - filteredTargets.length, 'duplicates)');

    // Now fetch the related data we need from filtered targets only
    const targetIds = filteredTargets.map((t) => t.id);
    const targetsWithData = await prisma.reportRoutingTarget.findMany({
      where: { id: { in: targetIds } },
      include: {
        institution: true,
        adHocInstitution: true,
        report: true,
        customizations: true,
      },
    });

    if (targetsWithData.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch routing target details' },
        { status: 500 }
      );
    }

    // Групиране по институция (включително ad-hoc)
    const byInstitution = new Map<string, typeof targetsWithData>();
    for (const target of targetsWithData) {
      const key = target.institutionId || `adhoc-${target.adHocInstitutionId}`;
      const collection = byInstitution.get(key) ?? [];
      collection.push(target);
      byInstitution.set(key, collection);
    }

    const tempOutputDir = path.join(os.tmpdir(), 'resqcity-dispatch-docs');
    await fs.mkdir(tempOutputDir, { recursive: true });

    // Delete all old unsent/unsigned batches (DRAFT or PENDING_SIGNATURE) before generating new ones
    const staleBatches = await prisma.institutionDispatchBatch.findMany({
      where: { status: { in: ['DRAFT', 'PENDING_SIGNATURE'] } },
      include: { documents: true },
    });

    for (const staleBatch of staleBatches) {
      await deleteDispatchDocuments(staleBatch.documents.map((doc) => doc.filePath));
    }

    if (staleBatches.length > 0) {
      await prisma.institutionDispatchBatch.deleteMany({
        where: { id: { in: staleBatches.map((b) => b.id) } },
      });
    }

    const createdBatchIds: string[] = [];

    for (const [key, institutionTargets] of byInstitution.entries()) {
      console.log(`[Dispatch] Processing institutional batch for key: ${key}, targets: ${institutionTargets.length}`);
      
      // Вземаме институцията (или ad-hoc)
      const institution = institutionTargets[0]?.institution;
      const adHocInstitution = institutionTargets[0]?.adHocInstitution;

      if (!institution && !adHocInstitution) {
        continue; // Skip if no institution
      }

      const institutionName = institution?.name || adHocInstitution?.name || 'Неизвестна институция';
      const institutionId = institution?.id;

      // Създаваме пакет само за стандартни институции (не за ad-hoc)
      if (!institutionId) {
        continue;
      }

      const batch = await prisma.institutionDispatchBatch.create({
        data: {
          institutionId,
          status: 'PENDING_SIGNATURE',
          generatedById: authResult.user.userId,
        },
      });

      createdBatchIds.push(batch.id);

      for (const target of institutionTargets) {
        await prisma.dispatchBatchItem.create({
          data: {
            batchId: batch.id,
            reportId: target.reportId,
            routingTargetId: target.id,
          },
        });
      }

      // Събираме всички получатели за този пакет, групирани по препоръка
      const allRecipients = institutionTargets.map((target) => {
        const inst = target.institution || target.adHocInstitution;
        const customization = target.customizations?.[0];

        return {
          name: customization?.customName || inst?.name || 'Неизвестен получател',
          email: customization?.customEmail || inst?.email || undefined,
          phone: customization?.customPhone || (target.adHocInstitution?.phone || undefined),
          recommendationSource: target.recommendation,
          isCustom: !!target.adHocInstitutionId || !!customization,
        };
      });

      // Генериране на PDF документ
      const pdfFileName = `batch-${batch.id}-draft.pdf`;
      const pdfAbsolutePath = path.join(tempOutputDir, pdfFileName);

      console.log(`[Dispatch] Generating PDF: ${pdfAbsolutePath}`);
      await generateDispatchPDF(
        {
          institutionName,
          reports: institutionTargets.map((item) => {
            const report = item.report as any; // Bypass TypeScript issues for now
            return {
              id: report.id,
              title: report.title,
              description: report.description || undefined,
              createdAt: report.createdAt,
              address: report.address,
              district: report.district,
              taxonomyCategory: report.taxonomyCategory,
              taxonomySubcategory: report.taxonomySubcategory,
              taxonomySituation: report.taxonomySituation,
              customSubcategory: report.customSubcategory,
              customSituation: report.customSituation,
            };
          }),
          recipients: allRecipients,
          batchId: batch.id,
          generatedBy: {
            name: authResult.user.email, // Fallback to email since firstName/lastName aren't in JWT
          },
          includeDigitalSignatureField: true,
        },
        pdfAbsolutePath
      );

      const pdfBuffer = await fs.readFile(pdfAbsolutePath);
      const uploaded = await uploadDispatchDocument({
        batchId: batch.id,
        fileName: pdfFileName,
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
      });

      await fs.unlink(pdfAbsolutePath).catch(() => {
        // Temporary file cleanup is best-effort.
      });

      console.log(`[Dispatch] PDF generated successfully: ${pdfFileName}`);

      await prisma.dispatchDocument.create({
        data: {
          batchId: batch.id,
          kind: 'DRAFT',
          fileName: pdfFileName,
          filePath: uploaded.filePath,
          mimeType: 'application/pdf',
          uploadedById: authResult.user.userId,
        },
      });
    }

    return NextResponse.json({
      message: 'Dispatch batches generated as PDF',
      createdBatchIds,
      totalBatches: createdBatchIds.length,
    });
  } catch (error) {
    console.error('Dispatch batches generation error:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    console.error('Full error object:', error);
    return NextResponse.json({ 
      error: 'Failed to generate dispatch batches',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
