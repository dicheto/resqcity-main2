import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { decryptText } from '@/hooks/lib/crypto';
import { verifyTotpCode } from '@/hooks/lib/totp';

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { code } = body;

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        id: true,
        totpEnabled: true,
        totpSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ success: true, message: 'Google Authenticator is already disabled' });
    }

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required to disable TOTP' }, { status: 400 });
    }

    const secret = decryptText(user.totpSecret);
    const valid = verifyTotpCode(secret, code);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Google Authenticator disabled' });
  } catch (error) {
    console.error('TOTP disable error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
