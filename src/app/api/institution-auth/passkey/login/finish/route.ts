import { NextRequest, NextResponse } from 'next/server';
import { consumeAuthChallenge, getValidAuthChallenge } from '@/hooks/lib/auth-challenges';
import { prisma } from '@/hooks/lib/prisma';
import { verifyPasskeyAuthentication } from '@/hooks/lib/webauthn';
import { generateToken, setAuthCookie } from '@/hooks/lib/auth';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `institution:passkey-login-finish:${ip}`,
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Твърде много опити за верификация.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const { challengeId, response: passkeyResponse } = body;

    if (!challengeId || !passkeyResponse) {
      return NextResponse.json({ error: 'challengeId и response са задължителни.' }, { status: 400 });
    }

    const challenge = await getValidAuthChallenge(challengeId, 'PASSKEY_AUTHENTICATION' as any);

    if (!challenge || !challenge.challenge) {
      return NextResponse.json({ error: 'Невалидно или изтекло предизвикателство.' }, { status: 400 });
    }

    const credentialId = String(passkeyResponse.id || '');
    if (!credentialId) {
      return NextResponse.json({ error: 'Невалиден Passkey отговор.' }, { status: 400 });
    }

    const credential = await prisma.passkeyCredential.findUnique({
      where: { credentialId },
      include: { user: true },
    });

    if (!credential || credential.userId !== challenge.userId || credential.user.role !== 'INSTITUTION') {
      return NextResponse.json({ error: 'Passkey не е намерен за институционален акаунт.' }, { status: 404 });
    }

    const verification = await verifyPasskeyAuthentication({
      response: passkeyResponse,
      expectedChallenge: challenge.challenge,
      verifier: {
        credentialId: credential.credentialId,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Passkey верификацията е неуспешна.' }, { status: 401 });
    }

    await Promise.all([
      prisma.passkeyCredential.update({
        where: { id: credential.id },
        data: { counter: verification.authenticationInfo.newCounter },
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
    console.error('Institution passkey finish error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
