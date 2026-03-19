import { NextRequest, NextResponse } from 'next/server';
import { getValidAuthChallenge, consumeAuthChallenge } from '@/hooks/lib/auth-challenges';
import { AuthChallengeKind } from '@prisma/client';
import { prisma } from '@/hooks/lib/prisma';
import { decryptText } from '@/hooks/lib/crypto';
import { verifyTotpCode } from '@/hooks/lib/totp';
import { generateToken, setAuthCookie } from '@/hooks/lib/auth';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:mfa-totp:${ip}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

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

    const response = NextResponse.json({
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

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('TOTP verify MFA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
