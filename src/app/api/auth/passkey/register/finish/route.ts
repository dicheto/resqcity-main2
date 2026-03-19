import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { authMiddleware } from '@/hooks/lib/middleware';
import { consumeAuthChallenge, getValidAuthChallenge } from '@/hooks/lib/auth-challenges';
import { prisma } from '@/hooks/lib/prisma';
import { verifyPasskeyRegistration } from '@/hooks/lib/webauthn';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:passkey-register-finish:${authResult.user.userId}:${ip}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const { challengeId, response, name } = body;

    if (!challengeId || !response) {
      return NextResponse.json({ error: 'challengeId and response are required' }, { status: 400 });
    }

    const challenge = await getValidAuthChallenge(challengeId, AuthChallengeKind.PASSKEY_REGISTRATION);

    if (!challenge || !challenge.challenge || challenge.userId !== authResult.user.userId) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    const verification = await verifyPasskeyRegistration({
      response,
      expectedChallenge: challenge.challenge,
    });

    if (!verification.verified || !verification.credentialId || !verification.publicKey) {
      return NextResponse.json({ error: 'Passkey verification failed' }, { status: 400 });
    }

    const existing = await prisma.passkeyCredential.findUnique({
      where: { credentialId: verification.credentialId },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'This passkey is already registered' }, { status: 400 });
    }

    await prisma.passkeyCredential.create({
      data: {
        userId: authResult.user.userId,
        webauthnUserId: authResult.user.userId,
        credentialId: verification.credentialId,
        publicKey: verification.publicKey,
        counter: verification.counter ?? 0,
        transports: verification.transports ?? [],
        deviceType: verification.deviceType ?? null,
        backedUp: verification.backedUp ?? null,
        name: name || null,
      },
    });

    await consumeAuthChallenge(challenge.id);

    return NextResponse.json({ success: true, message: 'Passkey added successfully' });
  } catch (error) {
    console.error('Passkey registration finish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
