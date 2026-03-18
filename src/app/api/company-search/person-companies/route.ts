import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { getSubjectCompanies } from '@/hooks/lib/company-search';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const uid = (searchParams.get('uid') || '').trim();
  const name = (searchParams.get('name') || '').trim();

  if (!uid || !name) {
    return NextResponse.json({ error: 'Липсва uid или име на лице.' }, { status: 400 });
  }

  try {
    const response = await getSubjectCompanies(uid, name);
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Fetching subject companies failed:', error);
    return NextResponse.json({ error: 'Неуспешно зареждане на свързаните фирми.' }, { status: 502 });
  }
}
