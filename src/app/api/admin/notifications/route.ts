import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

interface JWTPayload {
  userId: string;
  role: string;
}

function verifyToken(req: NextRequest): JWTPayload | null {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    
    const token = auth.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COUNCILOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate notifications based on recent activity
    const notifications: any[] = [];

    // Check for new pending reports
    const pendingReports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true,
        category: true,
      },
    });

    pendingReports.forEach((report) => {
      const minutesAgo = Math.floor((Date.now() - new Date(report.createdAt).getTime()) / 60000);
      if (minutesAgo < 60) {
        notifications.push({
          id: `report-${report.id}`,
          type: 'info',
          title: 'Нов сигнал',
          message: `${report.title} (${report.category})`,
          link: `/admin/reports/${report.id}/routing`,
          createdAt: report.createdAt,
          read: false,
        });
      }
    });

    // Check for urgent/high priority reports
    const urgentReports = await prisma.report.findMany({
      where: {
        status: 'PENDING',
        priority: 'HIGH',
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    urgentReports.forEach((report) => {
      notifications.push({
        id: `urgent-${report.id}`,
        type: 'error',
        title: 'Спешен сигнал',
        message: report.title,
        link: `/admin/reports/${report.id}/routing`,
        createdAt: report.createdAt,
        read: false,
      });
    });

    // Check for vehicle incidents
    const recentIncidents = await prisma.vehicleIncident.findMany({
      where: {
        status: 'SUBMITTED',
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        type: true,
        createdAt: true,
      },
    });

    recentIncidents.forEach((incident) => {
      const minutesAgo = Math.floor((Date.now() - new Date(incident.createdAt).getTime()) / 60000);
      if (minutesAgo < 30) {
        notifications.push({
          id: `incident-${incident.id}`,
          type: 'error',
          title: 'Нов авто инцидент',
          message: `Тип: ${incident.type}`,
          link: `/admin/vehicle-incidents`,
          createdAt: incident.createdAt,
          read: false,
        });
      }
    });

    // Sort by date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
