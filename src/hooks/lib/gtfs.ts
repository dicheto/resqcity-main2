import fs from 'fs';
import path from 'path';

export interface TransitStop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number;
}

export interface RouteShape {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

export interface Trip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id: number;
  shape_id: string;
}

let cachedStops: TransitStop[] | null = null;
let cachedShapes: Map<string, RouteShape[]> | null = null;
let cachedStopTimes: Map<string, StopTime[]> | null = null;
let cachedTrips: Map<string, Trip[]> | null = null;

export async function parseGTFSStops(): Promise<TransitStop[]> {
  // Return cached version if available
  if (cachedStops) {
    return cachedStops;
  }

  try {
    const stopsPath = path.join(
      process.cwd(),
      'ЦГМ Api data',
      'gtfs-static',
      'stops.txt'
    );

    const fileContent = fs.readFileSync(stopsPath, 'utf-8');
    const lines = fileContent.split('\n');

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    const stops: TransitStop[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Simple CSV parsing (handles basic cases)
        const parts = line.split(',');
        
        if (parts.length >= 6) {
          stops.push({
            stop_id: parts[0]?.trim() || '',
            stop_code: parts[1]?.trim() || '',
            stop_name: parts[2]?.trim() || '',
            stop_lat: parseFloat(parts[4] || '0'),
            stop_lon: parseFloat(parts[5] || '0'),
            location_type: parseInt(parts[6] || '0'),
          });
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }

    // Cache the results
    cachedStops = stops;
    return stops;
  } catch (error) {
    console.error('Error parsing GTFS stops:', error);
    return [];
  }
}

// Get stops filtered by a bounding box (for performance on large datasets)
export async function getStopsInBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): Promise<TransitStop[]> {
  const stops = await parseGTFSStops();
  return stops.filter(
    stop =>
      stop.stop_lat >= minLat &&
      stop.stop_lat <= maxLat &&
      stop.stop_lon >= minLng &&
      stop.stop_lon <= maxLng
  );
}

// Get all stops
export async function getAllStops(): Promise<TransitStop[]> {
  return await parseGTFSStops();
}

// Get a sample of stops for faster loading (optional)
export async function getSampleStops(maxStops: number = 200): Promise<TransitStop[]> {
  const stops = await parseGTFSStops();
  // Take every nth stop to distribute evenly
  const step = Math.ceil(stops.length / maxStops);
  return stops.filter((_, idx) => idx % step === 0);
}

// Get random stops for vehicle simulation
export async function getRandomStops(count: number = 50): Promise<TransitStop[]> {
  const stops = await parseGTFSStops();
  const shuffled = [...stops].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Parse GTFS shapes.txt file
 */
export async function parseGTFSShapes(): Promise<Map<string, RouteShape[]>> {
  if (cachedShapes) {
    return cachedShapes;
  }

  try {
    const shapesPath = path.join(process.cwd(), 'ЦГМ Api data', 'gtfs-static', 'shapes.txt');
    const fileContent = fs.readFileSync(shapesPath, 'utf-8');
    const lines = fileContent.split('\n');

    const shapesMap = new Map<string, RouteShape[]>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 4) {
        const shape: RouteShape = {
          shape_id: parts[0].trim(),
          shape_pt_lat: parseFloat(parts[1]),
          shape_pt_lon: parseFloat(parts[2]),
          shape_pt_sequence: parseInt(parts[3]),
        };

        if (!shapesMap.has(shape.shape_id)) {
          shapesMap.set(shape.shape_id, []);
        }
        shapesMap.get(shape.shape_id)!.push(shape);
      }
    }

    // Sort each shape by sequence
    shapesMap.forEach((shapes) => {
      shapes.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
    });

    cachedShapes = shapesMap;
    return shapesMap;
  } catch (error) {
    console.error('Error parsing GTFS shapes:', error);
    return new Map();
  }
}

/**
 * Parse GTFS trips.txt file
 */
export async function parseGTFSTrips(): Promise<Map<string, Trip[]>> {
  if (cachedTrips) {
    return cachedTrips;
  }

  try {
    const tripsPath = path.join(process.cwd(), 'ЦГМ Api data', 'gtfs-static', 'trips.txt');
    const fileContent = fs.readFileSync(tripsPath, 'utf-8');
    const lines = fileContent.split('\n');

    const tripsMap = new Map<string, Trip[]>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 8) {
        // Format: trip_id,route_id,service_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id,...
        const trip: Trip = {
          route_id: parts[1].trim(),
          service_id: parts[2].trim(),
          trip_id: parts[0].trim(),
          trip_headsign: parts[3].trim(),
          direction_id: parseInt(parts[5] || '0'),
          shape_id: parts[7].trim(),
        };

        if (!tripsMap.has(trip.route_id)) {
          tripsMap.set(trip.route_id, []);
        }
        tripsMap.get(trip.route_id)!.push(trip);
      }
    }

    cachedTrips = tripsMap;
    return tripsMap;
  } catch (error) {
    console.error('Error parsing GTFS trips:', error);
    return new Map();
  }
}

/**
 * Parse GTFS stop_times.txt file
 */
export async function parseGTFSStopTimes(): Promise<Map<string, StopTime[]>> {
  if (cachedStopTimes) {
    return cachedStopTimes;
  }

  try {
    const stopTimesPath = path.join(process.cwd(), 'ЦГМ Api data', 'gtfs-static', 'stop_times.txt');
    const fileContent = fs.readFileSync(stopTimesPath, 'utf-8');
    const lines = fileContent.split('\n');

    const stopTimesMap = new Map<string, StopTime[]>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 5) {
        const stopTime: StopTime = {
          trip_id: parts[0].trim(),
          arrival_time: parts[1].trim(),
          departure_time: parts[2].trim(),
          stop_id: parts[3].trim(),
          stop_sequence: parseInt(parts[4] || '0'),
        };

        if (!stopTimesMap.has(stopTime.trip_id)) {
          stopTimesMap.set(stopTime.trip_id, []);
        }
        stopTimesMap.get(stopTime.trip_id)!.push(stopTime);
      }
    }

    // Sort each trip's stops by sequence
    stopTimesMap.forEach((stopTimes) => {
      stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);
    });

    cachedStopTimes = stopTimesMap;
    return stopTimesMap;
  } catch (error) {
    console.error('Error parsing GTFS stop_times:', error);
    return new Map();
  }
}

/**
 * Get route shape and stops for a specific route
 */
export async function getRouteDetails(routeId: string) {
  const [trips, shapes, stopTimes, stops] = await Promise.all([
    parseGTFSTrips(),
    parseGTFSShapes(),
    parseGTFSStopTimes(),
    parseGTFSStops(),
  ]);

  const routeTrips = trips.get(routeId) || [];
  
  if (routeTrips.length === 0) {
    return null;
  }

  // Group trips by direction (outbound/inbound)
  const directions: Record<number, any> = {};

  routeTrips.forEach(trip => {
    const directionId = trip.direction_id || 0;
    
    if (!directions[directionId]) {
      const shapePoints = shapes.get(trip.shape_id) || [];
      const tripStopTimes = stopTimes.get(trip.trip_id) || [];
      const tripStops = tripStopTimes
        .map(st => {
          const stop = stops.find(s => s.stop_id === st.stop_id);
          return stop ? { ...stop, sequence: st.stop_sequence } : null;
        })
        .filter(Boolean);

      directions[directionId] = {
        direction_id: directionId,
        headsign: trip.trip_headsign,
        shape: shapePoints,
        stops: tripStops,
      };
    }
  });

  return {
    route_id: routeId,
    directions: Object.values(directions),
  };
}
