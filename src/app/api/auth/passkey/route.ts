import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const passkeys = await prisma.passkeyCredential.findMany({
    where: { userId: authResult.user.userId },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ passkeys });
}
