import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { createPasskeyAuthenticationOptions } from '@/hooks/lib/webauthn';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `institution:passkey-login-begin:${ip}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте отново по-късно.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Имейлът е задължителен.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        passkeys: {
          select: {
            credentialId: true,
            transports: true,
          },
        },
      },
    });

    if (!user || user.role !== 'INSTITUTION') {
      return NextResponse.json(
        { error: 'Няма институционален акаунт с този имейл.' },
        { status: 404 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Потвърдете имейла си преди вход.' },
        { status: 403 }
      );
    }

    if (user.passkeys.length === 0) {
      return NextResponse.json(
        { error: 'Няма регистриран Passkey за този акаунт.' },
        { status: 400 }
      );
    }

    const options = await createPasskeyAuthenticationOptions({
      allowCredentials: user.passkeys.map((credential: { credentialId: string; transports: string[] }) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports as any,
      })),
    });

    const challenge = await createAuthChallenge({
      userId: user.id,
      kind: 'PASSKEY_AUTHENTICATION' as any,
      challenge: options.challenge,
      metadata: {
        loginMode: 'INSTITUTION_PORTAL',
      },
      expiresInSeconds: 300,
    });

    return NextResponse.json({ challengeId: challenge.id, options });
  } catch (error) {
    console.error('Institution passkey begin error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
