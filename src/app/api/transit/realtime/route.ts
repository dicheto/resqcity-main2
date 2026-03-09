import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeData, getTripDelays } from '@/hooks/lib/sofia-traffic';
import { getVehicleTypeInfo } from '@/hooks/lib/vehicle-models';
import { parseGTFSStops } from '@/hooks/lib/gtfs';
import routeMapping from '@/hooks/lib/gtfs-routes.json';

type RealtimeAlert = {
  id: string;
  alert?: {
    effect?: string;
    cause?: string;
    informed_entity?: Array<{
      route_id?: string;
      route_type?: number;
      stop_id?: string;
      trip?: {
        route_id?: string;
      };
    }>;
    header_text?: {
      translation?: Array<{
        text?: string;
        language?: string;
      }>;
    };
    description_text?: {
      translation?: Array<{
        text?: string;
        language?: string;
      }>;
    };
  };
};

function getStatusString(status: number | undefined): string {
  const statusMap: Record<number, string> = {
    0: 'На пристигане',
    1: 'Спрял',
    2: 'В пътуване',
  };
  return statusMap[status ?? 2] || 'В пътуване';
}

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

function getRouteShortName(routeId: string): string {
  const route = routeMapping[routeId as keyof typeof routeMapping];
  return route?.short_name || routeId;
}

function getBestTranslation(
  translation?: Array<{ text?: string; language?: string }>
): string | null {
  if (!translation || translation.length === 0) {
    return null;
  }

  const bgTranslation = translation.find((entry) => entry.language === 'bg' && entry.text?.trim());
  if (bgTranslation?.text) {
    return bgTranslation.text.trim();
  }

  const firstWithText = translation.find((entry) => entry.text?.trim());
  return firstWithText?.text?.trim() || null;
}

function getAlertEffectLabel(effect?: string): string {
  const effectMap: Record<string, string> = {
    NO_SERVICE: 'Линията не се обслужва',
    REDUCED_SERVICE: 'Намалено обслужване',
    SIGNIFICANT_DELAYS: 'Съществени закъснения',
    DETOUR: 'Отклонен маршрут',
    ADDITIONAL_SERVICE: 'Допълнителни курсове',
    MODIFIED_SERVICE: 'Променен маршрут',
    OTHER_EFFECT: 'Промяна в обслужването',
    UNKNOWN_EFFECT: 'Промяна в обслужването',
    STOP_MOVED: 'Преместена спирка',
    NO_EFFECT: 'Информационно съобщение',
    ACCESSIBILITY_ISSUE: 'Проблем с достъпност',
  };

  if (!effect) {
    return 'Промяна в обслужването';
  }

  return effectMap[effect] || 'Промяна в обслужването';
}

function normalizeAlerts(alerts: RealtimeAlert[]) {
  return alerts.map((item) => {
    const informedEntities = item.alert?.informed_entity || [];

    const rawRouteIds = informedEntities
      .map((entity) => entity.route_id || entity.trip?.route_id)
      .filter((value): value is string => Boolean(value && value.trim()));

    const uniqueRouteIds = Array.from(new Set(rawRouteIds));
    const affectedLines = uniqueRouteIds
      .map((routeId) => getRouteShortName(routeId))
      .filter((name) => Boolean(name && name.trim() && name !== '0'));

    const headerText = getBestTranslation(item.alert?.header_text?.translation);
    const descriptionText = getBestTranslation(item.alert?.description_text?.translation);
    const effectCode = item.alert?.effect || 'UNKNOWN_EFFECT';
    const effectLabel = getAlertEffectLabel(effectCode);

    return {
      id: item.id,
      effect_code: effectCode,
      effect_label: effectLabel,
      title: headerText || effectLabel,
      description: descriptionText || effectLabel,
      affected_route_ids: uniqueRouteIds,
      affected_lines: affectedLines,
      is_network_wide: affectedLines.length === 0,
      cause: item.alert?.cause,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const data = await getRealtimeData();
    const delays = getTripDelays(data.trip_updates);
    const allStops = await parseGTFSStops();
    const normalizedAlerts = normalizeAlerts(data.alerts as RealtimeAlert[]);

    // Transform vehicles with proper enum conversion
    const vehiclesWithDelays = data.vehicle_positions
      .map((vehicle: any) => {
        const tripId = vehicle.trip?.tripId;
        const routeId = vehicle.trip?.routeId;
        const delay = tripId ? delays[tripId] || 0 : 0;

        // currentStatus is NUMERIC enum from Sofia Traffic API
        const status = getStatusString(vehicle.currentStatus);

        // timestamp is STRING, convert to ms
        const timestampSeconds = parseInt(vehicle.timestamp || '0', 10);
        const timestampMs = timestampSeconds * 1000;

        const vehicleId = vehicle.vehicle?.id || `${routeId}-${tripId}`;
        
        // Determine vehicle type and get color/icon
        const typeInfo = getVehicleTypeInfo(vehicleId, routeId || '');

        // Get stop name if available
        const currentStopInfo = allStops.find(s => s.stop_id === vehicle.stopId);
        
        // Only include occupancy if valid data (not NO_DATA_AVAILABLE)
        const occupancyStatus = getOccupancyString(vehicle.occupancyStatus);
        const occupancyPercentage = vehicle.occupancyStatus && vehicle.occupancyStatus !== 7
          ? Math.round((vehicle.occupancyStatus || 0) * 14.3) // Rough mapping to percentage
          : undefined;

        return {
          id: vehicleId,
          trip_id: tripId,
          route_id: routeId,
          route_short_name: getRouteShortName(routeId || ''),
          position: {
            latitude: vehicle.position?.latitude || 0,
            longitude: vehicle.position?.longitude || 0,
          },
          current_stop: vehicle.stopId,
          current_stop_name: currentStopInfo?.stop_name || undefined,
          speed: vehicle.position?.speed || 0, // Sofia Traffic API returns km/h directly
          bearing: 0, // No bearing data from API
          timestamp: timestampMs,
          status: status,
          occupancy_status: occupancyStatus,
          occupancy_percentage: occupancyPercentage, // Only if valid
          delay: delay,
          vehicle_type: typeInfo.type,
          vehicle_model: typeInfo.model?.name,
          color: typeInfo.color,
          icon: typeInfo.icon,
        };
      })
      .filter((v: any) => v.position.latitude !== 0 && v.position.longitude !== 0);

    return NextResponse.json({
      success: true,
      data: {
        vehicles: vehiclesWithDelays,
        vehicle_count: vehiclesWithDelays.length,
        trip_updates: data.trip_updates,
        alerts: normalizedAlerts,
        timestamp: data.timestamp,
        fetch_errors: data.fetch_errors || [],
      },
    });
  } catch (error: any) {
    console.error('Error in realtime API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch realtime data', message: error.message },
      { status: 500 }
    );
  }
}
