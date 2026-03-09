import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    
    // Viewport parameters for efficient loading
    const minLatParam = searchParams.get('minLat');
    const maxLatParam = searchParams.get('maxLat');
    const minLngParam = searchParams.get('minLng');
    const maxLngParam = searchParams.get('maxLng');
    
    const limitParam = searchParams.get('limit');
    const yearParam = searchParams.get('year');
    const typeParam = searchParams.get('type');
    const withCasualtiesParam = searchParams.get('withCasualties');

    let accidents = parseAccidentsCSV();

    // Filter by viewport bounding box if provided
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

    // Filter by year
    if (yearParam) {
      accidents = accidents.filter(a => a.year === yearParam);
    }

    // Filter by type
    if (typeParam) {
      accidents = accidents.filter(a => a.type.includes(typeParam));
    }

    // Filter by casualties
    if (withCasualtiesParam === 'true') {
      accidents = accidents.filter(a => a.injured || a.died);
    }

    // Apply limit only if explicitly specified (no default limit)
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        accidents = accidents.slice(0, limit);
      }
    }

    return NextResponse.json({
      success: true,
      total: accidents.length,
      data: accidents,
    });
  } catch (error: any) {
    console.error('Error loading accidents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load accident data',
      },
      { status: 500 }
    );
  }
}
