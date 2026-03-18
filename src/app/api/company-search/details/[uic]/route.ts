import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { getCompanyDetails } from '@/hooks/lib/company-search';

const UIC_PATTERN = /^\d{9,13}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: { uic: string } }
) {
  const authResult = await authMiddleware(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const uic = (params.uic || '').trim();
  const { searchParams } = new URL(request.url);
  const entryDate = (searchParams.get('entryDate') || '').trim();

  if (!UIC_PATTERN.test(uic)) {
    return NextResponse.json({ error: 'Невалиден ЕИК/идентификатор.' }, { status: 400 });
  }

  try {
    const details = await getCompanyDetails(uic, entryDate || undefined);
    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Company details fetch failed:', error);
    return NextResponse.json({ error: 'Неуспешно зареждане на детайли за фирмата.' }, { status: 502 });
  }
}
