'use client';

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export default function HeatmapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [23.3219, 42.6977], // Sofia, Bulgaria
      zoom: 12,
    });

    map.current.on('load', () => {
      if (heatmapData.length > 0) {
        addHeatmapLayer(heatmapData);
      }
      setLoading(false);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded() && heatmapData.length > 0) {
      addHeatmapLayer(heatmapData);
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

  const addHeatmapLayer = (data: any[]) => {
    if (!map.current) return;

    // Remove existing layers and sources
    if (map.current.getLayer('heatmap-layer')) {
      map.current.removeLayer('heatmap-layer');
    }
    if (map.current.getLayer('points-layer')) {
      map.current.removeLayer('points-layer');
    }
    if (map.current.getSource('reports')) {
      map.current.removeSource('reports');
    }

    // Create GeoJSON from data
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: data.map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat],
        },
        properties: {
          weight: point.weight,
          category: point.category,
          status: point.status,
        },
      })),
    };

    map.current.addSource('reports', {
      type: 'geojson',
      data: geojson,
    });

    // Add heatmap layer
    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'reports',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(33,102,172,0)',
          0.2,
          'rgb(103,169,207)',
          0.4,
          'rgb(209,229,240)',
          0.6,
          'rgb(253,219,199)',
          0.8,
          'rgb(239,138,98)',
          1,
          'rgb(178,24,43)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0.5],
      },
    });

    // Add circle layer for individual points
    map.current.addLayer({
      id: 'points-layer',
      type: 'circle',
      source: 'reports',
      minzoom: 14,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 5, 22, 10],
        'circle-color': [
          'match',
          ['get', 'status'],
          'PENDING',
          '#FFA500',
          'IN_PROGRESS',
          '#800080',
          'RESOLVED',
          '#22C55E',
          'REJECTED',
          '#EF4444',
          '#3B82F6',
        ],
        'circle-stroke-color': 'white',
        'circle-stroke-width': 2,
        'circle-opacity': 0.8,
      },
    });

    // Add click handler for points
    map.current.on('click', 'points-layer', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const coordinates = (feature.geometry as any).coordinates.slice();
      const { category, status } = feature.properties as any;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(
          `<div class="p-2">
            <p><strong>Категория:</strong> ${category.replace('_', ' ')}</p>
            <p><strong>Статус:</strong> ${status.replace('_', ' ')}</p>
          </div>`
        )
        .addTo(map.current!);
    });

    map.current.on('mouseenter', 'points-layer', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'points-layer', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });
  };

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">Админ карта на топлината</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">Топлинна карта на сигналите</h1>
      </div>

      <div className="rounded-3xl data-card p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] admin-muted">Общо сигнали</p>
            <p className="text-3xl font-semibold admin-text mt-2">{heatmapData.length}</p>
          </div>
          <button onClick={fetchHeatmapData} className="rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white px-5 py-3 text-xs uppercase tracking-[0.35em] hover:shadow-lg transition">
           Обнови данните
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
            <div className="text-sm uppercase tracking-[0.3em] admin-muted">Зареждане на картата...</div>
          </div>
        )}
      </div>

      <div className="rounded-3xl data-card p-6 mt-6">
        <h3 className="font-semibold rc-display admin-text mb-4">Легенда</h3>
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
