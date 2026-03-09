'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000';
    socketRef.current = io(url);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinAdminRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('join-admin');
    }
  };

  const joinUserRoom = (userId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('join-user', userId);
    }
  };

  const onNewReport = (callback: (report: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('new-report', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-report', callback);
      }
    };
  };

  const onReportUpdate = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('report-update', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('report-update', callback);
      }
    };
  };

  const onIncidentNotification = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('incident-notification', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('incident-notification', callback);
      }
    };
  };

  const onVehicleUpdate = (callback: (vehicles: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on('vehicle-update', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('vehicle-update', callback);
      }
    };
  };

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
