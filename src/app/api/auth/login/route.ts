import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/hooks/lib/prisma';
import { generateToken, setAuthCookie } from '@/hooks/lib/auth';
import { AuthChallengeKind } from '@prisma/client';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `auth:login:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.role === 'INSTITUTION') {
      return NextResponse.json(
        { error: 'За институционални акаунти използвайте вход с Passkey от институционалния портал.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Невалидни данни за вход' },
        { status: 401 }
      );
    }

    // Check for MFA methods (Passkey or TOTP)
    const passkeyCount = await prisma.passkeyCredential.count({
      where: { userId: user.id },
    });

    const mfaMethods: string[] = [];

    if (user.totpEnabled && user.totpSecret) {
      mfaMethods.push('TOTP');
    }

    if (passkeyCount > 0) {
      mfaMethods.push('PASSKEY');
    }

    if (mfaMethods.length > 0) {
      const challenge = await createAuthChallenge({
        userId: user.id,
        kind: AuthChallengeKind.LOGIN_MFA,
        metadata: {
          methods: mfaMethods,
        },
        expiresInSeconds: 300,
      });

      return NextResponse.json({
        requiresSecondFactor: true,
        challengeId: challenge.id,
        methods: mfaMethods,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          kepVerified: user.kepVerified,
        },
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kepVerified: user.kepVerified,
      },
      token,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
