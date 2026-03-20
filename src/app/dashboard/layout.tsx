'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { isConnected, joinUserRoom, onIncidentNotification } = useWebSocket();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Check if user is admin, should go to admin panel
      if (['ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COUNCILOR'].includes(parsedUser.role)) {
        console.warn(`Admin user ${parsedUser.email} accessed dashboard, redirecting to admin`);
        router.push('/admin');
        return;
      }

      if (parsedUser.role === 'INSTITUTION') {
        router.push('/institutions');
        return;
      }
      
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user || !isConnected) return;

    joinUserRoom(user.userId || user.id);

    const unsubscribe = onIncidentNotification((payload: { title?: string; message?: string }) => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(payload.title || 'ResQCity известие', {
            body: payload.message || 'Имате нова актуализация по сигнал.',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(payload.title || 'ResQCity известие', {
                body: payload.message || 'Имате нова актуализация по сигнал.',
              });
            }
          });
        }
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [user, isConnected, joinUserRoom, onIncidentNotification]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-[var(--s-orange)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
