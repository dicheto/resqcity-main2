import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/hooks/lib/prisma';
import { generateToken } from '@/hooks/lib/auth';
import { AuthChallengeKind } from '@prisma/client';
import { createAuthChallenge } from '@/hooks/lib/auth-challenges';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
