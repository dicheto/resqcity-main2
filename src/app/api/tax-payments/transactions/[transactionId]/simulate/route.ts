import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import {
  getProviderMode,
  getTransactionById,
  markTransactionPaid,
} from '@/hooks/lib/tax-payments';

interface RouteContext {
  params: {
    transactionId: string;
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const transaction = getTransactionById(context.params.transactionId);

  if (!transaction || transaction.userId !== authResult.user.userId) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  const paid = markTransactionPaid(transaction.id);

  return NextResponse.json({
    mode: getProviderMode(),
    message: 'Mock callback processed: payment marked as PAID',
    transaction: paid,
  });
}
