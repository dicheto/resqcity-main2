import { randomUUID } from 'crypto';

const DEFAULT_IRISPAY_BASE_URL = 'https://dev.paybyclick.irispay.bg';
const DEFAULT_IRISPAY_KEY = 'f75fa38d-ca1b-4241-a01a-58965d444aba';
const DEFAULT_TEST_IBAN = 'BG31UNCR70001526254645';

export type IrisCurrency = 'EUR' | 'RON';

export interface IrisBank {
  bankHash: string;
  name: string;
  fullName: string;
  bic?: string;
  services?: string;
  country?: string;
}

export interface IrisCreatePaymentRequest {
  bankHashes?: string[];
  currency: IrisCurrency;
  description: string;
  hookUrl: string;
  lang?: 'bg' | 'ro' | 'el' | 'en' | 'hr';
  name?: string;
  orderId?: string;
  redirectUrl: string;
  sum: number;
  toIban: string;
  repayable?: boolean;
  requestShortLink?: boolean;
}

export interface IrisCreatePaymentResponse {
  accountId: string;
  paymentHash: string;
  paymentLink: string;
  shortPaymentLink?: string;
}

export type IrisPaymentStatus = 'WAITING' | 'FAILED' | 'CONFIRMED' | string;

export interface IrisPaymentStatusResponse {
  currency: IrisCurrency;
  date?: string;
  description?: string;
  orderId?: string;
  payerBank?: string;
  payerIban?: string;
  payerName?: string;
  receiverIban?: string;
  status: IrisPaymentStatus;
  sum: number;
}

export interface IrisRefundRequest {
  paymentHash: string;
  psuId?: string;
  refundType: 'FULL' | 'PARTIAL';
  remittanceDescription: string;
  sum: number;
  webhookUrl: string;
}

export interface IrisRefundResponse {
  bankScaType?: string;
  url?: string;
}

interface IrisConfig {
  baseUrl: string;
  key: string;
  toIban: string;
  hookUrl: string;
  redirectUrl: string;
  lang: 'bg' | 'ro' | 'el' | 'en' | 'hr';
}

export function getIrisConfig(): IrisConfig {
  return {
    baseUrl: process.env.IRISPAY_BASE_URL || DEFAULT_IRISPAY_BASE_URL,
    key: process.env.IRISPAY_MERCHANT_KEY || DEFAULT_IRISPAY_KEY,
    toIban: process.env.IRISPAY_TO_IBAN || DEFAULT_TEST_IBAN,
    hookUrl: process.env.IRISPAY_HOOK_URL || 'https://example.com/resqcity/irispay-hook',
    redirectUrl:
      process.env.IRISPAY_REDIRECT_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    lang: (process.env.IRISPAY_LANG as IrisConfig['lang']) || 'bg',
  };
}

async function irisFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getIrisConfig();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IRIS API error (${response.status}): ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(`IRIS API response is not JSON for ${path}`);
  }

  return (await response.json()) as T;
}

export async function irisGetBanks(): Promise<IrisBank[]> {
  const { key } = getIrisConfig();
  return irisFetch<IrisBank[]>(`/backend/payment/banks/${key}`, {
    method: 'GET',
  });
}

export async function irisCreatePayment(
  request: Omit<IrisCreatePaymentRequest, 'hookUrl' | 'redirectUrl' | 'toIban' | 'lang'> &
    Partial<Pick<IrisCreatePaymentRequest, 'hookUrl' | 'redirectUrl' | 'toIban' | 'lang'>>
): Promise<IrisCreatePaymentResponse> {
  const config = getIrisConfig();

  const payload: IrisCreatePaymentRequest = {
    ...request,
    hookUrl: request.hookUrl || config.hookUrl,
    redirectUrl: request.redirectUrl || config.redirectUrl,
    toIban: request.toIban || config.toIban,
    lang: request.lang || config.lang,
  };

  return irisFetch<IrisCreatePaymentResponse>(`/backend/payment/external/${config.key}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function irisGetPaymentStatus(paymentHash: string): Promise<IrisPaymentStatusResponse> {
  return irisFetch<IrisPaymentStatusResponse>(`/backend/payment/status/${paymentHash}`, {
    method: 'GET',
  });
}

export async function irisGetQrAsDataUrl(paymentHash: string): Promise<string> {
  const { baseUrl } = getIrisConfig();
  const url = `${baseUrl}/backend/payment/qr/${paymentHash}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'image/jpeg',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IRIS QR error (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

export async function irisRefund(request: IrisRefundRequest): Promise<IrisRefundResponse> {
  const { key } = getIrisConfig();
  return irisFetch<IrisRefundResponse>(`/backend/payment/external/refund/${key}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export async function irisDeactivatePaymentLink(paymentHash: string): Promise<void> {
  const { key } = getIrisConfig();

  await irisFetch<unknown>(`/backend/payment/inactive/${key}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ paymentHash }),
  });
}

export function makeOrderId(userId: string, obligationId: string): string {
  return `RESQCITY-${userId.slice(0, 8)}-${obligationId}-${randomUUID().slice(0, 8)}`;
}
