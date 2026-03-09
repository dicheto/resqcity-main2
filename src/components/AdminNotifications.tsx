'use client';

import { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  reportId?: string;
  timestamp: string;
  note?: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, joinAdminRoom, onReportUpdate } = useWebSocket();

  useEffect(() => {
    // Join admin room for notifications
    if (isConnected) {
      joinAdminRoom();
    }
  }, [isConnected, joinAdminRoom]);

  useEffect(() => {
    // Listen for report updates
    const unsubscribe = onReportUpdate((data: any) => {
      console.log('Report update received:', data);
      
      const notification: Notification = {
        id: `${data.reportId}-${Date.now()}`,
        type: data.newStatus === 'REJECTED' ? 'error' : data.newStatus === 'RESOLVED' ? 'success' : 'info',
        title: `Статус променен: ${data.statusLabel}`,
        message: `${data.title} - ${data.category}`,
        reportId: data.reportId,
        timestamp: data.timestamp || new Date().toISOString(),
        note: data.note,
      };

      setNotifications(prev => [notification, ...prev]);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 10000);
    });

    return unsubscribe;
  }, [onReportUpdate]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[var(--a-surface2)] transition-colors"
      >
        <Bell size={20} className="admin-text" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] overflow-y-auto data-card rounded-2xl shadow-2xl border border-[var(--a-border)] z-50">
          <div className="sticky top-0 bg-[var(--a-surface1)] p-4 border-b border-[var(--a-border)] flex items-center justify-between">
            <h3 className="font-bold admin-text">Уведомления</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs admin-muted hover:text-violet-400 transition-colors"
                >
                  Изчисти всички
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[var(--a-surface2)] rounded-lg transition-colors"
              >
                <X size={16} className="admin-text" />
              </button>
            </div>
          </div>

          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center admin-muted text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p>Няма нови уведомления</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-xl bg-[var(--a-surface2)] hover:bg-[var(--a-surface3)] transition-colors border border-[var(--a-border)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold admin-text text-sm mb-1">
                          {notification.title}
                        </p>
                        <p className="admin-muted text-xs mb-1">
                          {notification.message}
                        </p>
                        {notification.note && (
                          <div className="mt-2 p-2 rounded-lg bg-[var(--a-surface1)] border border-[var(--a-border)]">
                            <p className="text-xs admin-muted mb-1 font-semibold">Бележка:</p>
                            <p className="text-xs admin-text">{notification.note}</p>
                          </div>
                        )}
                        <p className="text-[10px] admin-muted mt-2">
                          {new Date(notification.timestamp).toLocaleString('bg-BG')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 p-1 hover:bg-[var(--a-surface1)] rounded-lg transition-colors"
                      >
                        <X size={14} className="admin-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WebSocket Status */}
          <div className="sticky bottom-0 bg-[var(--a-surface1)] p-3 border-t border-[var(--a-border)]">
            <div className="flex items-center justify-between text-xs">
              <span className="admin-muted">Realtime статус:</span>
              <span className={`flex items-center gap-1 font-semibold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                {isConnected ? 'Свързан' : 'Изключен'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
        {notifications.slice(0, 3).map((notification) => (
          <div
            key={`toast-${notification.id}`}
            className="pointer-events-auto animate-slide-in-right data-card rounded-xl p-4 shadow-2xl border border-[var(--a-border)] max-w-sm"
          >
            <div className="flex items-start gap-3">
              {getIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <p className="font-semibold admin-text text-sm mb-1">
                  {notification.title}
                </p>
                <p className="admin-muted text-xs">
                  {notification.message}
                </p>
                {notification.note && (
                  <p className="mt-2 text-xs admin-text bg-[var(--a-surface2)] p-2 rounded-lg">
                    <span className="font-semibold">Бележка:</span> {notification.note}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-[var(--a-surface2)] rounded-lg transition-colors"
              >
                <X size={14} className="admin-muted" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
