import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import {
  deactivateTransaction,
  getTransactionById,
} from '@/hooks/lib/tax-payments';

interface RouteContext {
  params: {
    transactionId: string;
  };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const existing = getTransactionById(context.params.transactionId);

  if (!existing || existing.userId !== authResult.user.userId) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  try {
    const transaction = await deactivateTransaction(existing.id);

    return NextResponse.json({
      mode: 'iris-dev',
      message: 'Payment link deactivated',
      transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Deactivate request failed',
        details: error?.message || 'Unknown error',
      },
      { status: 502 }
    );
  }
}
