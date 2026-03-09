import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { authMiddleware } from '@/hooks/lib/middleware';
import { getValidAuthChallenge, consumeAuthChallenge } from '@/hooks/lib/auth-challenges';
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
    const { challengeId, code } = body;

    if (!challengeId || !code) {
      return NextResponse.json({ error: 'challengeId and code are required' }, { status: 400 });
    }

    const challenge = await getValidAuthChallenge(challengeId, AuthChallengeKind.TOTP_ENROLL);

    if (!challenge || challenge.userId !== authResult.user.userId) {
      return NextResponse.json({ error: 'Invalid or expired setup challenge' }, { status: 400 });
    }

    const metadata = (challenge.metadata ?? {}) as { encryptedSecret?: string };

    if (!metadata.encryptedSecret) {
      return NextResponse.json({ error: 'Missing setup secret' }, { status: 400 });
    }

    const secret = decryptText(metadata.encryptedSecret);
    const valid = verifyTotpCode(secret, code);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: {
        totpEnabled: true,
        totpSecret: metadata.encryptedSecret,
      },
    });

    await consumeAuthChallenge(challenge.id);

    return NextResponse.json({
      success: true,
      message: 'Google Authenticator enabled successfully',
    });
  } catch (error) {
    console.error('TOTP verify setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
