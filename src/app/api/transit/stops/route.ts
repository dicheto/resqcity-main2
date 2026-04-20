import { NextRequest, NextResponse } from 'next/server';
import { parseGTFSStops, getStopsInBounds, getSampleStops, getAllStops } from '@/hooks/lib/gtfs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if requesting bounds-based filtering
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');
    
    // Check if requesting sample
    const sampleParam = searchParams.get('sample');
    const limitParam = searchParams.get('limit');
    
    let stops;

    if (minLat && maxLat && minLng && maxLng) {
      // Return stops within bounds (for map viewport)
      stops = await getStopsInBounds(
        parseFloat(minLat),
        parseFloat(maxLat),
        parseFloat(minLng),
        parseFloat(maxLng)
      );
    } else if (sampleParam === 'true' && limitParam) {
      // Return sample of stops
      stops = await getSampleStops(parseInt(limitParam));
    } else {
      // Return ALL stops
      stops = await getAllStops();
    }

    return NextResponse.json({
      success: true,
      count: stops.length,
      stops,
    });
  } catch (error: any) {
    console.error('Error fetching transit stops:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transit stops',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
