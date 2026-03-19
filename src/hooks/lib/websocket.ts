import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getRealtimeData } from './sofia-traffic';
import routeMapping from './gtfs-routes.json';
import jwt from 'jsonwebtoken';

type SocketTokenPayload = {
  userId: string;
  email: string;
  role: string;
};

function getSocketJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'fallback-secret-key';
}

function getTokenFromSocketHandshake(socket: any): string | null {
  const authToken = socket.handshake?.auth?.token;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authHeader = socket.handshake?.headers?.authorization;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

function getSocketUser(socket: any): SocketTokenPayload | null {
  const token = getTokenFromSocketHandshake(socket);

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, getSocketJwtSecret()) as SocketTokenPayload;
  } catch {
    return null;
  }
}

function isAdminRole(role?: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MUNICIPAL_COUNCILOR';
}

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-admin', () => {
      const user = getSocketUser(socket);

      if (!user || !isAdminRole(user.role)) {
        socket.emit('auth-error', { message: 'Forbidden' });
        return;
      }

      socket.join('admin-room');
      console.log('Admin joined:', socket.id);
    });

    socket.on('join-user', (userId: string) => {
      if (!userId) {
        return;
      }

      const user = getSocketUser(socket);
      if (!user) {
        socket.emit('auth-error', { message: 'Unauthorized' });
        return;
      }

      if (user.userId !== userId && !isAdminRole(user.role)) {
        socket.emit('auth-error', { message: 'Forbidden' });
        return;
      }

      const room = `user-${userId}`;
      socket.join(room);
      console.log(`User joined room ${room}:`, socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function notifyNewReport(report: any) {
  if (io) {
    io.to('admin-room').emit('new-report', report);
  }
}

export function notifyReportUpdate(reportId: string, update: any) {
  if (io) {
    io.emit('report-update', { reportId, update });
  }
}

export function notifyUserIncident(userId: string, payload: any) {
  if (io) {
    io.to(`user-${userId}`).emit('incident-notification', payload);
  }
}

// Vehicle tracking with position history for bearing calculation
const vehicleHistory = new Map<string, { lat: number; lng: number; timestamp: number }>();

export function notifyVehicleUpdate(vehicles: any[]) {
  if (!io) return;

  // Calculate bearing for each vehicle based on previous position
  const vehiclesWithBearing = vehicles.map(vehicle => {
    const vehicleId = vehicle.id;
    const currentPos = { lat: vehicle.position.latitude, lng: vehicle.position.longitude, timestamp: Date.now() };
    const previousPos = vehicleHistory.get(vehicleId);

    let bearing = vehicle.bearing || 0;
    
    // Calculate bearing if we have previous position
    if (previousPos && previousPos.lat !== currentPos.lat && previousPos.lng !== currentPos.lng) {
      // Calculate bearing using Haversine formula
      const dLng = (currentPos.lng - previousPos.lng) * Math.PI / 180;
      const lat1 = previousPos.lat * Math.PI / 180;
      const lat2 = currentPos.lat * Math.PI / 180;
      
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    // Update history
    vehicleHistory.set(vehicleId, currentPos);

    return { ...vehicle, bearing };
  });

  io.emit('vehicle-update', vehiclesWithBearing);
}

export function startVehicleUpdateService() {
  if (!io) return;

  console.log('🚌 Starting vehicle update service (7s interval)...');

  /**
   * Get display short name for a route (from GTFS data)
   */
  function getRouteShortName(routeId: string): string {
    const route = routeMapping[routeId as keyof typeof routeMapping];
    return route?.short_name || routeId;
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

  const updateVehicles = async () => {
    try {
      // Fetch directly from Sofia Traffic API (not via HTTP to avoid bootstrap issues)
      const data = await getRealtimeData();

      const vehicles = data.vehicle_positions
        .map((vehicle: any) => {
          const tripId = vehicle.trip?.tripId;
          const routeId = vehicle.trip?.routeId;
          const timestampSeconds = parseInt(vehicle.timestamp || '0', 10);
          const timestampMs = timestampSeconds * 1000;
          const vehicleId = vehicle.vehicle?.id || `${routeId}-${tripId}`;
          const speed = (vehicle.position?.speed || 0) * 3.6;

          return {
            id: vehicleId,
            trip_id: tripId,
            route_id: routeId,
            route_short_name: getRouteShortName(routeId || ''),
            route_type: getRouteType(routeId || ''),
            position: {
              latitude: vehicle.position?.latitude || 0,
              longitude: vehicle.position?.longitude || 0,
            },
            current_stop: vehicle.stopId,
            speed: speed,
            bearing: 0,
            color: getVehicleColorByHash(vehicleId),
            timestamp: timestampMs,
            status: getStatusString(vehicle.currentStatus),
          };
        })
        .filter((v: any) => v.position.latitude !== 0 && v.position.longitude !== 0);

      if (vehicles.length > 0) {
        notifyVehicleUpdate(vehicles);
      }
    } catch (error) {
      console.error('Error updating vehicles:', error);
    }
  };

  // Wait 3 seconds before first update to allow server to fully start
  setTimeout(() => {
    updateVehicles();
    
    // Update every 30 seconds to reduce jittering and improve smoothness
    setInterval(() => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      updateVehicles();
    }, 30000);
  }, 3000);
}
