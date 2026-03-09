import { NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📋 Fetching public report:', params.id);
    
    const selectConfig = {
      id: true,
      title: true,
      description: true,
      status: true,
      latitude: true,
      longitude: true,
      address: true,
      district: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
          nameBg: true,
          nameEn: true,
          icon: true,
        },
      },
    } as const;

    const report = await prisma.report.findUnique({
      where: { id: params.id },
      select: selectConfig,
    });

    if (!report) {
      console.warn('⚠️ Report not found:', params.id);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    console.log('✅ Report found:', report.title);
    return NextResponse.json(report);
  } catch (error) {
    console.error('❌ Error fetching public report details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
