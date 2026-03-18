import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { searchCompanyByEik } from '@/hooks/lib/company-search';

const EIK_PATTERN = /^\d{9,13}$/;

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
  const eik = (searchParams.get('eik') || '').trim();
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 25), 50);

  if (!eik) {
    return NextResponse.json({ error: 'Липсва ЕИК.' }, { status: 400 });
  }

  if (!EIK_PATTERN.test(eik)) {
    return NextResponse.json({ error: 'ЕИК трябва да съдържа само цифри (9 до 13).' }, { status: 400 });
  }

  try {
    const response = await searchCompanyByEik(eik, page, pageSize);
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Company search by EIK failed:', error);
    return NextResponse.json({ error: 'Неуспешно търсене по ЕИК.' }, { status: 502 });
  }
}
