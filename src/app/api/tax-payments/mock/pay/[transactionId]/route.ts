import { NextRequest, NextResponse } from 'next/server';
import { getProviderMode, markTransactionPaid } from '@/hooks/lib/tax-payments';

interface RouteContext {
  params: {
    transactionId: string;
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const updated = markTransactionPaid(context.params.transactionId, `MOCK-${Date.now()}`);

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({
    mode: getProviderMode(),
    message: 'Mock payment page reached. Transaction has been marked as CONFIRMED.',
    transaction: updated,
  });
}
