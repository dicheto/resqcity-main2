'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    const realtimeMode = process.env.NEXT_PUBLIC_REALTIME_MODE || 'auto';
    const isProd = process.env.NODE_ENV === 'production';

    let url = configuredUrl || 'http://localhost:3000';

    if (isProd && (!configuredUrl || configuredUrl.includes('localhost'))) {
      url = window.location.origin;
    }

    const shouldForcePolling =
      realtimeMode === 'polling' ||
      (isProd && (!configuredUrl || configuredUrl.includes('localhost')));

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    socketRef.current = io(url, {
      auth: token ? { token } : undefined,
      transports: shouldForcePolling ? ['polling'] : ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    socketRef.current.on('auth-error', (payload: { message?: string }) => {
      console.warn('WebSocket auth error:', payload?.message || 'unknown');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinAdminRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('join-admin');
    }
  }, []);

  const joinUserRoom = useCallback((userId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('join-user', userId);
    }
  }, []);

  const onNewReport = useCallback((callback: (report: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('new-report', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-report', callback);
      }
    };
  }, []);

  const onReportUpdate = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('report-update', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('report-update', callback);
      }
    };
  }, []);

  const onIncidentNotification = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('incident-notification', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('incident-notification', callback);
      }
    };
  }, []);

  const onVehicleUpdate = useCallback((callback: (vehicles: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on('vehicle-update', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('vehicle-update', callback);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinAdminRoom,
    joinUserRoom,
    onNewReport,
    onReportUpdate,
    onIncidentNotification,
    onVehicleUpdate,
  };
}
