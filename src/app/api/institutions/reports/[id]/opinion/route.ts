import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authMiddleware } from '@/hooks/lib/middleware';
import { canInstitutionAccessReport } from '@/hooks/lib/institution-access';
import { prisma } from '@/hooks/lib/prisma';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authMiddleware(request, ['INSTITUTION']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const canAccess = await canInstitutionAccessReport(authResult.user.userId, params.id);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const note = String(formData.get('note') || '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файлът е задължителен.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Неподдържан тип файл.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Файлът е твърде голям (макс 10MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name) || '.bin';
    const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    const relativeDir = path.join('uploads', 'institution-opinions', params.id);
    const targetDir = path.join(process.cwd(), 'public', relativeDir);

    await fs.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, safeName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/${relativeDir.replace(/\\/g, '/')}/${safeName}`;
    const commentText = note
      ? `[СТАНОВИЩЕ] ${file.name}\n${note}\nФайл: ${publicUrl}`
      : `[СТАНОВИЩЕ] ${file.name}\nФайл: ${publicUrl}`;

    await prisma.comment.create({
      data: {
        reportId: params.id,
        userId: authResult.user.userId,
        content: commentText,
      },
    });

    await prisma.reportHistory.create({
      data: {
        reportId: params.id,
        action: 'INSTITUTION_OPINION_ADDED',
        description: `Institution uploaded opinion document: ${file.name}`,
      },
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      fileUrl: publicUrl,
    });
  } catch (error) {
    console.error('Institution opinion upload error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
