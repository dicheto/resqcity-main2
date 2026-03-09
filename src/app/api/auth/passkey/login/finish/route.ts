import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { consumeAuthChallenge, getValidAuthChallenge } from '@/hooks/lib/auth-challenges';
import { prisma } from '@/hooks/lib/prisma';
import { verifyPasskeyAuthentication } from '@/hooks/lib/webauthn';
import { generateToken } from '@/hooks/lib/auth';

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Passkey passwordless finish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
