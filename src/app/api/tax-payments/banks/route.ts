import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { getBanks, getProviderMode } from '@/hooks/lib/tax-payments';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const banks = await getBanks();

    return NextResponse.json({
      mode: getProviderMode(),
      banks,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch IRIS bank hashes',
        details: error?.message || 'Unknown error',
      },
      { status: 502 }
    );
  }
}
