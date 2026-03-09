import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const [
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      totalUsers,
      recentReports,
      categoryStats,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.user.count(),
      prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.report.groupBy({
        by: ['categoryId'],
        _count: true,
      }),
    ]);

    const categoryIds = categoryStats.map((item) => item.categoryId);
    const categories = await prisma.reportCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, nameBg: true, nameEn: true },
    });

    const categoryNameById = new Map(
      categories.map((item) => [item.id, item.nameBg || item.nameEn])
    );

    const categoryStatsWithNames = categoryStats.map((item) => ({
      ...item,
      categoryName: categoryNameById.get(item.categoryId) || item.categoryId,
    }));

    return NextResponse.json({
      stats: {
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        totalUsers,
      },
      recentReports,
      categoryStats: categoryStatsWithNames,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
