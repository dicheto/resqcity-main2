import { NextRequest, NextResponse } from 'next/server';
import { getRouteDetails } from '@/hooks/lib/gtfs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ routeId: string }> }
) {
  try {
    const params = await context.params;
    const routeId = params.routeId;

    if (!routeId) {
      return NextResponse.json(
        { success: false, error: 'Route ID is required' },
        { status: 400 }
      );
    }

    const routeDetails = await getRouteDetails(routeId);

    if (!routeDetails) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: routeDetails,
    });
  } catch (error: any) {
    console.error('Error fetching route details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch route details', message: error.message },
      { status: 500 }
    );
  }
}
