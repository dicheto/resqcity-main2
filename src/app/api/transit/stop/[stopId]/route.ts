import { NextRequest, NextResponse } from 'next/server';
import { parseGTFSStops, parseGTFSStopTimes, parseGTFSTrips } from '@/hooks/lib/gtfs';
import { getRealtimeData } from '@/hooks/lib/sofia-traffic';
import { getVehicleTypeInfo } from '@/hooks/lib/vehicle-models';
import routeMapping from '@/hooks/lib/gtfs-routes.json';

function getRouteShortName(routeId: string): string {
  const route = routeMapping[routeId as keyof typeof routeMapping];
  return route?.short_name || routeId;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ stopId: string }> }
) {
  try {
    const params = await context.params;
    const stopId = params.stopId;

    if (!stopId) {
      return NextResponse.json(
        { success: false, error: 'Stop ID is required' },
        { status: 400 }
      );
    }

    // Get stop info
    const stops = await parseGTFSStops();
    const stop = stops.find(s => s.stop_id === stopId);

    if (!stop) {
      return NextResponse.json(
        { success: false, error: 'Stop not found' },
        { status: 404 }
      );
    }

    // Get realtime data to find vehicles approaching this stop
    const realtimeData = await getRealtimeData();
    
    // Find all trip updates for this stop
    const upcomingArrivals = realtimeData.trip_updates
      .map(tripUpdate => {
        const stopUpdate = tripUpdate.stopTimeUpdate?.find(
          stu => stu.stopId === stopId
        );
        
        if (!stopUpdate || !stopUpdate.arrival?.time) {
          return null;
        }

        const arrivalTime = parseInt(stopUpdate.arrival.time);
        const now = Math.floor(Date.now() / 1000);
        const minutesUntilArrival = Math.round((arrivalTime - now) / 60);

        // Only show arrivals in next 60 minutes
        if (minutesUntilArrival < 0 || minutesUntilArrival > 60) {
          return null;
        }

        // Find the vehicle for this trip
        const vehicle = realtimeData.vehicle_positions.find(
          v => v.trip?.tripId === tripUpdate.trip.tripId
        );

        const routeId = tripUpdate.trip.routeId || '';
        const vehicleId = vehicle?.vehicle?.id || '';
        const typeInfo = getVehicleTypeInfo(vehicleId, routeId);

        return {
          trip_id: tripUpdate.trip.tripId,
          route_id: routeId,
          route_short_name: getRouteShortName(routeId),
          arrival_time: arrivalTime,
          minutes_until_arrival: minutesUntilArrival,
          vehicle_id: vehicleId,
          vehicle_type: typeInfo.type,
          vehicle_icon: typeInfo.icon,
          color: typeInfo.color,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.minutes_until_arrival - b!.minutes_until_arrival);

    return NextResponse.json({
      success: true,
      data: {
        stop,
        upcoming_arrivals: upcomingArrivals,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stop schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop schedule', message: error.message },
      { status: 500 }
    );
  }
}
