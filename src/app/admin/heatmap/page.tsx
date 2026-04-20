'use client';

import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { useI18n } from '@/i18n';

type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
  category: string;
  status: string;
};

export default function HeatmapPage() {
  const { locale } = useI18n();
  const mapContainer = useRef<HTMLDivElement>(null);
  const copy = {
    category: locale === 'bg' ? 'Категория' : locale === 'en' ? 'Category' : 'الفئة',
    status: locale === 'bg' ? 'Статус' : locale === 'en' ? 'Status' : 'الحالة',
    weight: locale === 'bg' ? 'Тежест' : locale === 'en' ? 'Weight' : 'الوزن',
    adminMap: locale === 'bg' ? 'Админ карта на топлината' : locale === 'en' ? 'Admin heat map' : 'الخريطة الحرارية للإدارة',
    title: locale === 'bg' ? 'Топлинна карта на сигналите' : locale === 'en' ? 'Reports heatmap' : 'الخريطة الحرارية للبلاغات',
    total: locale === 'bg' ? 'Общо сигнали' : locale === 'en' ? 'Total reports' : 'إجمالي البلاغات',
    refresh: locale === 'bg' ? 'Обнови данните' : locale === 'en' ? 'Refresh data' : 'تحديث البيانات',
    loading: locale === 'bg' ? 'Зареждане на картата...' : locale === 'en' ? 'Loading map...' : 'جار تحميل الخريطة...',
    legend: locale === 'bg' ? 'Легенда' : locale === 'en' ? 'Legend' : 'مفتاح الألوان',
  };
  const map = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const heatLayersRef = useRef<any[]>([]);
  const pointLayersRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (!mapContainer.current || map.current || typeof window === 'undefined') return;

      const L = (await import('leaflet')).default;
      if (isCancelled) return;
      leafletRef.current = L;

      map.current = L.map(mapContainer.current, {
        zoomControl: true,
      });

      map.current.setView([42.6977, 23.3219], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      map.current.whenReady(() => {
        renderHeatmap(heatmapData);
        setLoading(false);
      });
    };

    initMap();

    return () => {
      isCancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      renderHeatmap(heatmapData);
    }
  }, [heatmapData]);

  const fetchHeatmapData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/heatmap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHeatmapData(response.data.data);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    }
  };

  const renderHeatmap = (data: HeatmapPoint[]) => {
    const L = leafletRef.current;
    if (!map.current || !L) return;

    heatLayersRef.current.forEach((layer) => map.current?.removeLayer(layer));
    pointLayersRef.current.forEach((layer) => map.current?.removeLayer(layer));
    heatLayersRef.current = [];
    pointLayersRef.current = [];

    if (data.length === 0) {
      return;
    }

    const statusColor: Record<string, string> = {
      PENDING: '#FFA500',
      IN_REVIEW: '#3B82F6',
      IN_PROGRESS: '#800080',
      RESOLVED: '#22C55E',
      REJECTED: '#EF4444',
    };

    data.forEach((point) => {
      const radius = point.weight === 3 ? 260 : point.weight === 2 ? 180 : 120;
      const opacity = point.weight === 3 ? 0.3 : point.weight === 2 ? 0.22 : 0.15;

      const heatCircle = L.circle([point.lat, point.lng], {
        radius,
        stroke: false,
        fillColor: '#ef4444',
        fillOpacity: opacity,
        interactive: false,
      }).addTo(map.current!);

      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 1.5,
        fillColor: statusColor[point.status] || '#3B82F6',
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<div class="p-2">
            <p><strong>${copy.category}:</strong> ${point.category.replace('_', ' ')}</p>
            <p><strong>${copy.status}:</strong> ${point.status.replace('_', ' ')}</p>
            <p><strong>${copy.weight}:</strong> ${point.weight}</p>
          </div>`
        )
        .addTo(map.current!);

      heatLayersRef.current.push(heatCircle);
      pointLayersRef.current.push(marker);
    });
  };

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{copy.adminMap}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">{copy.title}</h1>
      </div>

      <div className="rounded-3xl data-card p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] admin-muted">{copy.total}</p>
            <p className="text-3xl font-semibold admin-text mt-2">{heatmapData.length}</p>
          </div>
          <button onClick={fetchHeatmapData} className="rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white px-5 py-3 text-xs uppercase tracking-[0.35em] hover:shadow-lg transition">
           {copy.refresh}
          </button>
        </div>
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-[var(--a-surface)] to-[var(--a-surface2)] border border-[var(--a-border)] p-2 overflow-hidden relative">
        <div
          ref={mapContainer}
          className="w-full h-[600px] rc-map rounded-[28px]"
          style={{ minHeight: '600px' }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-[var(--a-surface)]/90 backdrop-blur">
            <div className="text-sm uppercase tracking-[0.3em] admin-muted">{copy.loading}</div>
          </div>
        )}
      </div>

      <div className="rounded-3xl data-card p-6 mt-6">
        <h3 className="font-semibold rc-display admin-text mb-4">{copy.legend}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm admin-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Чакащ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Преглеждан</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>В процес</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Решен</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Отхвърлен</span>
          </div>
        </div>
      </div>
    </div>
  );
}
