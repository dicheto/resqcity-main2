// Real-time vehicle tracking for public transit
// This simulates live vehicle positions with realistic movement patterns

export interface Vehicle {
  id: string;
  trip_id: string;
  route_id: string;
  route_short_name: string;
  position: {
    latitude: number;
    longitude: number;
  };
  current_stop_sequence: number;
  speed: number; // km/h
  bearing: number; // degrees
  timestamp: number;
  status: 'IN_TRANSIT' | 'STOPPED' | 'ARRIVED';
  occupancy_percentage: number;
}

// GTFS routes data (sample Sofia bus routes)
const SOFIA_ROUTES = [
  { route_id: 'M51', route_short_name: 'М51', color: '#E74C3C' },
  { route_id: 'M52', route_short_name: 'М52', color: '#3498DB' },
  { route_id: 'M53', route_short_name: 'М53', color: '#2ECC71' },
  { route_id: 'M54', route_short_name: 'М54', color: '#F39C12' },
  { route_id: '1', route_short_name: '1', color: '#9B59B6' },
  { route_id: '2', route_short_name: '2', color: '#1ABC9C' },
  { route_id: '3', route_short_name: '3', color: '#E67E22' },
  { route_id: '4', route_short_name: '4', color: '#34495E' },
];

// Major transit hubs in Sofia (approximate coordinates)
const TRANSIT_HUBS = [
  { name: 'Central Station', lat: 42.6977, lng: 23.3219 },
  { name: 'Square Alexander', lat: 42.6977, lng: 23.3246 },
  { name: 'National Palace', lat: 42.6952, lng: 23.3199 },
  { name: 'Women Bazaar', lat: 42.7005, lng: 23.3210 },
  { name: 'Al. Batenberg', lat: 42.7100, lng: 23.3350 },
  { name: 'Sahat Tepe', lat: 42.7200, lng: 23.3100 },
  { name: 'South Park', lat: 42.6820, lng: 23.3280 },
];

// Generate realistic vehicle positions
export function generateVehiclePositions(
  stopCount: number = 50
): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const now = Date.now();

  // Create 30-50 simulated vehicles
  const vehicleCount = Math.min(Math.floor(stopCount * 0.8), 50);

  for (let i = 0; i < vehicleCount; i++) {
    const route = SOFIA_ROUTES[i % SOFIA_ROUTES.length];
    const hub = TRANSIT_HUBS[i % TRANSIT_HUBS.length];

    // Add some random offset to avoid bunching
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;

    vehicles.push({
      id: `${route.route_short_name}-${i}`,
      trip_id: `trip-${route.route_id}-${i}`,
      route_id: route.route_id,
      route_short_name: route.route_short_name,
      position: {
        latitude: hub.lat + latOffset,
        longitude: hub.lng + lngOffset,
      },
      current_stop_sequence: Math.floor(Math.random() * 20) + 1,
      speed: Math.random() * 40 + 10, // 10-50 km/h
      bearing: Math.random() * 360,
      timestamp: now,
      status: Math.random() > 0.3 ? 'IN_TRANSIT' : 'STOPPED',
      occupancy_percentage: Math.floor(Math.random() * 90) + 10, // 10-100%
    });
  }

  return vehicles;
}

// Simulate vehicle movement (for smooth animation)
export function updateVehiclePosition(
  vehicle: Vehicle,
  deltaSeconds: number = 1
): Vehicle {
  if (vehicle.status === 'STOPPED') {
    // Vehicles stopped at a station stay put
    return {
      ...vehicle,
      timestamp: Date.now(),
    };
  }

  // Calculate movement based on speed
  const speedPerSecond = (vehicle.speed / 3.6) / 1000; // Convert km/h to degrees per second

  // Add slight randomness to bearing for realistic movement
  const bearingVariation = (Math.random() - 0.5) * 5;
  const newBearing = (vehicle.bearing + bearingVariation + 360) % 360;

  // Convert bearing to radians
  const bearingRad = (newBearing * Math.PI) / 180;

  // Update position
  const newLat =
    vehicle.position.latitude + Math.cos(bearingRad) * speedPerSecond * deltaSeconds;
  const newLng =
    vehicle.position.longitude +
    Math.sin(bearingRad) * speedPerSecond * (deltaSeconds / Math.cos(newLat * (Math.PI / 180)));

  return {
    ...vehicle,
    position: {
      latitude: newLat,
      longitude: newLng,
    },
    bearing: newBearing,
    timestamp: Date.now(),
  };
}

// Keep vehicle positions in bounds
export function ensureInBounds(
  vehicle: Vehicle,
  minLat: number = 42.6,
  maxLat: number = 42.8,
  minLng: number = 23.2,
  maxLng: number = 23.5
): Vehicle {
  // If vehicle goes out of bounds, "wrap" it back
  let lat = vehicle.position.latitude;
  let lng = vehicle.position.longitude;

  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
    // Generate random position within bounds
    lat = minLat + Math.random() * (maxLat - minLat);
    lng = minLng + Math.random() * (maxLng - minLng);
  }

  return {
    ...vehicle,
    position: { latitude: lat, longitude: lng },
  };
}

// Get color for route
export function getRouteColor(routeId: string): string {
  const route = SOFIA_ROUTES.find((r) => r.route_id === routeId);
  return route?.color || '#95A5A6';
}
