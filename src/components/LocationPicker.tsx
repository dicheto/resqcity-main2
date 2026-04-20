'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '@/i18n';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number, district?: string) => void;
}

const SOFIA_DISTRICTS = [
  { name: 'Район 1 - Средец', bounds: [[42.6877, 23.3119], [42.7077, 23.3419]] },
  { name: 'Район 2 - Красно село', bounds: [[42.6577, 23.2819], [42.6777, 23.3119]] },
  { name: 'Район 3 - Кремиковци', bounds: [[42.7377, 23.4219], [42.7577, 23.4519]] },
  { name: 'Район 4 - Искър', bounds: [[42.7177, 23.2319], [42.7377, 23.2619]] },
  { name: 'Район 5 - Овча купел', bounds: [[42.6677, 23.2519], [42.6877, 23.2819]] },
  { name: 'Район 6 - Красна поляна', bounds: [[42.6377, 23.3719], [42.6577, 23.4019]] },
  { name: 'Район 7 - Изгрев', bounds: [[42.6677, 23.3519], [42.6877, 23.3819]] },
  { name: 'Район 8 - Лозенец', bounds: [[42.6677, 23.3119], [42.6877, 23.3419]] },
  { name: 'Район 9 - Връбница', bounds: [[42.7277, 23.2619], [42.7477, 23.2919]] },
  { name: 'Район 10 - Витоша', bounds: [[42.6377, 23.2819], [42.6577, 23.3119]] },
  { name: 'Район 11 - Слатина', bounds: [[42.7077, 23.3719], [42.7277, 23.4019]] },
  { name: 'Район 12 - Подуяне', bounds: [[42.7077, 23.3419], [42.7277, 23.3719]] },
  { name: 'Район 13 - Нови Искър', bounds: [[42.7577, 23.2319], [42.7777, 23.2619]] },
  { name: 'Район 14 - Триадица', bounds: [[42.6777, 23.3019], [42.6977, 23.3319]] },
  { name: 'Район 15 - Оборище', bounds: [[42.6977, 23.3319], [42.7177, 23.3619]] },
  { name: 'Район 16 - Нови Искър - Банкя', bounds: [[42.7377, 23.1619], [42.7577, 23.1919]] },
  { name: 'Район 17 - Витоша - Бояна', bounds: [[42.6177, 23.2519], [42.6377, 23.2819]] },
  { name: 'Район 18 - Оборище - Редута', bounds: [[42.7077, 23.3119], [42.7277, 23.3419]] },
  { name: 'Район 19 - Студентски', bounds: [[42.6577, 23.3419], [42.6777, 23.3719]] },
  { name: 'Район 20 - Надежда', bounds: [[42.7377, 23.2919], [42.7577, 23.3219]] },
  { name: 'Район 21 - Възраждане', bounds: [[42.6877, 23.2919], [42.7077, 23.3219]] },
  { name: 'Район 22 - Илинден', bounds: [[42.6777, 23.3719], [42.6977, 23.4019]] },
  { name: 'Район 23 - Люлин', bounds: [[42.7077, 23.2319], [42.7277, 23.2619]] },
  { name: 'Район 24 - Младост', bounds: [[42.6377, 23.3419], [42.6577, 23.3719]] },
];

function getDistrictFromCoordinates(lat: number, lng: number): string | undefined {
  for (const district of SOFIA_DISTRICTS) {
    const [[minLat, minLng], [maxLat, maxLng]] = district.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return district.name;
    }
  }
  return undefined;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [district, setDistrict] = useState<string | undefined>();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([latitude, longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const marker = L.marker([latitude, longitude], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const dist = getDistrictFromCoordinates(pos.lat, pos.lng);
      setDistrict(dist);
      onLocationChange(pos.lat, pos.lng, dist);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      const dist = getDistrictFromCoordinates(e.latlng.lat, e.latlng.lng);
      setDistrict(dist);
      onLocationChange(e.latlng.lat, e.latlng.lng, dist);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const initialDistrict = getDistrictFromCoordinates(latitude, longitude);
    setDistrict(initialDistrict);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude]);
      const dist = getDistrictFromCoordinates(latitude, longitude);
      setDistrict(dist);
    }
  }, [latitude, longitude]);

  return (
    <div>
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200"
      />
      {district && (
        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{tr('Избран район:', 'Selected district:', 'المنطقة المحددة:')}</span> {district}
          </p>
        </div>
      )}
      <p className="text-xs text-slate-500 mt-2">
        {tr('Кликнете на картата или плъзнете маркера, за да изберете локация', 'Click on the map or drag the marker to select a location', 'انقر على الخريطة أو اسحب العلامة لتحديد الموقع')}
      </p>
    </div>
  );
}
