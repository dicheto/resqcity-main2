import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/hooks/lib/prisma';
import { sendVerificationEmail } from '@/hooks/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, verifyEmail } = body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Паролата трябва да е поне 6 символа' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Вече съществува акаунт с този имейл' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine if we should send verification email.
    // SKIP_EMAIL_VERIFICATION=true in .env bypasses the step entirely (dev / staging mode).
    const skipByEnv = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    const shouldVerifyEmail = !skipByEnv && verifyEmail !== false;
    
    let userData: any = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
    };

    // If email verification is not required, mark as verified immediately
    if (!shouldVerifyEmail) {
      userData.emailVerified = true;
    } else {
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      userData.emailVerified = false;
      userData.emailVerificationToken = verificationToken;
      userData.emailVerificationExpiry = verificationExpiry;
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
      },
    });

    // Send verification email if requested
    if (shouldVerifyEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verificationLink = `${appUrl}/auth/verify-email?token=${userData.emailVerificationToken}`;
      const emailSent = await sendVerificationEmail(user.email, verificationLink);

      if (!emailSent) {
        // Roll back user creation so they can retry registration cleanly.
        await prisma.user.delete({ where: { id: user.id } });

        return NextResponse.json(
          {
            error:
              'Не успяхме да изпратим потвърдителен имейл. Моля, опитайте отново след малко.',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({
      message: shouldVerifyEmail 
        ? 'Регистрацията е успешна! Изпратихме потвърдителен имейл.'
        : 'Регистрацията е успешна! Може да се впишеш веднага.',
      email: user.email,
      emailVerified: user.emailVerified,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}
