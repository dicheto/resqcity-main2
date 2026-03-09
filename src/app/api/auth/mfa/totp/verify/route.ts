import { NextRequest, NextResponse } from 'next/server';
import { getValidAuthChallenge, consumeAuthChallenge } from '@/hooks/lib/auth-challenges';
import { AuthChallengeKind } from '@prisma/client';
import { prisma } from '@/hooks/lib/prisma';
import { decryptText } from '@/hooks/lib/crypto';
import { verifyTotpCode } from '@/hooks/lib/totp';
import { generateToken } from '@/hooks/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId, code } = body;

    if (!challengeId || !code) {
      return NextResponse.json({ error: 'challengeId and code are required' }, { status: 400 });
    }

    const challenge = await getValidAuthChallenge(challengeId, AuthChallengeKind.LOGIN_MFA);

    if (!challenge) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    const metadata = (challenge.metadata ?? {}) as { methods?: string[] };

    if (!metadata.methods?.includes('TOTP')) {
      return NextResponse.json({ error: 'TOTP is not available for this login attempt' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: 'TOTP is not enabled for this user' }, { status: 400 });
    }

    const secret = decryptText(user.totpSecret);
    const valid = verifyTotpCode(secret, code);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    await consumeAuthChallenge(challenge.id);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kepVerified: user.kepVerified,
      },
    });
  } catch (error) {
    console.error('TOTP verify MFA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
