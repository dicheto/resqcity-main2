import { NextRequest, NextResponse } from 'next/server';
import { getTripDelays, getRealtimeData } from '@/hooks/lib/sofia-traffic';
import routeMapping from '@/hooks/lib/gtfs-routes.json';

export const revalidate = 10;

/**
 * Get display short name for a route (from GTFS data)
 */
function getRouteShortName(routeId: string): string {
  const route = routeMapping[routeId as keyof typeof routeMapping];
  return route?.short_name || routeId; // Fallback to routeId if not found
}

/**
 * Get route type (0=tram, 3=bus, 11=trolleybus)
 */
function getRouteType(routeId: string): string {
  const route = routeMapping[routeId as keyof typeof routeMapping];
  const typeMap: Record<string, string> = {
    '0': 'TRAM',
    '3': 'BUS',
    '11': 'TROLLEYBUS',
  };
  return typeMap[route?.type || '3'] || 'BUS';
}

/**
 * Convert numeric vehicle status enum to string
 */
function getStatusString(status: number | undefined): string {
  const statusMap: Record<number, string> = {
    0: 'INCOMING_AT',
    1: 'STOPPED_AT',
    2: 'IN_TRANSIT_TO',
  };
  return statusMap[status ?? 2] || 'IN_TRANSIT_TO';
}

/**
 * Convert numeric occupancy enum to string
 */
function getOccupancyString(occupancy: number | undefined): string {
  const occupancyMap: Record<number, string> = {
    0: 'EMPTY',
    1: 'MANY_SEATS_AVAILABLE',
    2: 'FEW_SEATS_AVAILABLE',
    3: 'STANDING_ROOM_ONLY',
    4: 'CRUSHED_STANDING_ROOM_ONLY',
    5: 'FULL',
    6: 'NOT_ACCEPTING_PASSENGERS',
    7: 'NO_DATA_AVAILABLE',
    8: 'NOT_BOARDABLE',
  };
  return occupancyMap[occupancy ?? 7] || 'NO_DATA_AVAILABLE';
}

function getOccupancyPercentage(occupancy: number | undefined): number {
  const percentageMap: Record<number, number> = {
    0: 10,    // EMPTY
    1: 30,    // MANY_SEATS_AVAILABLE
    2: 60,    // FEW_SEATS_AVAILABLE
    3: 80,    // STANDING_ROOM_ONLY
    4: 95,    // CRUSHED_STANDING_ROOM_ONLY
    5: 100,   // FULL
    6: 100,   // NOT_ACCEPTING_PASSENGERS
    7: 50,    // NO_DATA_AVAILABLE
    8: 0,     // NOT_BOARDABLE
  };
  return percentageMap[occupancy ?? 7] || 50;
}

/**
 * Generate unique color for vehicle based on its ID (hash)
 */
function getVehicleColorByHash(vehicleId: string): string {
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = ((hash << 5) - hash) + vehicleId.charCodeAt(i);
    hash = hash & hash;
  }

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
    '#F1948A', '#AED6F1', '#F5B041', '#A3E4D7', '#F8B739',
  ];

  return colors[Math.abs(hash) % colors.length];
}

export async function GET(request: NextRequest) {
  try {
    const data = await getRealtimeData();
    const delays = getTripDelays(data.trip_updates);

    const vehicles = data.vehicle_positions
      .map((vehicle: any) => {
        const tripId = vehicle.trip?.tripId;
        const routeId = vehicle.trip?.routeId;
        const delay = tripId ? delays[tripId] || 0 : 0;

        // currentStatus is NUMERIC enum from Sofia Traffic API
        const status = getStatusString(vehicle.currentStatus);

        // timestamp is STRING, parse to seconds then convert to ms
        const timestampSeconds = parseInt(vehicle.timestamp || '0', 10);
        const timestampMs = timestampSeconds * 1000;

        const vehicleId = vehicle.vehicle?.id || `${routeId}-${tripId}`;
        const speed = (vehicle.position?.speed || 0) * 3.6; // m/s to km/h

        const occupancyStatus = getOccupancyString(vehicle.occupancyStatus);
        const occupancyPercentage = getOccupancyPercentage(vehicle.occupancyStatus);

        return {
          id: vehicleId,
          trip_id: tripId,
          route_id: routeId,
          route_short_name: getRouteShortName(routeId || ''), // Display name, not DB ID
          route_type: getRouteType(routeId || ''), // BUS, TRAM, or TROLLEYBUS
          position: {
            latitude: vehicle.position?.latitude || 0,
            longitude: vehicle.position?.longitude || 0,
          },
          current_stop: vehicle.stopId,
          speed: speed,
          bearing: 0, // Sofia Traffic API does NOT provide bearing
          color: getVehicleColorByHash(vehicleId),
          timestamp: timestampMs,
          status: status, // Now properly converted to string
          occupancy_status: occupancyStatus,
          occupancy_percentage: occupancyPercentage,
          delay: delay,
        };
      })
      .filter((v: any) => v.position.latitude !== 0 && v.position.longitude !== 0);

    return NextResponse.json({
      success: true,
      count: vehicles.length,
      timestamp: Date.now(),
      source: 'Sofia Traffic API',
      vehicles,
      stats: {
        total_vehicles: vehicles.length,
        delayed_vehicles: vehicles.filter((v: any) => v.delay > 0).length,
        average_delay: vehicles.length > 0
          ? Math.round(vehicles.reduce((sum: number, v: any) => sum + v.delay, 0) / vehicles.length)
          : 0,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles', message: error.message },
      { status: 500 }
    );
  }
}
