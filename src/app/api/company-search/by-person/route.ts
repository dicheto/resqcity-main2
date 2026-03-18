import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { searchSubjectsByName } from '@/hooks/lib/company-search';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('query') || '').trim();
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 25), 50);

  if (!query) {
    return NextResponse.json({ error: 'Липсва име на физическо лице.' }, { status: 400 });
  }

  try {
    const response = await searchSubjectsByName(query, page, pageSize);
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Subject search failed:', error);
    return NextResponse.json({ error: 'Неуспешно търсене на физическо лице.' }, { status: 502 });
  }
}
