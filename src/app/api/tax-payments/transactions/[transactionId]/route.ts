import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import {
  getProviderMode,
  getTransactionById,
  syncTransactionStatusById,
} from '@/hooks/lib/tax-payments';

interface RouteContext {
  params: {
    transactionId: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const syncStatus = request.nextUrl.searchParams.get('sync') !== '0';

  const existing = getTransactionById(context.params.transactionId);

  if (!existing || existing.userId !== authResult.user.userId) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  let transaction = existing;

  if (syncStatus) {
    try {
      const synced = await syncTransactionStatusById(existing.id);
      if (synced) {
        transaction = synced;
      }
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Failed to sync transaction status',
          details: error?.message || 'Unknown error',
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    mode: getProviderMode(),
    transaction,
  });
}
