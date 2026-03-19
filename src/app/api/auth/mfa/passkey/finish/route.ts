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
      key: `auth:mfa-passkey-finish:${ip}`,
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
      return NextResponse.json({ error: 'challengeId and response are required' }, { status: 400 });
    }

    const challenge = await getValidAuthChallenge(challengeId, AuthChallengeKind.PASSKEY_AUTHENTICATION);

    if (!challenge || !challenge.challenge) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    const credentialId = response.id;

    if (!credentialId) {
      return NextResponse.json({ error: 'Invalid passkey response' }, { status: 400 });
    }

    const credential = await prisma.passkeyCredential.findUnique({
      where: { credentialId },
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

    await prisma.passkeyCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
      },
    });

    const metadata = (challenge.metadata ?? {}) as { loginChallengeId?: string };

    if (!metadata.loginChallengeId) {
      return NextResponse.json({ error: 'Missing login challenge linkage' }, { status: 400 });
    }

    const loginChallenge = await getValidAuthChallenge(metadata.loginChallengeId, AuthChallengeKind.LOGIN_MFA);

    if (!loginChallenge || loginChallenge.userId !== challenge.userId) {
      return NextResponse.json({ error: 'Login challenge is invalid or expired' }, { status: 400 });
    }

    await Promise.all([
      consumeAuthChallenge(challenge.id),
      consumeAuthChallenge(loginChallenge.id),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    console.error('Passkey MFA finish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
