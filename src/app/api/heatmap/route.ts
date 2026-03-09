import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Get all reports with coordinates for heatmap
    const reports = await prisma.report.findMany({
      select: {
        id: true,
        latitude: true,
        longitude: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    // Format for heatmap visualization
    const heatmapData = reports.map((report) => ({
      lat: report.latitude,
      lng: report.longitude,
      weight: report.priority === 'URGENT' ? 3 : report.priority === 'HIGH' ? 2 : 1,
      category: report.category,
      status: report.status,
    }));

    return NextResponse.json({ data: heatmapData });
  } catch (error) {
    console.error('Heatmap data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
