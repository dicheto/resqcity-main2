import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { uploadDispatchDocument } from '@/hooks/lib/dispatch-document-storage';

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
    
		// Get the batch to verify it exists and can accept signed documents
		const batch = await prisma.institutionDispatchBatch.findUnique({
			where: { id: batchId },
			include: { documents: true },
		});

		if (!batch) {
			return NextResponse.json(
				{ error: 'Dispatch batch not found' },
				{ status: 404 }
			);
		}

		// Parse request body
		const body = await request.json();
		const { fileName, base64Content, mimeType } = body;

		if (!fileName || !base64Content) {
			return NextResponse.json(
				{ error: 'fileName and base64Content are required' },
				{ status: 400 }
			);
		}

		// Generate a unique filename for the signed document
		const timestamp = Date.now();
		const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
		const signedFileName = `batch-${batchId}-signed-${timestamp}-${sanitizedFileName}`;

		// Decode base64 and upload the signed document
		const fileBuffer = Buffer.from(base64Content, 'base64');
		const uploaded = await uploadDispatchDocument({
			batchId,
			fileName: signedFileName,
			buffer: fileBuffer,
			mimeType: mimeType || 'application/pdf',
		});

		console.log(`[Dispatch] Signed document uploaded: ${signedFileName}`);

		// Create a database record for the signed document
		await prisma.dispatchDocument.create({
			data: {
				batchId: batch.id,
				kind: 'SIGNED',
				fileName: signedFileName,
				filePath: uploaded.filePath,
				mimeType: mimeType || 'application/pdf',
				uploadedById: authResult.user.userId,
			},
		});

		// Update the batch status to SIGNED (ready to send)
		await prisma.institutionDispatchBatch.update({
			where: { id: batchId },
			data: { status: 'SIGNED' },
		});

		console.log(`[Dispatch] Batch ${batchId} marked as SIGNED`);

		return NextResponse.json({
			success: true,
			message: 'Signed document uploaded successfully',
			fileName: signedFileName,
			filePath: uploaded.filePath,
		});
	} catch (error) {
		console.error('Upload signed document error:', error);
		return NextResponse.json(
			{
				error: 'Failed to upload signed document',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
