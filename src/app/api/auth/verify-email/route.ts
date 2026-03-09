import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/hooks/lib/prisma';
import { generateToken } from '@/hooks/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Липсва токен' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Невалиден или изтекъл потвърдителен линк.' },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({ alreadyVerified: true, message: 'Имейлът вече е потвърден.' });
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Линкът е изтекъл. Моля, регистрирай се отново.' },
        { status: 400 }
      );
    }

    // Verify the user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        kepVerified: true,
      },
    });

    // Issue JWT so the user is immediately logged in
    const jwtToken = generateToken({
      userId: updated.id,
      email: updated.email,
      role: updated.role,
    });

    return NextResponse.json({
      message: 'Имейлът е потвърден успешно!',
      user: updated,
      token: jwtToken,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
