import { NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';

export async function GET() {
  try {
    let reports;
    try {
      reports = await prisma.report.findMany({
        where: {
          isPublic: true,
        },
        select: {
          id: true,
          title: true,
          latitude: true,
          longitude: true,
          status: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              nameBg: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (queryError) {
      if (
        queryError instanceof Error &&
        queryError.message.includes('Unknown argument `isPublic`')
      ) {
        reports = await prisma.report.findMany({
          select: {
            id: true,
            title: true,
            latitude: true,
            longitude: true,
            status: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                nameBg: true,
                icon: true,
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      } else {
        throw queryError;
      }
    }

    const formattedReports = reports.map((report) => ({
      id: report.id,
      title: report.title,
      lat: parseFloat(report.latitude.toString()),
      lng: parseFloat(report.longitude.toString()),
      status: report.status,
      category: report.category,
      createdAt: report.createdAt,
    }));

    return NextResponse.json(formattedReports);
  } catch (error) {
    console.error('Error fetching public reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
