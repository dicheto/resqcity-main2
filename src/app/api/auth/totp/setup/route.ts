import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { generateTotpSecret, buildTotpOtpAuthUrl } from '@/hooks/lib/totp';
import { encryptText } from '@/hooks/lib/crypto';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { AuthChallengeKind } from '@prisma/client';

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        id: true,
        email: true,
        totpEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.totpEnabled) {
      return NextResponse.json({ error: 'Google Authenticator is already enabled' }, { status: 400 });
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptText(secret);
    const otpAuthUrl = buildTotpOtpAuthUrl(user.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    const challenge = await createAuthChallenge({
      userId: user.id,
      kind: AuthChallengeKind.TOTP_ENROLL,
      metadata: {
        encryptedSecret,
      },
      expiresInSeconds: 600,
    });

    return NextResponse.json({
      challengeId: challenge.id,
      qrCodeDataUrl,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
