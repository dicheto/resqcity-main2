import { NextRequest, NextResponse } from 'next/server';
import { verifyToken as verifyJwtToken } from '@/hooks/lib/auth';

interface JWTPayload {
  userId: string;
  role: string;
}

function verifyToken(req: NextRequest): JWTPayload | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.substring(7);
  const decoded = verifyJwtToken(token);

  if (!decoded) {
    return null;
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = verifyToken(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, we're using local storage on client side
    // In production, you'd store read status in database
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
