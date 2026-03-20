import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import {
  createTaxPayment,
  getMockTaxObligations,
  getProviderMode,
} from '@/hooks/lib/tax-payments';

interface CreatePayByLinkBody {
  obligationId?: string;
  bankHashes?: string[];
  repayable?: boolean;
  requestShortLink?: boolean;
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: CreatePayByLinkBody;

  try {
    body = (await request.json()) as CreatePayByLinkBody;
  } catch (_error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.obligationId) {
    return NextResponse.json({ error: 'obligationId is required' }, { status: 400 });
  }

  const obligations = getMockTaxObligations(authResult.user.userId);
  const obligation = obligations.find((item) => item.id === body.obligationId);

  if (!obligation) {
    return NextResponse.json({ error: 'Tax obligation not found' }, { status: 404 });
  }

  const payment = await createTaxPayment({
    userId: authResult.user.userId,
    obligation,
    bankHashes: body.bankHashes,
    repayable: body.repayable,
    requestShortLink: body.requestShortLink,
  });

  return NextResponse.json({
    mode: getProviderMode(),
    message: 'PayByLink + QR generated successfully',
    payment,
  });
}
