import { NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      byStatus,
      byCategory,
      byDistrict,
      recentReports,
      last30Days,
      totalCount,
    ] = await Promise.all([
      // Group by status
      prisma.report.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      // Group by category (join category name)
      prisma.report.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 10,
      }),

      // Group by district
      prisma.report.groupBy({
        by: ['district'],
        _count: { _all: true },
        orderBy: { _count: { district: 'desc' } },
        take: 20,
        where: { district: { not: null } },
      }),

      // Latest 15 reports for the live feed
      prisma.report.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          district: true,
          address: true,
          createdAt: true,
          category: { select: { nameBg: true, icon: true } },
        },
      }),

      // Daily counts for last 30 days
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM reports
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `,

      // Total
      prisma.report.count(),
    ]);

    // Resolve category names
    const categoryIds = byCategory.map((b) => b.categoryId);
    const categories = await prisma.reportCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, nameBg: true, icon: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const byCategoryFormatted = byCategory.map((b) => ({
      name: catMap[b.categoryId]?.nameBg ?? b.categoryId,
      icon: catMap[b.categoryId]?.icon ?? '📋',
      count: b._count._all,
    }));

    // Format daily trend (fill missing days with 0)
    const dailyMap = new Map<string, number>();
    for (const row of last30Days) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      dailyMap.set(key, Number(row.count));
    }
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyTrend.push({ date: key, count: dailyMap.get(key) ?? 0 });
    }

    // Status labels in Bulgarian
    const statusBg: Record<string, string> = {
      PENDING: 'Нов',
      IN_REVIEW: 'В преглед',
      IN_PROGRESS: 'В процес',
      RESOLVED: 'Решен',
      REJECTED: 'Отхвърлен',
    };
    const byStatusFormatted = byStatus.map((b) => ({
      status: b.status,
      label: statusBg[b.status] ?? b.status,
      count: b._count._all,
    }));

    const byDistrictFormatted = byDistrict.map((b) => ({
      district: b.district ?? 'Неизвестен',
      count: b._count._all,
    }));

    // Compute today's and this-week's resolved
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [resolvedToday, resolvedThisWeek] = await Promise.all([
      prisma.report.count({
        where: { status: 'RESOLVED', updatedAt: { gte: today } },
      }),
      prisma.report.count({
        where: { status: 'RESOLVED', updatedAt: { gte: weekAgo } },
      }),
    ]);

    return NextResponse.json({
      total: totalCount,
      resolvedToday,
      resolvedThisWeek,
      byStatus: byStatusFormatted,
      byCategory: byCategoryFormatted,
      byDistrict: byDistrictFormatted,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        statusLabel: statusBg[r.status] ?? r.status,
        district: r.district ?? null,
        address: r.address ?? null,
        category: r.category?.nameBg ?? null,
        categoryIcon: r.category?.icon ?? '📋',
        createdAt: r.createdAt,
      })),
      dailyTrend,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[/api/stats] error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
