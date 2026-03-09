import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const credential = await prisma.passkeyCredential.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });

  if (!credential || credential.userId !== authResult.user.userId) {
    return NextResponse.json({ error: 'Passkey not found' }, { status: 404 });
  }

  await prisma.passkeyCredential.delete({ where: { id: credential.id } });

  return NextResponse.json({ success: true, message: 'Passkey removed' });
}
