import axios from 'axios';
import gtfsRealtimeBindings from 'gtfs-realtime-bindings';

// Sofia Traffic GTFS Realtime API endpoints
const SOFIA_TRAFFIC_BASE = 'https://gtfs.sofiatraffic.bg/api/v1';
const REQUEST_TIMEOUT = 12000;

export interface VehiclePosition {
  trip: {
    tripId: string;
    routeId: string;
    scheduleRelationship?: string;
  };
  position: {
    latitude: number;
    longitude: number;
    speed?: number; // km/h (Sofia Traffic API returns km/h, not m/s as per GTFS spec)
  };
  vehicle: {
    id: string;
  };
  currentStatus: string; // "IN_TRANSIT_TO", "STOPPED_AT", "INCOMING_AT", etc.
  timestamp: string; // Unix timestamp as string
  stopId: string;
  occupancyStatus?: string; // "EMPTY", "MANY_SEATS_AVAILABLE", etc.
  congestionLevel?: string;
}

export interface TripUpdate {
  trip: {
    tripId: string;
    routeId: string;
    scheduleRelationship?: string;
  };
  stopTimeUpdate?: Array<{
    stopId: string;
    arrival?: {
      time: string; // Unix timestamp as string
      uncertainty?: number;
    };
    departure?: {
      time: string; // Unix timestamp as string
      uncertainty?: number;
    };
    scheduleRelationship?: string;
  }>;
  timestamp: string; // Unix timestamp as string
}

export interface Alert {
  id: string;
  alert: {
    active_period?: Array<{
      start?: number;
      end?: number;
    }>;
    informed_entity?: Array<{
      agency_id?: string;
      route_id?: string;
      route_type?: number;
      trip?: {
        trip_id?: string;
        route_id?: string;
      };
      stop_id?: string;
    }>;
    cause?: string;
    effect?: string;
    url?: {
      translation?: Array<{
        text: string;
        language: string;
      }>;
    };
    header_text?: {
      translation?: Array<{
        text: string;
        language: string;
      }>;
    };
    description_text?: {
      translation?: Array<{
        text: string;
        language: string;
      }>;
    };
  };
}

export interface RealtimeData {
  vehicle_positions: VehiclePosition[];
  trip_updates: TripUpdate[];
  alerts: Alert[];
  timestamp: number;
  fetch_errors?: string[];
}

// Cache for realtime data
let dataCache: RealtimeData | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3000; // 3 seconds

/**
 * Fetch vehicle positions from Sofia Traffic API
 */
async function fetchVehiclePositions(): Promise<VehiclePosition[]> {
  try {
    const response = await axios.get<ArrayBuffer>(`${SOFIA_TRAFFIC_BASE}/vehicle-positions`, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'ResQCity/1.0',
      },
    });

    const feed = gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(response.data)
    );

    return (feed.entity || [])
      .filter((entity) => entity.vehicle)
      .map((entity) => entity.vehicle as any as VehiclePosition);
  } catch (error) {
    console.error('Error fetching vehicle positions:', error);
    return [];
  }
}

/**
 * Fetch trip updates from Sofia Traffic API
 */
async function fetchTripUpdates(): Promise<TripUpdate[]> {
  try {
    const response = await axios.get<ArrayBuffer>(`${SOFIA_TRAFFIC_BASE}/trip-updates`, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'ResQCity/1.0',
      },
    });

    const feed = gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(response.data)
    );

    return (feed.entity || [])
      .filter((entity) => entity.tripUpdate)
      .map((entity) => entity.tripUpdate as any as TripUpdate);
  } catch (error) {
    console.error('Error fetching trip updates:', error);
    return [];
  }
}

/**
 * Fetch alerts from Sofia Traffic API
 */
async function fetchAlerts(): Promise<Alert[]> {
  try {
    const response = await axios.get<ArrayBuffer>(`${SOFIA_TRAFFIC_BASE}/alerts`, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'ResQCity/1.0',
      },
    });

    const feed = gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(response.data)
    );

    return (feed.entity || [])
      .filter((entity) => entity.alert)
      .map((entity) => ({
        id: entity.id,
        alert: entity.alert as Alert['alert'],
      }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

/**
 * Get all realtime data (vehicles, trips, alerts)
 * Fetches in parallel and caches for 3 seconds
 */
export async function getRealtimeData(forceRefresh: boolean = false): Promise<RealtimeData> {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && dataCache && now - lastFetchTime < CACHE_TTL) {
    return dataCache;
  }

  console.log('🔄 Fetching realtime data from Sofia Traffic API...');

  const results = await Promise.allSettled([
    fetchVehiclePositions(),
    fetchTripUpdates(),
    fetchAlerts(),
  ]);

  const errors: string[] = [];

  const vehiclePositions = results[0].status === 'fulfilled'
    ? results[0].value
    : (errors.push('vehicle-positions timeout'), dataCache?.vehicle_positions || []);

  const tripUpdates = results[1].status === 'fulfilled'
    ? results[1].value
    : (errors.push('trip-updates timeout'), dataCache?.trip_updates || []);

  const alerts = results[2].status === 'fulfilled'
    ? results[2].value
    : (errors.push('alerts timeout'), dataCache?.alerts || []);

  dataCache = {
    vehicle_positions: vehiclePositions,
    trip_updates: tripUpdates,
    alerts: alerts,
    timestamp: now,
    fetch_errors: errors.length ? errors : undefined,
  };

  lastFetchTime = now;

  console.log(`✅ Fetched: ${vehiclePositions.length} vehicles, ${tripUpdates.length} updates, ${alerts.length} alerts`);

  return dataCache;
}

/**
 * Get only vehicle positions
 */
export async function getVehiclePositions(): Promise<VehiclePosition[]> {
  const data = await getRealtimeData();
  return data.vehicle_positions;
}

/**
 * Get alerts for a specific route
 */
export function getAlertsForRoute(alerts: Alert[], routeId: string): Alert[] {
  return alerts.filter((alert) => {
    if (!alert.alert.informed_entity) return false;
    return alert.alert.informed_entity.some(
      (entity) => entity.route_id === routeId || !entity.route_id
    );
  });
}

/**
 * Get trip delays - calculate from stop time updates
 * Compares scheduled vs actual (current) time
 */
export function getTripDelays(tripUpdates: TripUpdate[]): Record<string, number> {
  const delays: Record<string, number> = {};
  const now = Math.floor(Date.now() / 1000); // Current time in seconds

  tripUpdates.forEach((update) => {
    const tripId = update.trip.tripId;
    if (!tripId || !update.stopTimeUpdate || update.stopTimeUpdate.length === 0) {
      return;
    }

    // Get the next upcoming stop (first one with time >= now)
    const nextStop = update.stopTimeUpdate.find(stop => {
      const departureTime = stop.departure?.time ? parseInt(stop.departure.time) : 0;
      return departureTime >= now;
    });

    if (nextStop && nextStop.departure?.time) {
      const departureTime = parseInt(nextStop.departure.time);
      const delaySeconds = departureTime - now;
      
      // Only record if delay is reasonable (0 to 3600 seconds / 1 hour max)
      if (delaySeconds >= 0 && delaySeconds <= 3600) {
        delays[tripId] = delaySeconds;
      }
    }
  });

  return delays;
}
