import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { createPasskeyRegistrationOptions } from '@/hooks/lib/webauthn';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:passkey-register-begin:${authResult.user.userId}:${ip}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passkeys: {
          select: {
            credentialId: true,
            transports: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const options = await createPasskeyRegistrationOptions({
      userId: user.id,
      userEmail: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      excludeCredentials: user.passkeys.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports as any,
      })),
    });

    const challenge = await createAuthChallenge({
      userId: user.id,
      kind: AuthChallengeKind.PASSKEY_REGISTRATION,
      challenge: options.challenge,
      expiresInSeconds: 600,
    });

    return NextResponse.json({
      challengeId: challenge.id,
      options,
    });
  } catch (error) {
    console.error('Passkey registration begin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
