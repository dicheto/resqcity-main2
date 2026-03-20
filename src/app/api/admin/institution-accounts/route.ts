import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const accounts = await prisma.user.findMany({
      where: {
        role: 'INSTITUTION',
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        institutionLinks: {
          select: {
            institutionId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Institution accounts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch institution accounts' }, { status: 500 });
  }
}
