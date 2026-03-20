import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByOrderId,
  updateTransactionStatusByHash,
} from '@/hooks/lib/tax-payments';

function normalizeStatus(value: string | null): string {
  const normalized = (value || '').trim().toUpperCase();

  if (!normalized) {
    return 'UNKNOWN';
  }

  return normalized;
}

function buildSuccessResponse(payload: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...payload });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const paymentHash = url.searchParams.get('paymentHash') || '';
  const orderId = url.searchParams.get('orderId') || '';
  const status = normalizeStatus(url.searchParams.get('status'));

  let targetHash = paymentHash;

  if (!targetHash && orderId) {
    const byOrder = getTransactionByOrderId(orderId);
    targetHash = byOrder?.paymentHash || '';
  }

  if (!targetHash) {
    return NextResponse.json({ error: 'Missing paymentHash/orderId in callback' }, { status: 400 });
  }

  const updated = updateTransactionStatusByHash(targetHash, status);

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found for callback' }, { status: 404 });
  }

  return buildSuccessResponse({
    source: 'query',
    status,
    paymentHash: targetHash,
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (_error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const paymentHash = String(body.paymentHash || '');
  const orderId = String(body.orderId || '');
  const status = normalizeStatus(String(body.status || ''));

  let targetHash = paymentHash;

  if (!targetHash && orderId) {
    const byOrder = getTransactionByOrderId(orderId);
    targetHash = byOrder?.paymentHash || '';
  }

  if (!targetHash) {
    return NextResponse.json({ error: 'Missing paymentHash/orderId in callback body' }, { status: 400 });
  }

  const updated = updateTransactionStatusByHash(targetHash, status, {
    payerBank: typeof body.payerBank === 'string' ? body.payerBank : undefined,
    payerIban: typeof body.payerIban === 'string' ? body.payerIban : undefined,
    payerName: typeof body.payerName === 'string' ? body.payerName : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found for callback' }, { status: 404 });
  }

  return buildSuccessResponse({
    source: 'body',
    status,
    paymentHash: targetHash,
  });
}
