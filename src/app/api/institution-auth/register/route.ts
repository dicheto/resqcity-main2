import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/hooks/lib/prisma';
import { sendVerificationEmail } from '@/hooks/lib/email';
import { checkRateLimit, getClientIp } from '@/hooks/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = checkRateLimit({
      key: `institution:register:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Твърде много опити. Опитайте отново по-късно.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Въведете валиден имейл.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Вече съществува акаунт с този имейл.' },
        { status: 400 }
      );
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Institution',
        lastName: 'Account',
        role: 'INSTITUTION',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/auth/verify-email?token=${verificationToken}&next=/institutions/auth/setup-passkey`;

    const emailResult = await sendVerificationEmail(user.email, verificationLink);

    if (!emailResult.ok) {
      await prisma.user.delete({ where: { id: user.id } });

      return NextResponse.json(
        {
          error: 'Не успяхме да изпратим потвърдителен имейл. Моля, опитайте отново.',
          smtpError: emailResult.error,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message:
          'Регистрацията е успешна. Потвърдете имейла и след това добавете Passkey за вход в институционалния портал.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Institution register error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
