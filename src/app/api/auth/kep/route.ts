import { NextRequest, NextResponse } from 'next/server';
import { initiateKEPAuth, exchangeKEPCode } from '@/hooks/lib/kep';
import { prisma } from '@/hooks/lib/prisma';
import { authMiddleware } from '@/hooks/lib/middleware';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // If no code, initiate KEP auth flow
  if (!code) {
    const authUrl = initiateKEPAuth();
    return NextResponse.json({ authUrl });
  }

  // Exchange code for KEP verification
  const authResult = await authMiddleware(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const kepResult = await exchangeKEPCode(code);

  if (!kepResult.success) {
    return NextResponse.json(
      { error: kepResult.error },
      { status: 400 }
    );
  }

  // Update user with KEP verification
  const user = await prisma.user.update({
    where: { id: authResult.user.userId },
    data: {
      kepVerified: true,
      kepId: kepResult.kepId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      kepVerified: true,
      kepId: true,
    },
  });

  return NextResponse.json({ user });
}
