import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      kepVerified: true,
      totpEnabled: true,
      _count: {
        select: {
          passkeys: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      passkeyCount: user._count.passkeys,
    },
  });
}
