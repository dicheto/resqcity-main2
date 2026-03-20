import { randomUUID } from 'crypto';
import type {
  CreateTaxPaymentInput,
  TaxObligation,
  TaxPaymentStatus,
  TaxPaymentTransaction,
} from '@/types/tax-payments';
import {
  getIrisConfig,
  irisCreatePayment,
  irisDeactivatePaymentLink,
  irisGetBanks,
  irisGetPaymentStatus,
  irisGetQrAsDataUrl,
  irisRefund,
  makeOrderId,
  type IrisBank,
} from '@/hooks/lib/irispay';

const PAY_BY_LINK_VERSION = '3.5.3';
const PROVIDER_MODE = process.env.TAX_PAYMENT_PROVIDER_MODE || 'iris-dev';

type TaxPaymentStore = {
  transactions: Map<string, TaxPaymentTransaction>;
};

declare global {
  var __resqcityTaxPaymentStore: TaxPaymentStore | undefined;
}

function getStore(): TaxPaymentStore {
  if (!global.__resqcityTaxPaymentStore) {
    global.__resqcityTaxPaymentStore = {
      transactions: new Map<string, TaxPaymentTransaction>(),
    };
  }

  return global.__resqcityTaxPaymentStore;
}

function amountForUserSeed(userId: string, salt: number): number {
  const base = userId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Number((((base + salt * 37) % 280) + 40).toFixed(2));
}

export function getMockTaxObligations(userId: string): TaxObligation[] {
  const localTax = amountForUserSeed(userId, 1);
  const vehicleTax = amountForUserSeed(userId, 2);
  const wasteFee = amountForUserSeed(userId, 3);

  return [
    {
      id: 'tax-immovable-2025',
      municipalityCode: 'SOF-01',
      title: 'Данък недвижим имот',
      period: '2025',
      dueDate: '2026-04-30',
      principalAmount: localTax,
      interestAmount: 0,
      totalAmount: Number(localTax.toFixed(2)),
      currency: 'EUR',
      status: 'UNPAID',
    },
    {
      id: 'tax-vehicle-2025',
      municipalityCode: 'SOF-01',
      title: 'Данък МПС',
      period: '2025',
      dueDate: '2026-06-30',
      principalAmount: vehicleTax,
      interestAmount: 0,
      totalAmount: Number(vehicleTax.toFixed(2)),
      currency: 'EUR',
      status: 'UNPAID',
    },
    {
      id: 'tax-waste-2025',
      municipalityCode: 'SOF-01',
      title: 'Такса битови отпадъци',
      period: '2025',
      dueDate: '2026-09-30',
      principalAmount: wasteFee,
      interestAmount: 0,
      totalAmount: Number(wasteFee.toFixed(2)),
      currency: 'EUR',
      status: 'UNPAID',
    },
  ];
}

function mapIrisStatus(status: string | undefined): TaxPaymentStatus {
  if (status === 'WAITING' || status === 'FAILED' || status === 'CONFIRMED') {
    return status;
  }

  if (status === 'INACTIVE') {
    return 'INACTIVE';
  }

  if (!status) {
    return 'UNKNOWN';
  }

  return 'UNKNOWN';
}

function createFallbackMockTransaction(
  input: CreateTaxPaymentInput,
  orderId: string,
  fallbackReason: string
): TaxPaymentTransaction & { qrCodeDataUrl: string } {
  const now = new Date().toISOString();
  const mockHash = `MOCK-${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const transactionId = randomUUID();
  const providerReference = `MOCK-${mockHash.slice(5, 13)}`;
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tax-payments/mock/pay/${transactionId}`;

  const transaction: TaxPaymentTransaction = {
    id: transactionId,
    provider: 'PAY_BY_LINK_QR',
    providerVersion: PAY_BY_LINK_VERSION,
    userId: input.userId,
    obligationId: input.obligation.id,
    paymentHash: mockHash,
    amount: Number(input.obligation.totalAmount.toFixed(2)),
    currency: input.obligation.currency,
    orderId,
    description: `${input.obligation.title} (${input.obligation.period}) [fallback]`,
    receiverIban: getIrisConfig().toIban,
    paymentLink,
    shortPaymentLink: paymentLink,
    qrPayload: mockHash,
    qrCodeDataUrl:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzNDAiIGhlaWdodD0iMzQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iNTAiIHk9IjE2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMTExIj5Nb2NrIFFSPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIxODgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzU1NSI+SVJJUyBkZXYgZmFsbGJhY2s8L3RleHQ+PC9zdmc+',
    status: 'WAITING',
    repayable: input.repayable ?? false,
    isActive: true,
    selectedBankHashes: input.bankHashes || [],
    createdAt: now,
    updatedAt: now,
    rawStatus: `FALLBACK_WAITING: ${fallbackReason}`,
    providerReference,
  };

  getStore().transactions.set(transaction.id, transaction);

  return {
    ...transaction,
    qrCodeDataUrl: transaction.qrCodeDataUrl || '',
  };
}

export async function createTaxPayment(
  input: CreateTaxPaymentInput
): Promise<TaxPaymentTransaction & { qrCodeDataUrl: string }> {
  const now = new Date().toISOString();
  const orderId = makeOrderId(input.userId, input.obligation.id);
  const irisConfig = getIrisConfig();

  if (PROVIDER_MODE === 'mock') {
    return createFallbackMockTransaction(input, orderId, 'TAX_PAYMENT_PROVIDER_MODE=mock');
  }
  try {
    const createResponse = await irisCreatePayment({
      bankHashes: input.bankHashes,
      currency: input.obligation.currency,
      description: `${input.obligation.title} (${input.obligation.period})`,
      name: input.obligation.title.slice(0, 34),
      orderId,
      sum: Number(input.obligation.totalAmount.toFixed(2)),
      repayable: input.repayable ?? false,
      requestShortLink: input.requestShortLink ?? true,
    });

    const qrCodeDataUrl = await irisGetQrAsDataUrl(createResponse.paymentHash);
    const statusResponse = await irisGetPaymentStatus(createResponse.paymentHash);

    const transactionId = randomUUID();
    const providerReference = `PBL-${createResponse.paymentHash.slice(0, 8).toUpperCase()}`;

    const transaction: TaxPaymentTransaction = {
      id: transactionId,
      provider: 'PAY_BY_LINK_QR',
      providerVersion: PAY_BY_LINK_VERSION,
      userId: input.userId,
      obligationId: input.obligation.id,
      paymentHash: createResponse.paymentHash,
      accountId: createResponse.accountId,
      amount: Number(input.obligation.totalAmount.toFixed(2)),
      currency: input.obligation.currency,
      orderId,
      description: `${input.obligation.title} (${input.obligation.period})`,
      receiverIban: irisConfig.toIban,
      paymentLink: createResponse.paymentLink,
      shortPaymentLink: createResponse.shortPaymentLink,
      qrPayload: createResponse.paymentHash,
      qrCodeDataUrl,
      status: mapIrisStatus(statusResponse.status),
      repayable: input.repayable ?? false,
      isActive: true,
      selectedBankHashes: input.bankHashes || [],
      createdAt: now,
      updatedAt: now,
      rawStatus: statusResponse.status,
      providerReference,
    };

    getStore().transactions.set(transaction.id, transaction);

    return {
      ...transaction,
      qrCodeDataUrl,
    };
  } catch (error: any) {
    return createFallbackMockTransaction(
      input,
      orderId,
      error?.message || 'IRIS create payment failed'
    );
  }
}

export function getTransactionById(transactionId: string): TaxPaymentTransaction | null {
  return getStore().transactions.get(transactionId) || null;
}

export async function getBanks(): Promise<IrisBank[]> {
  if (PROVIDER_MODE === 'mock') {
    return [
      {
        bankHash: 'mock-bank-hash',
        name: 'IRIS Test Bank',
        fullName: 'IRIS Solutions Test Bank',
        bic: 'TESTBIC',
        country: 'bulgaria',
      },
    ];
  }

  try {
    return await irisGetBanks();
  } catch (_error) {
    return [
      {
        bankHash: 'mock-bank-hash',
        name: 'IRIS Test Bank',
        fullName: 'IRIS Solutions Test Bank (Fallback)',
        bic: 'TESTBIC',
        country: 'bulgaria',
      },
    ];
  }
}

export function listTransactionsForUser(userId: string): TaxPaymentTransaction[] {
  return [...getStore().transactions.values()]
    .filter((transaction) => transaction.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function syncTransactionStatusById(
  transactionId: string
): Promise<TaxPaymentTransaction | null> {
  const current = getStore().transactions.get(transactionId);

  if (!current) {
    return null;
  }

  if (current.paymentHash.startsWith('MOCK-')) {
    return current;
  }

  const statusResponse = await irisGetPaymentStatus(current.paymentHash);
  const mappedStatus = mapIrisStatus(statusResponse.status);

  const updated: TaxPaymentTransaction = {
    ...current,
    status: mappedStatus,
    rawStatus: statusResponse.status,
    payerBank: statusResponse.payerBank,
    payerIban: statusResponse.payerIban,
    payerName: statusResponse.payerName,
    updatedAt: new Date().toISOString(),
    confirmedAt:
      mappedStatus === 'CONFIRMED'
        ? statusResponse.date || current.confirmedAt || new Date().toISOString()
        : current.confirmedAt,
  };

  getStore().transactions.set(transactionId, updated);

  return updated;
}

export function getTransactionByPaymentHash(
  paymentHash: string
): TaxPaymentTransaction | null {
  const match = [...getStore().transactions.values()].find(
    (transaction) => transaction.paymentHash === paymentHash
  );

  return match || null;
}

export function getTransactionByOrderId(orderId: string): TaxPaymentTransaction | null {
  const match = [...getStore().transactions.values()].find(
    (transaction) => transaction.orderId === orderId
  );

  return match || null;
}

export function updateTransactionStatusByHash(
  paymentHash: string,
  nextStatus: string,
  meta?: {
    payerBank?: string;
    payerIban?: string;
    payerName?: string;
  }
): TaxPaymentTransaction | null {
  const existing = getTransactionByPaymentHash(paymentHash);

  if (!existing) {
    return null;
  }

  const mappedStatus = mapIrisStatus(nextStatus);

  const updated: TaxPaymentTransaction = {
    ...existing,
    status: mappedStatus,
    rawStatus: nextStatus,
    payerBank: meta?.payerBank || existing.payerBank,
    payerIban: meta?.payerIban || existing.payerIban,
    payerName: meta?.payerName || existing.payerName,
    confirmedAt:
      mappedStatus === 'CONFIRMED'
        ? existing.confirmedAt || new Date().toISOString()
        : existing.confirmedAt,
    updatedAt: new Date().toISOString(),
  };

  getStore().transactions.set(updated.id, updated);

  return updated;
}

export function markTransactionPaid(
  transactionId: string,
  providerReference?: string
): TaxPaymentTransaction | null {
  const current = getStore().transactions.get(transactionId);

  if (!current) {
    return null;
  }

  const updated: TaxPaymentTransaction = {
    ...current,
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rawStatus: 'CONFIRMED',
    providerReference: providerReference || current.providerReference,
  };

  getStore().transactions.set(transactionId, updated);

  return updated;
}

export function markExpiredTransactions(): void {
  // Reserved for future local expiration logic.
}

export function resolveObligationsWithStatus(
  obligations: TaxObligation[],
  userId: string
): TaxObligation[] {
  markExpiredTransactions();

  const transactions = listTransactionsForUser(userId);

  return obligations.map((obligation) => {
    const relevant = transactions.filter(
      (transaction) => transaction.obligationId === obligation.id
    );

    const hasPaid = relevant.some((transaction) => transaction.status === 'CONFIRMED');

    if (hasPaid) {
      return {
        ...obligation,
        status: 'PAID',
      };
    }

    return obligation;
  });
}

export async function refundTransaction(
  transactionId: string,
  options?: {
    sum?: number;
    refundType?: 'FULL' | 'PARTIAL';
    remittanceDescription?: string;
    psuId?: string;
  }
): Promise<TaxPaymentTransaction | null> {
  const current = getStore().transactions.get(transactionId);

  if (!current) {
    return null;
  }

  if (current.paymentHash.startsWith('MOCK-')) {
    return current;
  }

  await irisRefund({
    paymentHash: current.paymentHash,
    psuId: options?.psuId,
    refundType: options?.refundType || 'FULL',
    remittanceDescription:
      options?.remittanceDescription || `Refund for ${current.orderId}`,
    sum: options?.sum ?? current.amount,
    webhookUrl: getIrisConfig().hookUrl,
  });

  return current;
}

export async function deactivateTransaction(
  transactionId: string
): Promise<TaxPaymentTransaction | null> {
  const current = getStore().transactions.get(transactionId);

  if (!current) {
    return null;
  }

  if (!current.paymentHash.startsWith('MOCK-')) {
    await irisDeactivatePaymentLink(current.paymentHash);
  }

  const updated: TaxPaymentTransaction = {
    ...current,
    status: 'INACTIVE',
    isActive: false,
    updatedAt: new Date().toISOString(),
  };

  getStore().transactions.set(transactionId, updated);

  return updated;
}

export function getProviderMode(): string {
  return PROVIDER_MODE;
}
