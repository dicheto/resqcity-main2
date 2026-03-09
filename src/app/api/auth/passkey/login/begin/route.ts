import { NextRequest, NextResponse } from 'next/server';
import { AuthChallengeKind } from '@prisma/client';
import { prisma } from '@/hooks/lib/prisma';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { createPasskeyAuthenticationOptions } from '@/hooks/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passkeys: {
          select: {
            credentialId: true,
            transports: true,
          },
        },
      },
    });

    if (!user || user.passkeys.length === 0) {
      return NextResponse.json(
        { error: 'No passkey is registered for this account' },
        { status: 400 }
      );
    }

    const options = await createPasskeyAuthenticationOptions({
      allowCredentials: user.passkeys.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports as any,
      })),
    });

    const challenge = await createAuthChallenge({
      userId: user.id,
      kind: AuthChallengeKind.PASSKEY_AUTHENTICATION,
      challenge: options.challenge,
      metadata: {
        loginMode: 'PASSWORDLESS',
      },
      expiresInSeconds: 300,
    });

    return NextResponse.json({
      challengeId: challenge.id,
      options,
    });
  } catch (error) {
    console.error('Passkey passwordless begin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
