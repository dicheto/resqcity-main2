import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { consumeAuthChallenge, getValidAuthChallenge } from '@/hooks/lib/auth-challenges';
import { prisma } from '@/hooks/lib/prisma';
import { verifyPasskeyAuthentication } from '@/hooks/lib/webauthn';
import { generateToken, setAuthCookie } from '@/hooks/lib/auth';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:passkey-login-finish:${ip}`,
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
    const { challengeId, response } = body;

    if (!challengeId || !response) {
      return NextResponse.json(
        { error: 'challengeId and response are required' },
        { status: 400 }
      );
    }

    const challenge = await getValidAuthChallenge(
      challengeId,
      AuthChallengeKind.PASSKEY_AUTHENTICATION
    );

    if (!challenge || !challenge.challenge) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    const credentialId = String(response.id || '');

    if (!credentialId) {
      return NextResponse.json({ error: 'Invalid passkey response' }, { status: 400 });
    }

    const credential = await prisma.passkeyCredential.findUnique({
      where: { credentialId },
      include: {
        user: true,
      },
    });

    if (!credential || credential.userId !== challenge.userId) {
      return NextResponse.json({ error: 'Passkey not found for this user' }, { status: 404 });
    }

    const verification = await verifyPasskeyAuthentication({
      response,
      expectedChallenge: challenge.challenge,
      verifier: {
        credentialId: credential.credentialId,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Passkey verification failed' }, { status: 401 });
    }

    await Promise.all([
      prisma.passkeyCredential.update({
        where: { id: credential.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
        },
      }),
      consumeAuthChallenge(challenge.id),
    ]);

    const token = generateToken({
      userId: credential.user.id,
      email: credential.user.email,
      role: credential.user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: credential.user.id,
        email: credential.user.email,
        firstName: credential.user.firstName,
        lastName: credential.user.lastName,
        role: credential.user.role,
        kepVerified: credential.user.kepVerified,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('Passkey passwordless finish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
