import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { getValidAuthChallenge, createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { prisma } from '@/hooks/lib/prisma';
import { createPasskeyAuthenticationOptions } from '@/hooks/lib/webauthn';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:mfa-passkey-begin:${ip}`,
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const loginChallenge = await getValidAuthChallenge(challengeId, AuthChallengeKind.LOGIN_MFA);

    if (!loginChallenge) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    const metadata = (loginChallenge.metadata ?? {}) as { methods?: string[] };

    if (!metadata.methods?.includes('PASSKEY')) {
      return NextResponse.json({ error: 'Passkey is not available for this login attempt' }, { status: 400 });
    }

    const passkeys = await prisma.passkeyCredential.findMany({
      where: { userId: loginChallenge.userId },
      select: { credentialId: true, transports: true },
    });

    if (passkeys.length === 0) {
      return NextResponse.json({ error: 'No passkey registered for this account' }, { status: 400 });
    }

    const options = await createPasskeyAuthenticationOptions({
      allowCredentials: passkeys.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports as any,
      })),
    });

    const passkeyChallenge = await createAuthChallenge({
      userId: loginChallenge.userId,
      kind: AuthChallengeKind.PASSKEY_AUTHENTICATION,
      challenge: options.challenge,
      metadata: {
        loginChallengeId: loginChallenge.id,
      },
      expiresInSeconds: 300,
    });

    return NextResponse.json({
      challengeId: passkeyChallenge.id,
      options,
    });
  } catch (error) {
    console.error('Passkey MFA begin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
