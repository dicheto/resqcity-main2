import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { getTransactionById, refundTransaction } from '@/hooks/lib/tax-payments';

interface RouteContext {
  params: {
    transactionId: string;
  };
}

interface RefundBody {
  refundType?: 'FULL' | 'PARTIAL';
  sum?: number;
  remittanceDescription?: string;
  psuId?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const existing = getTransactionById(context.params.transactionId);

  if (!existing || existing.userId !== authResult.user.userId) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  let body: RefundBody = {};

  try {
    body = (await request.json()) as RefundBody;
  } catch (_error) {
    body = {};
  }

  try {
    const result = await refundTransaction(existing.id, {
      refundType: body.refundType,
      sum: body.sum,
      remittanceDescription: body.remittanceDescription,
      psuId: body.psuId,
    });

    return NextResponse.json({
      mode: 'iris-dev',
      message: 'Refund request sent to IRISPay',
      transaction: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Refund request failed',
        details: error?.message || 'Unknown error',
      },
      { status: 502 }
    );
  }
}
