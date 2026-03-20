import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const current = new URL(request.url);
  const target = new URL('/dashboard', current.origin);

  const status = current.searchParams.get('status');
  const paymentHash = current.searchParams.get('paymentHash');
  const orderId = current.searchParams.get('orderId');

  if (status) {
    target.searchParams.set('taxPaymentStatus', status);
  }

  if (paymentHash) {
    target.searchParams.set('paymentHash', paymentHash);
  }

  if (orderId) {
    target.searchParams.set('orderId', orderId);
  }

  return NextResponse.redirect(target);
}
