import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Accident {
  lat: number;
  lng: number;
  severity: number; // 0-3: based on casualties
  type: string;
}

interface RiskZone {
  lat: number;
  lng: number;
  count: number;
  severity: number; // Average severity
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  mostCommonType: string;
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

function parseAccidentsForRisk(): Accident[] {
  if (cachedAccidents && lastCacheTime && Date.now() - lastCacheTime < CACHE_DURATION) {
    return cachedAccidents;
  }

  const csvPath = path.join(process.cwd(), 'mrv_database_done.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parseCsvSync(csvContent, ';');

  const accidents: Accident[] = [];

  for (const record of records) {
    if (!record.y || !record.x || record.y === '' || record.x === '') {
      continue;
    }

    const lat = parseFloat(record.y.replace(',', '.'));
    const lng = parseFloat(record.x.replace(',', '.'));

    if (isNaN(lat) || isNaN(lng) || lat < 41 || lat > 44.5 || lng < 22 || lng > 29) {
      continue;
    }

    // Calculate severity: death=3, injured=2, property damage only=1
    let severity = 1;
    if (record.died === 'да') {
      severity = 3;
    } else if (record.injured === 'да') {
      severity = 2;
    }

    accidents.push({
      lat,
      lng,
      severity,
      type: record.type || 'НЕИЗВЕСТЕН ВИД',
    });
  }

  cachedAccidents = accidents;
  lastCacheTime = Date.now();

  return accidents;
}

function calculateRiskZones(accidents: Accident[], gridSize: number): RiskZone[] {
  // Create a grid-based density map
  const grid = new Map<
    string,
    {
      count: number;
      totalSeverity: number;
      lat: number;
      lng: number;
      typeCounts: Record<string, number>;
    }
  >();

  accidents.forEach(accident => {
    // Round coordinates to grid cell
    const gridLat = Math.round(accident.lat / gridSize) * gridSize;
    const gridLng = Math.round(accident.lng / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;

    const cell =
      grid.get(key) ||
      { count: 0, totalSeverity: 0, lat: gridLat, lng: gridLng, typeCounts: {} };
    cell.count += 1;
    cell.totalSeverity += accident.severity;
    cell.typeCounts[accident.type] = (cell.typeCounts[accident.type] || 0) + 1;
    grid.set(key, cell);
  });

  // Convert grid to risk zones
  const zones: RiskZone[] = [];
  const counts = Array.from(grid.values()).map(c => c.count);
  const maxCount = Math.max(...counts, 1);

  grid.forEach((cell, key) => {
    const avgSeverity = cell.totalSeverity / cell.count;
    const normalizedCount = cell.count / maxCount;
    const mostCommonType = Object.entries(cell.typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'НЕИЗВЕСТЕН ВИД';
    
    // Calculate risk level based on count and severity
    const riskScore = normalizedCount * 0.7 + (avgSeverity / 3) * 0.3;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let color: string;
    
    if (riskScore > 0.7) {
      riskLevel = 'critical';
      color = '#8b5cf6'; // Purple (violet)
    } else if (riskScore > 0.4) {
      riskLevel = 'high';
      color = '#ef4444'; // Red
    } else if (riskScore > 0.15) {
      riskLevel = 'medium';
      color = '#eab308'; // Yellow
    } else {
      riskLevel = 'low';
      color = '#22c55e'; // Green
    }

    zones.push({
      lat: cell.lat,
      lng: cell.lng,
      count: cell.count,
      severity: avgSeverity,
      riskLevel,
      color,
      mostCommonType,
    });
  });

  return zones;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gridSizeParam = searchParams.get('gridSize') || '0.02'; // ~2km default
    const minCountParam = searchParams.get('minCount') || '1';

    const gridSize = parseFloat(gridSizeParam);
    const minCount = parseInt(minCountParam, 10);

    const accidents = parseAccidentsForRisk();
    let riskZones = calculateRiskZones(accidents, gridSize);

    // Filter zones by minimum accident count
    if (minCount > 1) {
      riskZones = riskZones.filter(zone => zone.count >= minCount);
    }

    // Sort by risk level (critical first)
    riskZones.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.riskLevel] - order[b.riskLevel];
    });

    return NextResponse.json({
      success: true,
      total: riskZones.length,
      data: riskZones,
      meta: {
        totalAccidents: accidents.length,
        gridSize,
        minCount,
      },
    });
  } catch (error: any) {
    console.error('Error calculating risk map:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate risk map',
      },
      { status: 500 }
    );
  }
}
