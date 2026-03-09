import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { uploadReportImages, ensureReportImagesBucket } from '@/hooks/lib/supabase-storage';

/**
 * POST /api/reports/upload
 * Upload images for a citizen report to Supabase Storage
 * 
 * Expected FormData:
 * - files: File[] (multiple files)
 * - reportId: string (optional, for future use)
 * 
 * Returns:
 * Array of uploaded file URLs and metadata
 */
export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const reportId = (formData.get('reportId') as string) || 'temp';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`[Reports Upload] Uploading ${files.length} images for user ${authResult.user.userId}`);

    // Ensure the bucket exists (creates it if missing)
    await ensureReportImagesBucket();

    // Upload all files to Supabase
    const uploadResults = await uploadReportImages(files, reportId);

    return NextResponse.json({
      success: true,
      count: uploadResults.length,
      images: uploadResults.map((result) => ({
        fileName: result.fileName,
        url: result.publicUrl,
        size: result.size,
        mimeType: result.mimeType,
      })),
    });
  } catch (error) {
    console.error('Error uploading report images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
