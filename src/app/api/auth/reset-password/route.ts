import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/hooks/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Липсват задължителни полета' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Паролата трябва да е поне 6 символа' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Невалиден или изтекъл линк за смяна на парола.' },
        { status: 400 }
      );
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Линкът е изтекъл. Моля, заяви нов.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return NextResponse.json({ message: 'Паролата е сменена успешно!' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
