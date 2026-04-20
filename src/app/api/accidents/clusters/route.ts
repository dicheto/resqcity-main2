import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';

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

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  severity: number; // 0-3: none to fatal
  hasInjured: boolean;
  hasFatalities: boolean;
  accidents: Accident[];
}

function parseCsvSync(content: string, delimiter = ';'): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^\uFEFF/, ''));
  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
    return obj;
  });
}

// Cache for parsed accidents data
let cachedAccidents: Accident[] | null = null;
let lastCacheTime: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function parseAccidentsCSV(): Accident[] {
  // Return cached data if still valid
  if (cachedAccidents && lastCacheTime && Date.now() - lastCacheTime < CACHE_DURATION) {
    return cachedAccidents;
  }

  const csvPath = path.join(process.cwd(), 'mrv_database_done.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parseCsvSync(csvContent, ';');

  const accidents: Accident[] = [];

  for (const record of records) {
    // Skip records without coordinates
    if (!record.y || !record.x || record.y === '' || record.x === '') {
      continue;
    }

    const lat = parseFloat(record.y.replace(',', '.'));
    const lng = parseFloat(record.x.replace(',', '.'));

    // Validate coordinates (rough Bulgaria bounds)
    if (isNaN(lat) || isNaN(lng) || lat < 41 || lat > 44.5 || lng < 22 || lng > 29) {
      continue;
    }

    accidents.push({
      year: record.year,
      date: record.date,
      time: record.time,
      lat,
      lng,
      type: record.type || 'НЕИЗВЕСТЕН ВИД',
      injured: record.injured === 'да',
      died: record.died === 'да',
    });
  }

  // Cache the parsed data
  cachedAccidents = accidents;
  lastCacheTime = Date.now();

  return accidents;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Viewport parameters
    const minLatParam = searchParams.get('minLat');
    const maxLatParam = searchParams.get('maxLat');
    const minLngParam = searchParams.get('minLng');
    const maxLngParam = searchParams.get('maxLng');
    const gridSizeParam = searchParams.get('gridSize') || '0.01'; // ~1km default

    let accidents = parseAccidentsCSV();

    // Filter by viewport
    if (minLatParam && maxLatParam && minLngParam && maxLngParam) {
      const minLat = parseFloat(minLatParam);
      const maxLat = parseFloat(maxLatParam);
      const minLng = parseFloat(minLngParam);
      const maxLng = parseFloat(maxLngParam);

      accidents = accidents.filter(a => 
        a.lat >= minLat && a.lat <= maxLat && 
        a.lng >= minLng && a.lng <= maxLng
      );
    }

    const gridSize = parseFloat(gridSizeParam);

    // Create grid-based clusters
    const clusterMap = new Map<string, Cluster>();

    accidents.forEach((accident) => {
      const gridX = Math.floor(accident.lat / gridSize);
      const gridY = Math.floor(accident.lng / gridSize);
      const gridKey = `${gridX},${gridY}`;

      if (!clusterMap.has(gridKey)) {
        clusterMap.set(gridKey, {
          lat: (gridX + 0.5) * gridSize,
          lng: (gridY + 0.5) * gridSize,
          count: 0,
          severity: 0,
          hasInjured: false,
          hasFatalities: false,
          accidents: [],
        });
      }

      const cluster = clusterMap.get(gridKey)!;
      cluster.count++;
      cluster.hasInjured = cluster.hasInjured || accident.injured;
      cluster.hasFatalities = cluster.hasFatalities || accident.died;
      
      // Calculate severity (0-3)
      let severity = 0;
      if (accident.injured) severity = 2;
      if (accident.died) severity = 3;
      cluster.severity = Math.max(cluster.severity, severity);

      // Store all accidents in cluster
      cluster.accidents.push(accident);
    });

    const clusters = Array.from(clusterMap.values());

    return NextResponse.json({
      success: true,
      data: clusters,
      totalAccidents: accidents.length,
      totalClusters: clusters.length,
    });
  } catch (error) {
    console.error('Error fetching accident clusters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accident clusters' },
      { status: 500 }
    );
  }
}
