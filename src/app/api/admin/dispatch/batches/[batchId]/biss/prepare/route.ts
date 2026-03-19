import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated BISS signing has been removed. Use mock document signing instead.
 * This endpoint is deprecated and should not be called.
 */

interface RouteContext {
  params: Promise<{ batchId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  return NextResponse.json(
    {
      error: 'BISS signing has been deprecated and removed from ResQCity',
      suggestion: 'Dispatch documents are now prepared and signed with local mock signatures via the main dispatch API',
      deprecatedAt: '2026-03-09',
      migrationGuide: 'See dispatch batch documentation for mock signatures'
    },
    { status: 410 } // 410 Gone
  );
}
