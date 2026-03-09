import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { isAdminRole } from '@/hooks/lib/roles';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!isAdminRole(decoded.role)) {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, routingTargetId, customName, customEmail, customPhone, customNotes } = body;

    if (!reportId || !routingTargetId) {
      return NextResponse.json(
        { error: 'reportId and routingTargetId are required' },
        { status: 400 }
      );
    }

    // Check if customization already exists
    const existing = await prisma.reportRecipientCustomization.findUnique({
      where: {
        reportId_routingTargetId: {
          reportId,
          routingTargetId,
        },
      },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.reportRecipientCustomization.update({
        where: { id: existing.id },
        data: {
          customName: customName || existing.customName,
          customEmail: customEmail || existing.customEmail,
          customPhone: customPhone || existing.customPhone,
          customNotes: customNotes || existing.customNotes,
        },
      });
      return NextResponse.json({ customization: updated });
    }

    // Create new
    const customization = await prisma.reportRecipientCustomization.create({
      data: {
        reportId,
        routingTargetId,
        customName,
        customEmail,
        customPhone,
        customNotes,
      },
    });

    return NextResponse.json(
      { customization },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating/updating customization:', error);
    return NextResponse.json(
      { error: 'Failed to save customization' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = await prisma.reportRecipientCustomization.delete({
      where: { id },
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error deleting customization:', error);
    return NextResponse.json(
      { error: 'Failed to delete customization' },
      { status: 500 }
    );
  }
}
