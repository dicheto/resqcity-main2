import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import {
  getProviderMode,
  getMockTaxObligations,
  listTransactionsForUser,
  resolveObligationsWithStatus,
} from '@/hooks/lib/tax-payments';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const userId = authResult.user.userId;
  const obligations = resolveObligationsWithStatus(
    getMockTaxObligations(userId),
    userId
  );
  const transactions = listTransactionsForUser(userId);

  return NextResponse.json({
    mode: getProviderMode(),
    provider: 'IRISPay Pay by Link/QR',
    providerVersion: '3.5.3',
    obligations,
    recentTransactions: transactions.slice(0, 10),
  });
}
