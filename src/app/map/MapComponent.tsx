'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCategoryLabel } from '@/hooks/lib/report-format';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useI18n } from '@/i18n';

interface Store {
  id: number;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  products: Record<string, number>;
}

interface Report {
  id: string;
  title: string;
  lat: number;
  lng: number;
  status: string;
  category?: string;
  createdAt?: string;
}

interface PublicReportDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  district?: string | null;
  category?: {
    name?: string | null;
    nameBg?: string | null;
    nameEn?: string | null;
    key?: string | null;
  } | null;
  createdAt: string;
}

interface Weather {
  temp: number;
  todayMin: number;
  todayMax: number;
  tomorrowMin: number;
  tomorrowMax: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  description: string;
  icon?: string;
  city_name?: string;
}

interface WeatherPoint {
  lat: number;
  lng: number;
  temp: number;
  city_name?: string;
  weather?: {
    description: string;
    icon: string;
  };
  humidity?: number;
  wind_speed?: number;
}

interface TransitStop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number;
}

interface Vehicle {
  id: string;
  trip_id: string;
  route_id: string;
  route_short_name: string;
  position: {
    latitude: number;
    longitude: number;
  };
  current_stop: string; // Stop ID from API
  current_stop_name?: string; // Stop name if available
  speed: number; // km/h
  bearing: number; // Calculated from position history (0-360 degrees)
  color: string; // Color based on vehicle type
  delay?: number; // Delay in seconds
  timestamp: number;
  status: string; // String status from Sofia Traffic API (e.g., "На пристигане")
  occupancy_status: string;
  occupancy_percentage?: number; // Optional - only if valid data
  vehicle_type: 'tram' | 'trolley' | 'bus';
  vehicle_model?: string;
  icon: string;
}

interface TransitAlert {
  id: string;
  effect_code: string;
  effect_label: string;
  title: string;
  description: string;
  affected_route_ids: string[];
  affected_lines: string[];
  is_network_wide: boolean;
  cause?: string;
}

interface Accident {
  year: string;
  date: string;
  time: string;
  lat: number;
  lng: number;
  type: string;
  injured: boolean;
  died: boolean;
}

interface RiskZone {
  lat: number;
  lng: number;
  count: number;
  severity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  mostCommonType: string;
}

interface Shelter {
  id: number;
  name: string;
  address: string;
  district: string;
  owner: string;
  type: 'Противорадиационно укритие' | 'Скривалище';
  category: 'І-ва категория' | 'II-ра категория';
  lat: number;
  lng: number;
  capacity?: number;
  description: string;
}

interface SocialService {
  id: string;
  category: number;
  name: string;
  shortName: string;
  type: string;
  typePrimary: string;
  typeSpecific: string;
  provider: string;
  address: string;
  phone: string;
  contact: string;
  web: string;
  email: string;
  ageRange: string;
  riskGroup: string;
  serviceModel: string;
  targetGroup: string;
  capacity: number | null;
  lat: number;
  lng: number;
}

interface SocialServiceGeoJsonFeature {
  properties?: Record<string, any>;
  geometry?: {
    type?: string;
    coordinates?: any;
  };
}

function InteractiveMapComponent() {
  const router = useRouter();
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const { isConnected, onVehicleUpdate } = useWebSocket();
  const mapRef = useRef<L.Map | null>(null);
  const reportMarkersRef = useRef<L.Layer[]>([]);
  const storeMarkersRef = useRef<L.Layer[]>([]);
  const weatherHeatRef = useRef<L.Layer[]>([]);
  const transitMarkersRef = useRef<L.Layer[]>([]);
  const vehicleMarkersRef = useRef<Map<string, L.Layer>>(new Map());
  const routeLayersRef = useRef<L.Layer[]>([]);
  const stopScheduleLayersRef = useRef<L.Layer[]>([]);
  const accidentMarkersRef = useRef<L.Layer[]>([]);
  const riskZonesRef = useRef<L.Layer[]>([]);
  const accidentsRendererRef = useRef<L.Canvas | null>(null);
  const shelterMarkersRef = useRef<L.Layer[]>([]);
  const socialServiceMarkersRef = useRef<L.Layer[]>([]);
  const showWeatherRef = useRef(false);
  const realtimeFetchInFlightRef = useRef(false);
  const lastRealtimeFetchAtRef = useRef(0);
  const vehiclePollingErrorCountRef = useRef(0);

  const [showReports, setShowReports] = useState(true);
  const [showStores, setShowStores] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [showAccidents, setShowAccidents] = useState(false);
  const [showRiskMap, setShowRiskMap] = useState(false);
  const [showShelters, setShowShelters] = useState(false);
  const [showSocialServices, setShowSocialServices] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [accidentStats, setAccidentStats] = useState({ total: 0 });
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [socialServices, setSocialServices] = useState<SocialService[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);
  const [socialServicesLoading, setSocialServicesLoading] = useState(false);
  const [accidentsLoading, setAccidentsLoading] = useState(false);
  const [riskMapLoading, setRiskMapLoading] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<Weather | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<PublicReportDetail | null>(null);
  const [reportDetailsLoading, setReportDetailsLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [weatherPoints, setWeatherPoints] = useState<WeatherPoint[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [transitStops, setTransitStops] = useState<TransitStop[]>([]);
  const [transitLoading, setTransitLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [alerts, setAlerts] = useState<TransitAlert[]>([]);
  const [vehicleStats, setVehicleStats] = useState<any>(null);
  const [routeFilter, setRouteFilter] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [mapZoom, setMapZoom] = useState(7);

  const lastViewportRef = useRef<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const viewportFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch accidents for current viewport (individual points, optimized by viewport)
  const fetchAccidentsByViewport = async () => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    // Avoid fetching if viewport hasn't changed significantly
    if (lastViewportRef.current) {
      const lastLat = (lastViewportRef.current.minLat + lastViewportRef.current.maxLat) / 2;
      const lastLng = (lastViewportRef.current.minLng + lastViewportRef.current.maxLng) / 2;
      const currentLat = (minLat + maxLat) / 2;
      const currentLng = (minLng + maxLng) / 2;

      const latDiff = Math.abs(lastLat - currentLat);
      const lngDiff = Math.abs(lastLng - currentLng);

      // Skip if movement is less than ~5km
      if (latDiff < 0.05 && lngDiff < 0.05) {
        return;
      }
    }

    lastViewportRef.current = { minLat, maxLat, minLng, maxLng };

    setAccidentsLoading(true);
    try {
      const params = new URLSearchParams({
        minLat: minLat.toString(),
        maxLat: maxLat.toString(),
        minLng: minLng.toString(),
        maxLng: maxLng.toString(),
      });

      const response = await fetch(`/api/accidents?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setAccidents(data.data);
        setAccidentStats({
          total: data.total || data.data.length || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching accidents:', err);
    } finally {
      setAccidentsLoading(false);
    }
  };

  // Debounced viewport fetch
  const handleViewportChange = () => {
    if (viewportFetchTimeoutRef.current) {
      clearTimeout(viewportFetchTimeoutRef.current);
    }
    viewportFetchTimeoutRef.current = setTimeout(() => {
      fetchAccidentsByViewport();
    }, 500);
  };

  const dedupeVehiclesById = (incomingVehicles: Vehicle[]) => {
    const uniqueVehicles = new Map<string, Vehicle>();

    incomingVehicles.forEach((vehicle) => {
      const vehicleId = vehicle.id || `${vehicle.route_id}-${vehicle.trip_id}`;
      const existing = uniqueVehicles.get(vehicleId);

      if (!existing || (vehicle.timestamp || 0) >= (existing.timestamp || 0)) {
        uniqueVehicles.set(vehicleId, vehicle);
      }
    });

    return Array.from(uniqueVehicles.values());
  };

  const getVehicleRouteLabel = (vehicle: Vehicle) => {
    const shortName = (vehicle.route_short_name || '').trim();
    if (shortName && shortName !== '0') {
      return shortName;
    }

    const routeId = (vehicle.route_id || '').trim();
    if (!routeId) {
      return '?';
    }

    const compact = routeId.replace(/^[A-Z]+/i, '').trim();
    if (compact && compact !== '0') {
      return compact;
    }

    return routeId;
  };

  // Parse human-friendly route filter: "Тролейбус 7", "Автобус 22", "7", etc.
  const parseRouteFilter = (filter: string): { vType?: string; line?: string } => {
    const n = filter.trim().toLowerCase();
    const m = n.match(/^(автобус|тролейбус|трамвай|bus|trolley|tram)\s*(\S+)?/);
    if (m) {
      const typeMap: Record<string, string> = {
        автобус: 'bus', bus: 'bus',
        тролейбус: 'trolley', trolley: 'trolley',
        трамвай: 'tram', tram: 'tram',
      };
      return { vType: typeMap[m[1]], line: m[2] };
    }
    return { line: filter.trim() };
  };

  const getSocialServiceCategoryColor = (category: number) => {
    const categoryColors: Record<number, string> = {
      1: '#3B82F6',
      2: '#8B5CF6',
      3: '#F59E0B',
      4: '#EF4444',
      5: '#06B6D4',
      6: '#10B981',
      7: '#EC4899',
      8: '#6B7280',
    };

    return categoryColors[category] || '#64748B';
  };

  const getServiceCoordinates = (feature: SocialServiceGeoJsonFeature): [number, number] | null => {
    const geometry = feature.geometry;
    if (!geometry || !geometry.coordinates) return null;

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
      const [lng, lat] = geometry.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    if (geometry.type === 'MultiPoint' && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) {
      const [lng, lat] = geometry.coordinates[0] || [];
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    return null;
  };

  const normalizeServiceText = (value: unknown) => String(value || '').trim();

  const normalizeSocialServiceFeature = (
    feature: SocialServiceGeoJsonFeature,
    index: number
  ): SocialService | null => {
    const coordinates = getServiceCoordinates(feature);
    if (!coordinates) return null;

    const [lat, lng] = coordinates;
    const props = feature.properties || {};
    const name = normalizeServiceText(props.name);
    const shortName = normalizeServiceText(props.s_name);
    const provider = normalizeServiceText(props.provider);
    const displayName = shortName || name || provider || tr('Социална услуга', 'Social service', 'خدمة اجتماعية');
    const parsedCategory = Number(props.category);
    const parsedCapacity = Number(props.d_capacity);

    return {
      id: String(props.id ?? index + 1),
      category: Number.isFinite(parsedCategory) ? parsedCategory : 0,
      name: displayName,
      shortName,
      type: normalizeServiceText(props.type),
      typePrimary: normalizeServiceText(props.type_1),
      typeSpecific: normalizeServiceText(props.type_3),
      provider,
      address: normalizeServiceText(props.address),
      phone: normalizeServiceText(props.phone),
      contact: normalizeServiceText(props.contact),
      web: normalizeServiceText(props.web),
      email: normalizeServiceText(props.mail),
      ageRange: normalizeServiceText(props.age),
      riskGroup: normalizeServiceText(props.risk_group),
      serviceModel: normalizeServiceText(props.d_type_2),
      targetGroup: normalizeServiceText(props.d_target),
      capacity: Number.isFinite(parsedCapacity) ? parsedCapacity : null,
      lat,
      lng,
    };
  };

  const getOffsetPosition = (
    lat: number,
    lng: number,
    indexAtSameCoordinate: number
  ): [number, number] => {
    if (indexAtSameCoordinate === 0) return [lat, lng];

    const ring = Math.ceil(Math.sqrt(indexAtSameCoordinate));
    const angle = (indexAtSameCoordinate * 45 * Math.PI) / 180;
    const offsetStep = 0.00018;
    const offset = ring * offsetStep;

    return [lat + Math.sin(angle) * offset, lng + Math.cos(angle) * offset];
  };

  // Initialize Leaflet map - Centered on Sofia
  useEffect(() => {
    if (!mapRef.current) {
      // Sofia coordinates: 42.6961°N, 23.3219°E
      const map = L.map('map').setView([42.6961, 23.3219], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">${tr('OpenStreetMap', 'OpenStreetMap', 'OpenStreetMap')}</a>`,
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      accidentsRendererRef.current = L.canvas({ padding: 0.5 });

      setMapZoom(map.getZoom());

      const handleMapClick = (e: L.LeafletMouseEvent) => {
        if (showWeatherRef.current) {
          getWeatherDetails(e.latlng.lat, e.latlng.lng);
        }
      };

      const handleZoomEnd = () => {
        setMapZoom(map.getZoom());
        handleViewportChange(); // Fetch new accidents when viewport changes
      };

      const handleMoveEnd = () => {
        handleViewportChange(); // Fetch new accidents when viewport moves
      };

      // Click handler for weather details
      map.on('click', handleMapClick);
      map.on('zoomend', handleZoomEnd);
      map.on('moveend', handleMoveEnd);

      // Keep handler refs on map instance for proper cleanup
      (map as any)._rcHandleMapClick = handleMapClick;
      (map as any)._rcHandleZoomEnd = handleZoomEnd;
      (map as any)._rcHandleMoveEnd = handleMoveEnd;
    }

    return () => {
      if (mapRef.current) {
        const currentMap = mapRef.current as any;
        if (currentMap._rcHandleMapClick) {
          mapRef.current.off('click', currentMap._rcHandleMapClick);
        }
        if (currentMap._rcHandleZoomEnd) {
          mapRef.current.off('zoomend', currentMap._rcHandleZoomEnd);
        }
        if (currentMap._rcHandleMoveEnd) {
          mapRef.current.off('moveend', currentMap._rcHandleMoveEnd);
        }
        if (viewportFetchTimeoutRef.current) {
          clearTimeout(viewportFetchTimeoutRef.current);
        }
        accidentsRendererRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Keep latest toggle value in map click handler
  useEffect(() => {
    showWeatherRef.current = showWeather;
  }, [showWeather]);

  const tempToColor = (temp: number) => {
    const minTemp = -5;
    const maxTemp = 35;
    const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
    const ratio = (clamped - minTemp) / (maxTemp - minTemp);
    const r = Math.round(33 + ratio * 222);
    const g = Math.round(90 + (1 - Math.abs(ratio - 0.5) * 2) * 120);
    const b = Math.round(240 - ratio * 210);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const fetchWeatherGrid = async (): Promise<WeatherPoint[]> => {
    try {
      const response = await fetch('/api/weather/grid');
      const data = await response.json();
      
      if (data.success && data.data) {
        const mappedPoints = data.data.map((point: any) => ({
          lat: point.lat,
          lng: point.lon,
          temp: point.temp,
          city_name: point.city_name,
          weather: point.weather,
          humidity: point.humidity,
          wind_speed: point.wind_speed,
        }));

        setWeatherPoints(mappedPoints);
        return mappedPoints;
      }
    } catch (error) {
      console.error('Error fetching weather grid:', error);
    }

    return [];
  };

  const findNearestWeatherPoint = (lat: number, lng: number, points: WeatherPoint[]) => {
    if (points.length === 0) return null;

    return points.reduce((nearest, point) => {
      const nearestDistance = (nearest.lat - lat) ** 2 + (nearest.lng - lng) ** 2;
      const pointDistance = (point.lat - lat) ** 2 + (point.lng - lng) ** 2;
      return pointDistance < nearestDistance ? point : nearest;
    });
  };

  const getWeatherDetails = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    setSelectedLocation({ lat, lng });

    try {
      let points = weatherPoints;
      if (points.length === 0) {
        points = await fetchWeatherGrid();
      }

      const nearestPoint = findNearestWeatherPoint(lat, lng, points);
      if (nearestPoint) {
        setSelectedWeather({
          temp: nearestPoint.temp,
          todayMin: nearestPoint.temp - 2,
          todayMax: nearestPoint.temp + 2,
          tomorrowMin: nearestPoint.temp - 1,
          tomorrowMax: nearestPoint.temp + 3,
          feels_like: nearestPoint.temp,
          humidity: nearestPoint.humidity ?? 0,
          pressure: 1013,
          wind_speed: nearestPoint.wind_speed ?? 0,
          description: nearestPoint.weather?.description || tr('Без описание', 'No description', 'بدون وصف'),
          icon: nearestPoint.weather?.icon,
          city_name: nearestPoint.city_name,
        });
      }
    } catch (error) {
      console.error('Error fetching weather details:', error);
    } finally {
      setWeatherLoading(false);
    }
  };

  const getPublicReportDetails = async (reportId: string) => {
    setReportDetailsLoading(true);
    setSelectedReportDetails(null);

    try {
      const response = await fetch(`/api/reports/public/${reportId}`);
      const data = await response.json();

      if (response.ok && data) {
        setSelectedReportDetails(data);
      }
    } catch (error) {
      console.error('Error fetching public report details:', error);
    } finally {
      setReportDetailsLoading(false);
    }
  };

  // Weather heat overlay
  useEffect(() => {
    if (!mapRef.current) return;

    weatherHeatRef.current.forEach((layer) => mapRef.current?.removeLayer(layer));
    weatherHeatRef.current = [];

    if (!showWeather) {
      setSelectedWeather(null);
      setSelectedLocation(null);
      setWeatherPoints([]);
      return;
    }

    fetchWeatherGrid();
  }, [showWeather]);

  // Weather temperature layer (geo-anchored, stable while panning/zooming)
  useEffect(() => {
    if (!mapRef.current || !showWeather) {
      weatherHeatRef.current.forEach((layer) => mapRef.current?.removeLayer(layer));
      weatherHeatRef.current = [];
      return;
    }

    if (weatherPoints.length === 0) return;

    // Add weather markers with enhanced design
    weatherHeatRef.current.forEach((layer) => mapRef.current?.removeLayer(layer));
    weatherHeatRef.current = [];

    weatherPoints.forEach((point: any) => {
      const temperatureColor = tempToColor(point.temp);

      // Two concentric circles create a clear temperature zone that stays tied to map coordinates.
      // Create temperature zones - larger circles for better country coverage
      const outerZone = L.circle([point.lat, point.lng], {
        radius: 35000, // Increased radius for better coverage
        stroke: false,
        fillColor: temperatureColor,
        fillOpacity: 0.15,
        interactive: false,
      }).addTo(mapRef.current!);

      const innerZone = L.circle([point.lat, point.lng], {
        radius: 18000, // Increased radius for better coverage
        stroke: false,
        fillColor: temperatureColor,
        fillOpacity: 0.25,
        interactive: false,
      }).addTo(mapRef.current!);

      weatherHeatRef.current.push(outerZone, innerZone);
    });
  }, [weatherPoints, showWeather]);

  // Fetch stores
  useEffect(() => {
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        setStores(Array.isArray(data) ? data : data.value || []);
      })
      .catch(console.error);
  }, []);

  // Fetch reports
  useEffect(() => {
    fetch('/api/reports/public')
      .then((res) => res.json())
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  // Fetch shelters (always load for legend counts)
  useEffect(() => {
    setSheltersLoading(true);
    fetch('/api/shelters')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setShelters(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setSheltersLoading(false));
  }, []); // Load once on mount

  // Fetch social services (always load for legend counts)
  useEffect(() => {
    setSocialServicesLoading(true);
    fetch('/data/social-services-sofia.geojson')
      .then((res) => res.json())
      .then((data) => {
        const features = Array.isArray(data?.features) ? data.features : [];
        const normalized = features
          .map((feature: SocialServiceGeoJsonFeature, index: number) => normalizeSocialServiceFeature(feature, index))
          .filter((feature: SocialService | null): feature is SocialService => Boolean(feature));

        if (normalized.length > 0) {
          setSocialServices(normalized);
        }
      })
      .catch((err) => {
        console.error('Error fetching social services:', err);
      })
      .finally(() => {
        setSocialServicesLoading(false);
      });
  }, []); // Load once on mount

  // Fetch accidents based on viewport (always load for legend counts)
  useEffect(() => {
    // Always fetch accidents for stats, but only render when showAccidents is true
    fetchAccidentsByViewport();
  }, []); // Load once on mount

  // Fetch risk map zones (always load for legend counts)
  useEffect(() => {
    setRiskMapLoading(true);
    fetch('/api/accidents/risk-map?gridSize=0.015&minCount=3') // ~1.5km grid
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setRiskZones(data.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching risk map:', err);
      })
      .finally(() => {
        setRiskMapLoading(false);
      });
  }, []); // Load once on mount

  // Fetch transit stops (always load for vehicles)
  useEffect(() => {
    setTransitLoading(true);
    // Fetch ALL stops instead of sample
    fetch('/api/transit/stops')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stops) {
          setTransitStops(data.stops);
        }
      })
      .catch((err) => {
        console.error('Error fetching transit stops:', err);
      })
      .finally(() => {
        setTransitLoading(false);
      });
  }, []); // Load once on mount

  // Real-time vehicles: WebSocket when available, polling fallback for Vercel/serverless
  const refreshVehicles = useCallback(async (force = false) => {
    const now = Date.now();
    const minFetchGapMs = 30_000;

    if (!force && realtimeFetchInFlightRef.current) {
      return;
    }

    if (!force && now - lastRealtimeFetchAtRef.current < minFetchGapMs) {
      return;
    }

    realtimeFetchInFlightRef.current = true;
    lastRealtimeFetchAtRef.current = now;

    try {
      const response = await fetch('/api/transit/realtime');
      const data = await response.json();

      if (data.success && data.data?.vehicles) {
        const uniqueVehicles = dedupeVehiclesById(data.data.vehicles);
        setVehicles(uniqueVehicles);
        setAlerts(data.data.alerts || []);
        setVehicleStats(data.data);
        vehiclePollingErrorCountRef.current = 0;
      }
    } catch (err) {
      vehiclePollingErrorCountRef.current += 1;
      console.error('Error fetching vehicles:', err);
    } finally {
      realtimeFetchInFlightRef.current = false;
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showVehicles) {
      setVehiclesLoading(false);
      return;
    }

    setVehiclesLoading(true);
    refreshVehicles(true);

    // Listen for real-time updates via WebSocket when connected
    const unsubscribe = onVehicleUpdate((incomingVehicles: Vehicle[]) => {
      const uniqueVehicles = dedupeVehiclesById(incomingVehicles);
      setVehicles(uniqueVehicles);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onVehicleUpdate, refreshVehicles, showVehicles]);

  // Polling fallback when WebSocket unavailable (Vercel/serverless)
  useEffect(() => {
    if (isConnected) return;
    if (!showVehicles) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const tick = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      refreshVehicles();
    };

    const getPollingIntervalMs = () => {
      const baseIntervalMs = 60_000;
      const maxPenaltySteps = Math.min(vehiclePollingErrorCountRef.current, 4);
      const errorPenaltyMs = maxPenaltySteps * 30_000;
      return baseIntervalMs + errorPenaltyMs;
    };

    const scheduleNextTick = () => {
      if (isCancelled) return;
      timeout = setTimeout(() => {
        tick();
        scheduleNextTick();
      }, getPollingIntervalMs());
    };

    // First tick soon after enabling vehicles
    tick();
    scheduleNextTick();

    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected, showVehicles, refreshVehicles]);

  // Add/remove report markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing report markers
    reportMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    reportMarkersRef.current = [];

    if (!showReports) return;

    reports.forEach((report) => {
      const statusColor = {
        PENDING: '#ff6b6b',
        IN_REVIEW: '#ffa500',
        IN_PROGRESS: '#4ecdc4',
        RESOLVED: '#51cf66',
        REJECTED: '#868e96',
      };

      const color = statusColor[report.status as keyof typeof statusColor] || '#ff6b6b';

      const marker = L.circleMarker([report.lat, report.lng], {
        radius: 8,
        fillColor: color,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapRef.current!);

      marker.on('click', () => {
        setSelectedReport(report);
        setSelectedVehicle(null);
        getPublicReportDetails(report.id);
      });

      reportMarkersRef.current.push(marker);
    });
  }, [showReports, reports]);

  useEffect(() => {
    if (!showReports) {
      setSelectedReport(null);
      setSelectedReportDetails(null);
      setReportDetailsLoading(false);
    }
  }, [showReports]);

  useEffect(() => {
    if (!showVehicles) {
      setSelectedVehicle(null);
    }
  }, [showVehicles]);

  // Add/remove store markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing store markers
    storeMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    storeMarkersRef.current = [];

    if (!showStores) return;

    stores.forEach((store) => {
      const totalProducts = Object.values(store.products).reduce((a, b) => a + b, 0);
      const stockLevel = totalProducts > 100 ? '100%' : totalProducts > 50 ? '75%' : totalProducts > 30 ? '50%' : '25%';

      const popupContent = `
        <div style="min-width: 200px; color: #e2e8f0;">
          <strong style="color: #f1f5f9;">${store.name}</strong><br/>
          <span style="color: #cbd5e1;">${store.address}</span><br/>
          <div style="margin-top: 8px; padding: 8px; background: rgba(30, 41, 59, 0.7); border-left: 3px solid #06d6a0; border-radius: 4px; font-size: 12px; color: #cbd5e1;">
            <strong style="color: #f1f5f9;">${tr('Наличности', 'Stock', 'المخزون')}:</strong><br/>
            ${tr('Хляб', 'Bread', 'خبز')}: ${store.products.bread}<br/>
            ${tr('Мляко', 'Milk', 'حليب')}: ${store.products.milk}<br/>
            ${tr('Яйца', 'Eggs', 'بيض')}: ${store.products.eggs}<br/>
            ${tr('Ориз', 'Rice', 'أرز')}: ${store.products.rice}<br/>
            ${tr('Масло', 'Oil', 'زيت')}: ${store.products.oil}
          </div>
        </div>
      `;

      const marker = L.circleMarker([store.lat, store.lng], {
        radius: 10,
        fillColor: '#4ecdc4',
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);

      storeMarkersRef.current.push(marker);
    });
  }, [showStores, stores]);

  // Add/remove shelter markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing shelter markers
    shelterMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    shelterMarkersRef.current = [];

    if (!showShelters) return;

    shelters.forEach((shelter) => {
      // Цветово кодиране според категория и тип
      let markerColor = '#3b82f6'; // Default blue
      let icon = '🛡️'; // Default shield icon
      
      // Цвят според категория
      if (shelter.category === 'І-ва категория') {
        markerColor = '#10b981'; // Green - ready immediately
      } else if (shelter.category === 'II-ра категория') {
        markerColor = '#f59e0b'; // Orange - ready in ~1 week
      }
      
      // Икона според тип
      if (shelter.type === 'Противорадиационно укритие') {
        icon = '☢️'; // Nuclear symbol
      } else {
        icon = '🏢'; // Building for regular shelters
      }

      const popupContent = `
        <div style="min-width: 280px; font-family: system-ui;">
          <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 28px;">${icon}</span>
            <div>
              <strong style="font-size: 15px; color: ${markerColor};">${shelter.name}</strong><br/>
              <span style="font-size: 11px; color: #666;">${tr('Район', 'District', 'الحي')}: ${shelter.district}</span>
            </div>
          </div>
          
          <div style="font-size: 13px; margin-bottom: 10px;">
            <strong>📍 ${tr('Адрес', 'Address', 'العنوان')}:</strong> ${shelter.address}
          </div>
          
          <div style="background: ${markerColor}15; border-left: 3px solid ${markerColor}; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
            <div style="font-size: 12px; margin-bottom: 4px;">
              <strong style="color: ${markerColor};">${tr('Тип', 'Type', 'النوع')}:</strong> ${shelter.type}
            </div>
            <div style="font-size: 12px;">
              <strong style="color: ${markerColor};">${tr('Категория', 'Category', 'الفئة')}:</strong> ${shelter.category}
            </div>
          </div>
          
          <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
            <strong>${tr('Управител', 'Manager', 'المسؤول')}:</strong> ${shelter.owner}
          </div>
          
          <div style="font-size: 11px; color: #555; background: #f5f5f5; padding: 8px; border-radius: 4px; line-height: 1.4;">
            <strong>${tr('Състояние', 'Condition', 'الحالة')}:</strong><br/>
            ${shelter.description}
          </div>
          
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; text-align: center;">
            ID: ${shelter.id}
          </div>
        </div>
      `;

      const marker = L.circleMarker([shelter.lat, shelter.lng], {
        radius: 9,
        fillColor: markerColor,
        color: 'white',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.85,
      })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);

      shelterMarkersRef.current.push(marker);
    });
  }, [showShelters, shelters]);

  // Add/remove social services markers
  useEffect(() => {
    if (!mapRef.current) return;

    socialServiceMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    socialServiceMarkersRef.current = [];

    if (!showSocialServices) return;

    const sameCoordinateCounter = new Map<string, number>();

    socialServices.forEach((service) => {
      const coordinateKey = `${service.lat.toFixed(6)}:${service.lng.toFixed(6)}`;
      const currentCount = sameCoordinateCounter.get(coordinateKey) || 0;
      sameCoordinateCounter.set(coordinateKey, currentCount + 1);

      const [renderLat, renderLng] = getOffsetPosition(service.lat, service.lng, currentCount);
      const color = getSocialServiceCategoryColor(service.category);

      const title = service.shortName || service.name;
      const details = [
        service.typeSpecific || service.serviceModel || service.typePrimary,
        service.riskGroup,
      ]
        .filter(Boolean)
        .join(' • ');

      const popupContent = `
        <div style="min-width: 260px; font-family: system-ui; color: #cbd5e1;">
          <strong style="font-size: 14px; color: ${color};">🏥 ${title}</strong><br/>
          ${service.provider ? `<span style="font-size: 12px; color: #e2e8f0;">${service.provider}</span><br/>` : ''}
          ${details ? `<span style="font-size: 11px; color: #94a3b8;">${details}</span><br/>` : ''}
          ${service.address ? `<div style="margin-top: 8px; font-size: 12px;"><strong>📍 ${tr('Адрес', 'Address', 'العنوان')}:</strong> ${service.address}</div>` : ''}
          ${service.phone ? `<div style="font-size: 12px;"><strong>📞 ${tr('Телефон', 'Phone', 'الهاتف')}:</strong> ${service.phone}</div>` : ''}
          ${service.email ? `<div style="font-size: 12px;"><strong>✉️ ${tr('Имейл', 'Email', 'البريد الإلكتروني')}:</strong> ${service.email}</div>` : ''}
          ${service.ageRange ? `<div style="font-size: 12px;"><strong>👤 ${tr('Възраст', 'Age', 'العمر')}:</strong> ${service.ageRange}</div>` : ''}
          ${service.capacity !== null ? `<div style="font-size: 12px;"><strong>👥 ${tr('Капацитет', 'Capacity', 'السعة')}:</strong> ${service.capacity}</div>` : ''}
          ${service.targetGroup ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148,163,184,0.25); font-size: 11px; color: #a1aec8;"><strong>${tr('Целева група', 'Target group', 'الفئة المستهدفة')}:</strong> ${service.targetGroup}</div>` : ''}
          ${service.web ? `<div style="margin-top: 8px; font-size: 11px;"><a href="${service.web}" target="_blank" rel="noopener noreferrer" style="color: #60A5FA; text-decoration: underline;">${tr('Официална страница', 'Official page', 'الصفحة الرسمية')}</a></div>` : ''}
        </div>
      `;

      const marker = L.circleMarker([renderLat, renderLng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);

      socialServiceMarkersRef.current.push(marker);
    });
  }, [showSocialServices, socialServices]);

  // Add/remove accident markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing accident markers
    accidentMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    accidentMarkersRef.current = [];

    if (!showAccidents) return;

    accidents.forEach((accident) => {
      let markerColor = '#f59e0b';
      let radius = 2;

      if (accident.died) {
        markerColor = '#7f1d1d';
        radius = 3;
      } else if (accident.injured) {
        markerColor = '#dc2626';
        radius = 2.5;
      }

      const marker = L.circleMarker([accident.lat, accident.lng], {
        radius,
        renderer: accidentsRendererRef.current || undefined,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 0.6,
        opacity: 0.95,
        fillOpacity: 0.8,
      })
        .bindPopup(`
          <div style="min-width: 220px; font-family: system-ui; color: #cbd5e1;">
            <strong style="color: ${markerColor};">🚗 ${accident.type}</strong><br/>
            <div style="margin-top: 8px; font-size: 12px; color: #a1aec8;">
              <strong>${tr('Дата', 'Date', 'التاريخ')}:</strong> ${accident.date}<br/>
              <strong>${tr('Час', 'Time', 'الوقت')}:</strong> ${accident.time}<br/>
              <strong>${tr('Ранени', 'Injured', 'مصابون')}:</strong> ${accident.injured ? tr('✓ Да', '✓ Yes', '✓ نعم') : tr('✗ Не', '✗ No', '✗ لا')}<br/>
              <strong>${tr('Загинали', 'Fatalities', 'وفيات')}:</strong> ${accident.died ? tr('✓ Да', '✓ Yes', '✓ نعم') : tr('✗ Не', '✗ No', '✗ لا')}
            </div>
          </div>
        `)
        .addTo(mapRef.current!);

      accidentMarkersRef.current.push(marker);
    });
  }, [showAccidents, accidents]);

  // Add/remove risk map zones
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing risk zones
    riskZonesRef.current.forEach((layer) => mapRef.current?.removeLayer(layer));
    riskZonesRef.current = [];

    if (!showRiskMap) return;

    riskZones.forEach((zone) => {
      // Original large circles for good Sofia coverage
      const radiusInMeters = zone.count > 50 ? 2000 : zone.count > 20 ? 1500 : 1000;

      const circle = L.circle([zone.lat, zone.lng], {
        radius: radiusInMeters,
        fillColor: zone.color,
        color: zone.color,
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.3,
      })
        .bindPopup(`
          <div style="min-width: 200px; font-family: system-ui; color: #cbd5e1;">
            <strong style="color: ${zone.color};">⚠️ ${tr('Рискова зона', 'Risk zone', 'منطقة خطرة')} - ${zone.riskLevel.toUpperCase()}</strong><br/>
            <div style="margin-top: 8px; font-size: 12px; color: #a1aec8;">
              <strong>${tr('Брой катастрофи', 'Accident count', 'عدد الحوادث')}:</strong> ${zone.count}<br/>
              <strong>${tr('Средна тежест', 'Average severity', 'متوسط الشدة')}:</strong> ${zone.severity.toFixed(1)}/3<br/>
              <strong>${tr('Най-чест тип', 'Most common type', 'النوع الأكثر شيوعًا')}:</strong> ${zone.mostCommonType}<br/>
              <strong>${tr('Ниво на риск', 'Risk level', 'مستوى الخطر')}:</strong> ${
                zone.riskLevel === 'critical' ? tr('🟣 Критично', '🟣 Critical', '🟣 حرج') :
                zone.riskLevel === 'high' ? tr('🔴 Високо', '🔴 High', '🔴 مرتفع') :
                zone.riskLevel === 'medium' ? tr('🟡 Средно', '🟡 Medium', '🟡 متوسط') :
                tr('🟢 Ниско', '🟢 Low', '🟢 منخفض')
              }
            </div>
          </div>
        `)
        .addTo(mapRef.current!);

      riskZonesRef.current.push(circle);
    });
  }, [showRiskMap, riskZones]);

  // Add/remove transit markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing transit markers
    transitMarkersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
    transitMarkersRef.current = [];

    if (!showTransit) return;

    transitStops.forEach((stop) => {
      const popupContent = `
        <div style="min-width: 220px; font-family: system-ui; color: #e2e8f0;">
          <strong style="font-size: 14px; color: #f1f5f9;">🚏 ${stop.stop_name}</strong><br/>
          <small style="color: #a1aec8;">${tr('Код', 'Code', 'الرمز')}: ${stop.stop_code}</small><br/>
          <div style="margin-top: 8px;">
            <button onclick="window.showStopSchedule && window.showStopSchedule('${stop.stop_id}')" 
                    style="background: linear-gradient(135deg, #3B82F6, #60A5FA); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; width: 100%; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              📅 ${tr('Виж разписание', 'View schedule', 'عرض الجدول')}
            </button>
          </div>
        </div>
      `;

      const marker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
        radius: 5,
        fillColor: '#3b82f6',
        color: 'white',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.7,
      })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);

      transitMarkersRef.current.push(marker);
    });
  }, [showTransit, transitStops]);

  // Add/remove vehicle markers with animation
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old vehicle markers
    vehicleMarkersRef.current.forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    vehicleMarkersRef.current.clear();

    if (!showVehicles) {
      return;
    }

    // Filter vehicles by route — supports "7", "Тролейбус 7", "Автобус 22"
    const { vType: filterType, line: filterLine } = routeFilter.trim()
      ? parseRouteFilter(routeFilter)
      : {};
    const filteredVehicles = routeFilter.trim()
      ? vehicles.filter(v => {
          const typeOk = !filterType || v.vehicle_type === filterType;
          const lineOk = !filterLine ||
            v.route_short_name === filterLine ||
            v.route_short_name.toLowerCase().includes(filterLine.toLowerCase());
          return typeOk && lineOk;
        })
      : vehicles;

    const isCompactVehicleView = mapZoom <= 13;
    const isUltraCompactView = mapZoom <= 9;
    const renderedVehicleIds = new Set<string>();

    const getStatusColor = (status: string) => {
      if (status.includes('пътуване')) return '#10B981'; // Green - in transit
      if (status.includes('пристигане')) return '#3B82F6'; // Blue - arriving
      if (status.includes('Спрял')) return '#EF4444'; // Red - stopped
      return '#6B7280'; // Gray - unknown
    };

    filteredVehicles.forEach((vehicle) => {
      const markerKey = vehicle.id || `${vehicle.route_id}-${vehicle.trip_id}`;
      if (renderedVehicleIds.has(markerKey)) return;
      renderedVehicleIds.add(markerKey);

      const color = vehicle.color;
      const vehicleTypeBg = vehicle.vehicle_type === 'tram' ? 'Трамвай' : 
                            vehicle.vehicle_type === 'trolley' ? 'Тролейбус' : 'Автобус';
      const routeLabel = getVehicleRouteLabel(vehicle);
      const bearing = vehicle.bearing || 0;
      const hasDirection = bearing > 0;
      
      // Direction compass view (N, NE, E, SE, S, SW, W, NW)
      const getDirectionLabel = (deg: number) => {
        const dirs = ['С', 'СИ', 'И', 'ЮИ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        return dirs[Math.round(deg / 45) % 8];
      };
      
      const popupContent = `
        <div style="min-width: 300px; font-family: system-ui;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 24px;">${vehicle.icon}</span>
            <div>
              <strong style="color: ${color}; font-size: 16px;">${vehicleTypeBg} ${routeLabel}</strong><br/>
              <small style="color: #666;">ID: ${vehicle.id}${vehicle.vehicle_model ? ` • ${vehicle.vehicle_model}` : ''}</small>
            </div>
          </div>
          <div style="margin-top: 8px; padding: 10px; background: #f5f5f5; border-radius: 8px; font-size: 13px;">
            <strong>${tr('Статус', 'Status', 'الحالة')}:</strong> ${vehicle.status}<br/>
            <strong>${tr('Скорост', 'Speed', 'السرعة')}:</strong> ${vehicle.speed > 0 ? Math.round(vehicle.speed) + ` ${tr('км/ч', 'km/h', 'كم/س')}` : '-'}<br/>
            ${hasDirection ? `<strong>${tr('Посока', 'Direction', 'الاتجاه')}:</strong> ${getDirectionLabel(bearing)} (${Math.round(bearing)}°) <span style="display: inline-block; transform: rotate(${bearing}deg); font-size: 16px;">▲</span><br/>` : ''}
            <strong>${tr('Текуща спирка', 'Current stop', 'المحطة الحالية')}:</strong> ${vehicle.current_stop_name ? `${vehicle.current_stop} • ${vehicle.current_stop_name}` : vehicle.current_stop || '-'}<br/>
            ${vehicle.delay ? `<strong>${tr('Закъснение', 'Delay', 'التأخير')}:</strong> <span style="color: ${vehicle.delay > 300 ? '#E74C3C' : vehicle.delay > 60 ? '#F39C12' : '#27AE60'};">${Math.round(vehicle.delay)} ${tr('сек', 'sec', 'ث')}</span><br/>` : ''}
            ${vehicle.occupancy_percentage !== undefined ? `<strong>Население:</strong> ${vehicle.occupancy_percentage}%<br/>` : ''}
            <strong style="font-size: 11px;">Актуализация:</strong> <span style="font-size: 11px;">${new Date(vehicle.timestamp).toLocaleTimeString('bg-BG')}</span>
          </div>
          <div style="margin-top: 8px; text-align: center;">
            <button onclick="window.showVehicleRoute && window.showVehicleRoute('${vehicle.route_id}', '${vehicle.id}', '${vehicle.route_short_name}', '${vehicle.vehicle_type}')" 
                    style="background: ${color}; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
              🗺️ Всички маршрути на линия ${vehicle.route_short_name}
            </button>
          </div>
        </div>
      `;

      const isDelayed = vehicle.delay && vehicle.delay > 300;
      const isStopped = vehicle.status === 'Спрял';
      const statusColor = getStatusColor(vehicle.status);
      
      // Direction arrow for vehicles with known bearing
      const directionArrow = hasDirection && !isUltraCompactView ? `
        <div style="
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%) rotate(${bearing}deg);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 10px solid ${color};
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        "></div>
      ` : '';

      const iconHtml = isUltraCompactView
        ? `
          <div style="
            background: ${statusColor};
            border: 2px solid white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6px;
            font-weight: 700;
            color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            transform: rotate(${bearing}deg);
          ">
            ${hasDirection ? '▲' : routeLabel.substring(0, 2)}
          </div>
        `
        : isCompactVehicleView
        ? `
          <div style="position: relative;">
            ${directionArrow}
            <div style="
              background: ${color};
              border: 2px solid rgba(255,255,255,0.95);
              border-radius: 12px;
              min-width: 24px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 6px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0px;
              color: white;
              box-shadow: ${isDelayed ? '0 0 10px rgba(231,76,60,0.8)' : '0 1px 5px rgba(0,0,0,0.35)'};
              ${isStopped ? 'opacity: 0.75;' : ''}
            ">
              ${routeLabel}
            </div>
          </div>
        `
        : `
          <div style="position: relative;">
            ${directionArrow}
            <div style="
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: ${isDelayed ? '0 0 12px rgba(231,76,60,0.8)' : '0 2px 8px rgba(0,0,0,0.4)'};
              ${isStopped ? 'opacity: 0.7;' : ''}
            ">
              ${vehicle.icon}
            </div>
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: white;
              border: 2px solid ${color};
              border-radius: 10px;
              padding: 2px 6px;
              font-size: 11px;
              font-weight: bold;
              color: ${color};
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              min-width: 20px;
              text-align: center;
            ">
              ${routeLabel}
            </div>
          </div>
        `;

      const marker = L.marker([vehicle.position.latitude, vehicle.position.longitude], {
        icon: L.divIcon({
          className: 'vehicle-marker',
          html: iconHtml,
          iconSize: isUltraCompactView ? [20, 20] : isCompactVehicleView ? [30, 24] : [44, 44],
          iconAnchor: isUltraCompactView ? [10, 10] : isCompactVehicleView ? [15, 12] : [22, 22],
        }),
      }).addTo(mapRef.current!);

      marker.on('click', () => {
        setSelectedVehicle(vehicle);
        setSelectedReport(null);
      });

      vehicleMarkersRef.current.set(markerKey, marker);
    });
  }, [showVehicles, vehicles, routeFilter, mapZoom]);

  // Helper to draw directions from one route result onto the map
  const drawRouteDirections = (directions: any[], baseColor: string, allStops: any[]) => {
    directions.forEach((direction: any, directionIndex: number) => {
      const isReturnTrip = directionIndex > 0;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(baseColor.substring(i, i + 2), 16));
      const lineColor = isReturnTrip ? `rgba(${r},${g},${b},0.45)` : baseColor;
      const lineDasharray = isReturnTrip ? '6, 4' : '';

      if (direction.shape && direction.shape.length > 0) {
        const routeLine = L.polyline(
          direction.shape.map((pt: any) => [pt.shape_pt_lat, pt.shape_pt_lon]),
          { color: lineColor, weight: isReturnTrip ? 3 : 4, opacity: isReturnTrip ? 0.5 : 0.8, dashArray: lineDasharray }
        ).addTo(mapRef.current!);
        routeLayersRef.current.push(routeLine);
      }

      if (direction.stops && direction.stops.length > 0) {
        direction.stops.forEach((stop: any, stopIndex: number) => {
          allStops.push(stop);
          const isFirst = stopIndex === 0;
          const isLast = stopIndex === direction.stops.length - 1;
          const markerColor = isFirst ? '#00FF00' : isLast ? '#FF0000' : lineColor;
          const markerRadius = (isFirst || isLast) ? 7 : 5;

          const stopMarker = L.circleMarker([stop.stop_lat, stop.stop_lon], {
            radius: markerRadius,
            fillColor: 'white',
            color: markerColor,
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          })
            .bindPopup(`
              <div style="font-family: system-ui; min-width: 220px;">
                <strong style="color: ${markerColor};">🚏 ${stop.stop_name}</strong><br/>
                <small>Код: ${stop.stop_code}</small><br/>
                ${direction.headsign ? `<small style="color: #666;">${direction.headsign}</small><br/>` : ''}
                <div style="margin-top: 8px;">
                  <button onclick="window.showStopSchedule && window.showStopSchedule('${stop.stop_id}')"
                          style="background: ${markerColor}; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                    📅 Разписание
                  </button>
                </div>
              </div>
            `)
            .addTo(mapRef.current!);
          routeLayersRef.current.push(stopMarker);
        });
      }
    });
  };

  // Show ALL routes for a given line (every unique route_id with same short name + type)
  const showVehicleRoute = async (routeId: string, vehicleId: string, routeShortName?: string, vType?: string) => {
    if (!mapRef.current) return;

    // Clear previous route layers
    routeLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
    routeLayersRef.current = [];

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const baseColor = vehicle?.color || '#3B82F6';

    // Collect all unique route_ids for this line
    const relatedRouteIds: string[] = routeShortName
      ? [...new Set(
          vehicles
            .filter(v => v.route_short_name === routeShortName && (!vType || v.vehicle_type === vType))
            .map(v => v.route_id)
        )]
      : [];
    if (!relatedRouteIds.includes(routeId)) relatedRouteIds.unshift(routeId);

    try {
      // Fetch all route shapes in parallel
      const results = await Promise.all(
        relatedRouteIds.map(id => fetch(`/api/transit/route/${id}`).then(r => r.json()))
      );

      const allStops: any[] = [];

      results.forEach((data) => {
        if (!data.success || !data.data?.directions?.length) return;
        drawRouteDirections(data.data.directions, baseColor, allStops);
      });

      // Fit map to show all stops
      if (allStops.length > 0) {
        const bounds = L.latLngBounds(allStops.map((s: any) => [s.stop_lat, s.stop_lon]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      // Update filter to show only vehicles for this line
      const displayName = routeShortName || routeId;
      setRouteFilter(displayName);
      setSelectedRoute(displayName);
    } catch (error) {
      console.error('Error showing route:', error);
    }
  };

  // Function to show stop schedule
  const showStopSchedule = async (stopId: string) => {
    if (!mapRef.current) return;

    // Clear previous schedule layers
    stopScheduleLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
    stopScheduleLayersRef.current = [];

    try {
      const response = await fetch(`/api/transit/stop/${stopId}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        console.error('Failed to fetch stop schedule');
        return;
      }

      const { stop, upcoming_arrivals } = data.data;

      // Create schedule popup
      const scheduleHtml = `
        <div style="font-family: system-ui; min-width: 320px; max-height: 400px; overflow-y: auto; color: #e2e8f0;">
          <div style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95); padding-bottom: 8px; border-bottom: 2px solid rgba(71, 85, 105, 0.3); margin-bottom: 8px;">
            <strong style="font-size: 16px; color: #f1f5f9;">🚏 ${stop.stop_name}</strong><br/>
            <small style="color: #a1aec8;">Код: ${stop.stop_code}</small>
          </div>
          ${upcoming_arrivals.length > 0 ? `
            <div style="font-size: 13px;">
              <strong style="display: block; margin-bottom: 8px; color: #cbd5e1;">Пристигащи превозни средства:</strong>
              ${upcoming_arrivals.map((arrival: any) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px; margin-bottom: 6px; background: rgba(30, 41, 59, 0.6); border-left: 3px solid ${arrival.color}; border-radius: 4px;">
                  <span style="font-size: 20px;">${arrival.vehicle_icon}</span>
                  <div style="flex: 1;">
                    <strong style="color: ${arrival.color};">${arrival.route_short_name}</strong><br/>
                    <small style="color: #a1aec8;">ID: ${arrival.vehicle_id || 'N/A'}</small>
                  </div>
                  <div style="text-align: right;">
                    <strong style="font-size: 16px; color: ${arrival.minutes_until_arrival <= 2 ? '#DC2626' : arrival.minutes_until_arrival <= 5 ? '#F59E0B' : '#059669'};">
                      ${arrival.minutes_until_arrival} мин
                    </strong>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="padding: 16px; text-align: center; color: #7c8ca1;">
              <p>${tr('Няма данни за пристигащи превозни средства в следващите 60 минути', 'No incoming vehicles in the next 60 minutes', 'لا توجد مركبات قادمة خلال الـ60 دقيقة القادمة')}</p>
            </div>
          `}
        </div>
      `;

      // Show popup at stop location
      const popup = L.popup({
        maxWidth: 350,
        className: 'stop-schedule-popup-dark'
      })
        .setLatLng([stop.stop_lat, stop.stop_lon])
        .setContent(scheduleHtml)
        .openOn(mapRef.current);

      setSelectedStop(stop);
    } catch (error) {
      console.error('Error showing stop schedule:', error);
    }
  };

  // Expose functions to window for popup buttons
  useEffect(() => {
    (window as any).showVehicleRoute = showVehicleRoute;
    (window as any).showStopSchedule = showStopSchedule;

    return () => {
      delete (window as any).showVehicleRoute;
      delete (window as any).showStopSchedule;
    };
  }, [vehicles]);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.12), transparent 70%)' }} />
      <div className="pointer-events-none absolute top-60 -left-32 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-20 right-10 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,214,160,0.08), transparent 70%)' }} />

      {/* Header */}
      <div className="relative overflow-hidden pt-24 pb-8 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto relative">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-4">
                <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--s-orange)]">{tr('Интерактивна карта', 'Interactive map', 'خريطة تفاعلية')}</span>
              </div>
              <h1 className="rc-display font-extrabold text-4xl md:text-5xl text-[var(--s-text)] leading-tight">
                {tr('Карта на', 'Map of', 'خريطة')} <span className="grad-orange">{tr('София', 'Sofia', 'صوفيا')}</span>
              </h1>
              <p className="text-[var(--s-muted)] mt-2 max-w-xl text-sm">
                {tr(
                  'Реални метео данни, градски транспорт на живо и интелигентна visualizация. Кликни за детайлна прогноза.',
                  'Live weather data, real-time transit and smart visualization. Click for detailed forecast.',
                  'بيانات طقس مباشرة ونقل عام لحظي وعرض ذكي. انقر للحصول على توقع تفصيلي.'
                )}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] font-semibold" style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)', color: 'var(--s-teal)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--s-teal)] animate-pulse" />
              {tr('Данни на живо', 'Live Data', 'بيانات مباشرة')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 rounded-2xl p-5 h-fit sticky top-24 space-y-1 animate-fade-up-fast" style={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)' }}>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-muted)] font-semibold mb-4">{tr('Слоеве', 'Layers', 'الطبقات')}</p>

          <div className="space-y-1.5">
            {([
              { key: 'reports',  label: tr('Сигнали', 'Reports', 'البلاغات'),      count: reports.length,       emoji: '📍', active: showReports,  setter: setShowReports,  color: 'var(--s-orange)' },
              { key: 'stores',   label: tr('Магазини', 'Stores', 'المتاجر'),     count: stores.length,        emoji: '🛒', active: showStores,   setter: setShowStores,   color: 'var(--s-teal)' },
              { key: 'shelters', label: tr('Убежища', 'Shelters', 'الملاجئ'),      count: shelters.length,      emoji: '🛡️', active: showShelters, setter: setShowShelters, color: '#10b981' },
              { key: 'social',   label: tr('Соц. услуги', 'Social services', 'الخدمات الاجتماعية'),  count: socialServices.length, emoji: '🏥', active: showSocialServices, setter: setShowSocialServices, color: '#38BDF8' },
              { key: 'weather',  label: tr('Метео', 'Weather', 'الطقس'),        count: null,                 emoji: '🌦', active: showWeather,  setter: setShowWeather,  color: '#60A5FA' },
              { key: 'transit',  label: tr('Транспорт', 'Transit', 'النقل'),    count: transitStops.length,  emoji: '🚌', active: showTransit,  setter: setShowTransit,  color: '#818CF8' },
              { key: 'vehicles', label: tr('Превозни', 'Vehicles', 'المركبات'),     count: vehicles.length,      emoji: '🚐', active: showVehicles, setter: setShowVehicles, color: '#F87171' },
            ] as const).map(({ key, label, count, emoji, active, setter, color }) => (
              <button
                key={key}
                onClick={() => setter(!active)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={active
                  ? { background: `rgba(${color === 'var(--s-orange)' ? '255,107,43' : color === 'var(--s-teal)' ? '6,214,160' : color === '#10b981' ? '16,185,129' : color === '#60A5FA' ? '96,165,250' : color === '#818CF8' ? '129,140,248' : '248,113,113'},0.12)`, border: `1px solid ${color === 'var(--s-orange)' ? 'rgba(255,107,43,0.3)' : color === 'var(--s-teal)' ? 'rgba(6,214,160,0.3)' : color === '#10b981' ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`, color }
                  : { background: 'transparent', border: '1px solid var(--s-border)', color: 'var(--s-muted2)' }
                }
              >
                <span className="text-base">{emoji}</span>
                <span className="flex-1 text-left font-medium">{label}</span>
                {count !== null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--s-badge-overlay)' }}>{count}</span>
                )}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${active ? 'animate-pulse' : 'opacity-30'}`}
                  style={{ background: active ? color : 'var(--s-muted)' }} />
              </button>
            ))}

            {showVehicles && (
              <div className="mt-1 px-3 py-3 rounded-xl" style={{ background: 'var(--s-surface2)', border: '1px solid var(--s-border)' }}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--s-muted)] mb-2">{tr('Линия / Тип', 'Line / Type', 'الخط / النوع')}</p>
                <input
                  type="text"
                  placeholder={tr('напр. 7, Тролейбус 7, Автобус 22', 'e.g. 7, Trolleybus 7, Bus 22', 'مثال: 7، ترولي 7، حافلة 22')}
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="site-input text-xs"
                />
                {selectedRoute && (
                  <button
                    onClick={() => {
                      setRouteFilter('');
                      setSelectedRoute(null);
                      routeLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
                      routeLayersRef.current = [];
                    }}
                    className="w-full mt-2 px-3 py-1.5 text-xs font-bold rounded-xl transition" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--s-red)', border: '1px solid rgba(255,71,87,0.25)' }}
                  >
                    {tr('✕ Затвори маршрута', '✕ Close route', '✕ إغلاق المسار')}
                  </button>
                )}
              </div>
            )}

            {([
              { key: 'accidents', label: tr('Катастрофи', 'Accidents', 'حوادث'), count: accidentStats.total, emoji: '🚗', active: showAccidents, setter: setShowAccidents, loading: accidentsLoading, color: '#FB923C' },
              { key: 'risk',      label: tr('Пътен риск', 'Road risk', 'مخاطر الطريق'),  count: riskZones.length,   emoji: '⚠️', active: showRiskMap,  setter: setShowRiskMap,  loading: riskMapLoading,  color: 'var(--s-violet)' },
            ] as const).map(({ key, label, count, emoji, active, setter, loading: ld, color }) => (
              <button
                key={key}
                onClick={() => !ld && setter(!active)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                style={active
                  ? { background: `rgba(${key === 'accidents' ? '251,146,60' : '139,92,246'},0.12)`, border: `1px solid rgba(${key === 'accidents' ? '251,146,60' : '139,92,246'},0.3)`, color }
                  : { background: 'transparent', border: '1px solid var(--s-border)', color: 'var(--s-muted2)', opacity: ld ? 0.5 : 1 }
                }
                disabled={ld}
              >
                <span className="text-base">{emoji}</span>
                <span className="flex-1 text-left font-medium">{label}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--s-badge-overlay)' }}>{ld ? '…' : count}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'animate-pulse' : 'opacity-30'}`}
                  style={{ background: active ? color : 'var(--s-muted)' }} />
              </button>
            ))}

          </div>{/* end space-y-1.5 toggles */}

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--s-border)' }}>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)] mb-3">{tr('Статистика', 'Statistics', 'الإحصاءات')}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: tr('Сигнали', 'Reports', 'البلاغات'),   value: reports.length,      color: 'var(--s-orange)' },
                { label: tr('Магазини', 'Stores', 'المتاجر'),  value: stores.length,       color: 'var(--s-teal)' },
                { label: tr('Убежища', 'Shelters', 'الملاجئ'),   value: shelters.length,     color: '#10b981' },
                { label: tr('Соц. услуги', 'Social services', 'الخدمات الاجتماعية'), value: socialServices.length, color: '#38BDF8' },
                { label: tr('Превозни', 'Vehicles', 'المركبات'),  value: vehicles.length,     color: '#F87171' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--s-surface2)' }}>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--s-muted)] mb-1">{label}</p>
                  <p className="text-xl font-bold rc-display" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {(weatherLoading || transitLoading || vehiclesLoading) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--s-muted)]" style={{ background: 'var(--s-surface2)' }}>
              <div className="w-3 h-3 rounded-full border border-[var(--s-orange)] border-t-transparent animate-spin" />
              {tr('Зареждане...', 'Loading...', 'جار التحميل...')}
            </div>
          )}

          {socialServicesLoading && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--s-muted)]" style={{ background: 'var(--s-surface2)' }}>
              <div className="w-3 h-3 rounded-full border border-sky-400 border-t-transparent animate-spin" />
              {tr('Зареждане на социални услуги...', 'Loading social services...', 'جار تحميل الخدمات الاجتماعية...')}
            </div>
          )}

          {showWeather && !selectedWeather && !weatherLoading && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#93C5FD' }}>
              {tr('💡 Кликни на картата за прогноза', '💡 Click map for forecast', '💡 انقر على الخريطة للتنبؤ')}
            </div>
          )}

          {showVehicles && !vehiclesLoading && vehicles.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'var(--s-surface2)', border: '1px solid var(--s-border)' }}>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                {[{icon:'🚋', label:tr('Трамв.', 'Tram', 'ترام'), count: vehicles.filter(v=>v.vehicle_type==='tram').length, color:'#F87171'},
                  {icon:'🚎', label:tr('Тролей', 'Trolley', 'تروليباص'), count: vehicles.filter(v=>v.vehicle_type==='trolley').length, color:'#818CF8'},
                  {icon:'🚌', label:tr('Автоб.', 'Bus', 'حافلة'), count: vehicles.filter(v=>v.vehicle_type==='bus').length, color:'#86EFAC'}].map(it=>(
                  <div key={it.label} className="rounded-lg p-2" style={{ background: 'var(--s-surface)' }}>
                    <div>{it.icon}</div>
                    <div className="font-bold" style={{ color: it.color }}>{it.count}</div>
                    <div className="text-[9px] text-[var(--s-muted)]">{it.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,167,38,0.08)', border: '1px solid rgba(255,167,38,0.2)' }}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold">⚠️ {tr('Алерти', 'Alerts', 'تنبيهات')} ({alerts.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, idx) => (
                  <div key={idx} className="rounded-lg p-2 text-xs" style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid rgba(255,167,38,0.5)' }}>
                    <p className="font-semibold text-[var(--s-text)]">{alert.title || alert.effect_label}</p>
                    {alert.affected_lines.length > 0 ? (
                      <p className="text-amber-300 mt-0.5 font-medium">{tr('Линии', 'Lines', 'الخطوط')}: {alert.affected_lines.join(', ')}</p>
                    ) : alert.description && alert.description !== alert.title && alert.description !== alert.effect_label ? (
                      <p className="text-[var(--s-muted)] mt-0.5 line-clamp-2">{alert.description}</p>
                    ) : (
                      <p className="text-[var(--s-muted)] mt-0.5">{tr('Цялата мрежа', 'Entire network', 'الشبكة كاملة')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden animate-fade-up-fast" style={{ border: '1px solid var(--s-border)', background: 'var(--s-surface)' }}>
          <div className="relative">
            <div id="map" className="w-full rc-map" style={{ height: '680px' }} />
            {/* Dark overlay badges */}
            <div className="pointer-events-none absolute top-4 left-4 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] font-semibold" style={{ background: 'var(--s-popup-bg)', color: 'var(--s-muted2)', border: '1px solid var(--s-border)', backdropFilter: 'blur(8px)' }}>
              {tr('OSM На живо', 'OSM Live', 'OSM مباشر')}
            </div>
            <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] font-bold" style={{ background: 'rgba(6,214,160,0.15)', color: 'var(--s-teal)', border: '1px solid rgba(6,214,160,0.3)', backdropFilter: 'blur(8px)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--s-teal)] animate-pulse" />
              {tr('В реално време', 'Real-time', 'لحظي')}
            </div>
            {showWeather && (
              <div className="pointer-events-none absolute bottom-5 left-5 rounded-2xl px-4 py-3 animate-fade-in" style={{ background: 'var(--s-popup-label-bg)', border: '1px solid var(--s-border)', backdropFilter: 'blur(12px)' }}>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--s-muted)] font-semibold mb-2">{tr('Температура', 'Temperature', 'درجة الحرارة')}</p>
                <div className="relative h-2.5 w-44 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 to-red-500" />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-[var(--s-muted)]">
                  <span>❄️ -5°</span><span>🌤 15°</span><span>🔥 35°</span>
                </div>
              </div>
            )}

            {showWeather && selectedWeather && (
              <div className={`absolute bottom-5 ${showReports && selectedReport ? 'right-5' : 'left-5'} max-w-sm w-[calc(100%-2rem)] md:w-96 rounded-2xl overflow-hidden animate-fade-in shadow-2xl z-[900]`} style={{ background: 'var(--s-popup-bg)', border: '1px solid rgba(96,165,250,0.4)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.3)' }}>
                      {selectedWeather.icon ? (
                        <img src={`https://openweathermap.org/img/wn/${selectedWeather.icon}@2x.png`} alt="weather" className="w-10 h-10" />
                      ) : (
                        <span className="text-2xl">🌤</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--s-muted)]">{tr('Метео информация', 'Weather info', 'معلومات الطقس')}</p>
                      <h3 className="text-sm font-bold text-[var(--s-text)] leading-snug">{selectedWeather.city_name || tr('Избрана локация', 'Selected location', 'موقع محدد')}</h3>
                      <p className="text-[11px] text-[var(--s-muted)] capitalize mt-0.5">{selectedWeather.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedWeather(null);
                        setSelectedLocation(null);
                      }}
                      className="text-[var(--s-muted)] hover:text-[var(--s-text)] text-xs transition-colors"
                      aria-label={tr('Затвори метео прозореца', 'Close weather panel', 'إغلاق نافذة الطقس')}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl p-2.5" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                      <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Температура', 'Temperature', 'درجة الحرارة')}</p>
                      <p className="font-bold text-[var(--s-text)] text-2xl" style={{ color: '#60A5FA' }}>{selectedWeather.temp}°</p>
                      <p className="text-[10px] text-[var(--s-muted)]">{tr('Усеща се', 'Feels like', 'المحسوس')} {selectedWeather.feels_like}°</p>
                    </div>
                    <div className="rounded-xl p-2.5" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                      <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Локация', 'Location', 'الموقع')}</p>
                      <p className="font-semibold text-[var(--s-text)] text-xs leading-tight">{selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : '—'}</p>
                      <p className="text-[10px] text-[var(--s-muted)] mt-1">{tr('Клик за промяна', 'Click to change', 'انقر للتغيير')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl p-2" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <p className="text-[10px] text-[var(--s-muted)] mb-1">{tr('Влажност', 'Humidity', 'الرطوبة')}</p>
                      <p className="font-bold text-[var(--s-text)]">💧 {selectedWeather.humidity}%</p>
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <p className="text-[10px] text-[var(--s-muted)] mb-1">{tr('Вятър', 'Wind', 'الرياح')}</p>
                      <p className="font-bold text-[var(--s-text)]">💨 {Math.round(selectedWeather.wind_speed)}m/s</p>
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <p className="text-[10px] text-[var(--s-muted)] mb-1">{tr('Налягане', 'Pressure', 'الضغط')}</p>
                      <p className="font-bold text-[var(--s-text)]">🎚 {selectedWeather.pressure}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showReports && selectedReport && (
              <div className="absolute bottom-5 left-5 max-w-sm w-[calc(100%-2rem)] md:w-96 rounded-2xl overflow-hidden animate-fade-in shadow-2xl z-[900]" style={{ background: 'var(--s-popup-bg)', border: '1px solid rgba(255,107,43,0.4)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,43,0.2)', border: '1px solid rgba(255,107,43,0.3)' }}>
                      <span className="text-xl">📍</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--s-muted)]">{tr('Градски сигнал', 'City report', 'بلاغ مدني')}</p>
                      <h3 className="text-sm font-bold text-[var(--s-text)] leading-snug">{selectedReport.title}</h3>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedReport(null);
                        setSelectedReportDetails(null);
                        setReportDetailsLoading(false);
                      }}
                      className="text-[var(--s-muted)] hover:text-[var(--s-text)] text-xs transition-colors"
                      aria-label={tr('Затвори сигнала', 'Close report', 'إغلاق البلاغ')}
                    >
                      ✕
                    </button>
                  </div>

                  {reportDetailsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--s-muted)] p-4">
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--s-orange)] border-t-transparent animate-spin" />
                      {tr('Зареждане на информация...', 'Loading details...', 'جار تحميل المعلومات...')}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.15)' }}>
                          <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Статус', 'Status', 'الحالة')}</p>
                          <p className="font-semibold text-[var(--s-text)]">{selectedReportDetails?.status || selectedReport.status}</p>
                        </div>
                        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.15)' }}>
                          <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Категория', 'Category', 'الفئة')}</p>
                          <p className="font-semibold text-[var(--s-text)] text-[11px] leading-tight">
                            {formatCategoryLabel(selectedReportDetails?.category || selectedReport.category || null, tr('Без категория', 'No category', 'بدون فئة'), locale)}
                          </p>
                        </div>
                      </div>

                      {selectedReportDetails?.description && (
                        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.15)' }}>
                          <p className="text-[var(--s-muted)] text-[10px] mb-1">{tr('Описание', 'Description', 'الوصف')}</p>
                          <p className="text-xs text-[var(--s-muted2)] leading-relaxed">
                            {selectedReportDetails.description}
                          </p>
                        </div>
                      )}

                      <div className="text-[11px] text-[var(--s-muted)] space-y-1 rounded-xl p-2.5" style={{ background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.15)' }}>
                        <p><span className="text-[var(--s-orange)]">📍</span> {(selectedReportDetails?.latitude ?? selectedReport.lat).toFixed(4)}, {(selectedReportDetails?.longitude ?? selectedReport.lng).toFixed(4)}</p>
                        {selectedReportDetails?.address && <p><span className="text-[var(--s-orange)]">🏠</span> {selectedReportDetails.address}</p>}
                        {selectedReportDetails?.district && <p><span className="text-[var(--s-orange)]">🗺️</span> {tr('Район', 'District', 'الحي')}: {selectedReportDetails.district}</p>}
                      </div>

                      <Link
                        href={`/signals/${selectedReport.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/signals/${selectedReport.id}`);
                        }}
                        className="inline-flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200 hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8B5B)', color: '#fff', boxShadow: '0 4px 12px rgba(255,107,43,0.3)' }}
                      >
                        {tr('Виж повече →', 'See more →', 'عرض المزيد ←')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {showVehicles && selectedVehicle && (
              <div className={`absolute ${selectedWeather ? 'top-5' : 'bottom-5'} right-5 max-w-sm w-[calc(100%-2rem)] md:w-96 rounded-2xl overflow-hidden animate-fade-in shadow-2xl z-[900]`} style={{ background: 'var(--s-popup-bg)', border: '1px solid rgba(129,140,248,0.4)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${selectedVehicle.color === '#3B82F6' ? '59,130,246' : selectedVehicle.color === '#10B981' ? '16,185,129' : '239,68,68'},0.2)`, border: `1px solid ${selectedVehicle.color}` }}>
                      <span className="text-2xl">{selectedVehicle.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--s-muted)]">{tr('Градски транспорт', 'Public transport', 'النقل العام')}</p>
                      <h3 className="text-sm font-bold text-[var(--s-text)] leading-snug">
                        {selectedVehicle.vehicle_type === 'tram' ? tr('Трамвай', 'Tram', 'ترام') : selectedVehicle.vehicle_type === 'trolley' ? tr('Тролейбус', 'Trolleybus', 'تروليباص') : tr('Автобус', 'Bus', 'حافلة')} {getVehicleRouteLabel(selectedVehicle)}
                      </h3>
                      <p className="text-[11px] text-[var(--s-muted)] mt-0.5">ID: {selectedVehicle.id}</p>
                    </div>
                    <button
                      onClick={() => setSelectedVehicle(null)}
                      className="text-[var(--s-muted)] hover:text-[var(--s-text)] text-xs transition-colors"
                      aria-label={tr('Затвори превозното средство', 'Close vehicle', 'إغلاق المركبة')}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl p-2.5" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                      <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Статус', 'Status', 'الحالة')}</p>
                      <p className="font-semibold text-[var(--s-text)] text-[11px] leading-tight">{selectedVehicle.status}</p>
                    </div>
                    <div className="rounded-xl p-2.5" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                      <p className="text-[var(--s-muted)] text-[10px] mb-0.5">{tr('Скорост', 'Speed', 'السرعة')}</p>
                      <p className="font-semibold text-[var(--s-text)]">{selectedVehicle.speed > 0 ? `${Math.round(selectedVehicle.speed)} ${tr('км/ч', 'km/h', 'كم/س')}` : '—'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                    <p className="text-[var(--s-muted)] text-[10px] mb-1">{tr('Текуща спирка', 'Current stop', 'المحطة الحالية')}</p>
                    <p className="text-xs text-[var(--s-text)] leading-relaxed">
                      {selectedVehicle.current_stop_name ? `${selectedVehicle.current_stop} • ${selectedVehicle.current_stop_name}` : selectedVehicle.current_stop || tr('Информация не е налична', 'Information unavailable', 'المعلومات غير متاحة')}
                    </p>
                  </div>

                  {selectedVehicle.vehicle_model && (
                    <div className="rounded-xl p-2.5" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                      <p className="text-[var(--s-muted)] text-[10px] mb-1">{tr('Модел', 'Model', 'الطراز')}</p>
                      <p className="text-xs text-[var(--s-text)]">{selectedVehicle.vehicle_model}</p>
                    </div>
                  )}

                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      {selectedVehicle.delay !== undefined && (
                        <div>
                          <p className="text-[var(--s-muted)] mb-0.5">{tr('Закъснение', 'Delay', 'التأخير')}</p>
                          <p className="font-semibold" style={{ color: selectedVehicle.delay > 300 ? '#EF4444' : selectedVehicle.delay > 60 ? '#F59E0B' : '#10B981' }}>
                            {Math.round(selectedVehicle.delay)} {tr('сек', 'sec', 'ث')}
                          </p>
                        </div>
                      )}
                      {selectedVehicle.occupancy_percentage !== undefined && (
                        <div>
                          <p className="text-[var(--s-muted)] mb-0.5">{tr('Запълненост', 'Occupancy', 'الإشغال')}</p>
                          <p className="font-semibold text-[var(--s-text)]">{selectedVehicle.occupancy_percentage}%</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-[var(--s-muted)] mb-0.5">{tr('Актуализирано', 'Updated', 'تم التحديث')}</p>
                        <p className="font-semibold text-[var(--s-text)]">{new Date(selectedVehicle.timestamp).toLocaleTimeString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if ((window as any).showVehicleRoute) {
                        (window as any).showVehicleRoute(selectedVehicle.route_id, selectedVehicle.id, selectedVehicle.route_short_name, selectedVehicle.vehicle_type);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${selectedVehicle.color}, ${selectedVehicle.color}dd)`, color: '#fff', boxShadow: `0 4px 12px ${selectedVehicle.color}40` }}
                  >
                    🗺️ {tr('Виж маршрута', 'View route', 'عرض المسار')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer cards */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-4">
        {[
          { emoji: '📍', title: tr('Сигнали в реално', 'Live reports', 'بلاغات مباشرة'), text: tr('Виж всички докладени проблеми и техния статус на живо.', 'See all reported issues and their live status.', 'اعرض كل المشكلات المبلّغ عنها وحالتها المباشرة.') },
          { emoji: '🛒', title: tr('Магазини за храни', 'Food stores', 'متاجر الطعام'), text: tr('Намери магазини с наличности на ключови продукти.', 'Find stores with key product availability.', 'اعثر على متاجر فيها توفر للمنتجات الأساسية.') },
          { emoji: '🌦', title: tr('Метео прогноза', 'Weather forecast', 'توقعات الطقس'), text: tr('Кликни на картата за прогноза и температура за днес и утре.', 'Click on the map for forecast and temperature today and tomorrow.', 'انقر على الخريطة لعرض توقعات ودرجات حرارة اليوم والغد.') },
        ].map(({ emoji, title, text }) => (
          <div key={title} className="rounded-2xl p-5 text-center animate-fade-up" style={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)' }}>
            <div className="text-3xl mb-3">{emoji}</div>
            <h3 className="font-semibold rc-display text-[var(--s-text)] mb-2">{title}</h3>
            <p className="text-[var(--s-muted)] text-sm">{text}</p>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .rc-map {
          position: relative;
        }
        .leaflet-container {
          font-family: 'Manrope', sans-serif;
          background: #1a202c;
        }
        .leaflet-control-attribution {
          font-size: 10px;
          background: rgba(15, 23, 42, 0.9) !important;
          border-radius: 999px;
          padding: 2px 8px;
          color: #94a3b8 !important;
        }
        .leaflet-control-attribution a {
          color: #60a5fa !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(71, 85, 105, 0.5);
          background: rgba(15, 23, 42, 0.95) !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
          font-family: 'Manrope', sans-serif;
          color: #e2e8f0;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95) !important;
        }
        .stop-schedule-popup-dark .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.98) !important;
        }
        .weather-marker {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default InteractiveMapComponent;
