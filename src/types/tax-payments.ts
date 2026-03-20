export type TaxObligationStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type TaxCurrency = 'EUR' | 'RON';

export interface TaxObligation {
  id: string;
  municipalityCode: string;
  title: string;
  period: string;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  currency: TaxCurrency;
  status: TaxObligationStatus;
}

export type TaxPaymentStatus =
  | 'WAITING'
  | 'FAILED'
  | 'CONFIRMED'
  | 'INACTIVE'
  | 'UNKNOWN';

export interface TaxPaymentTransaction {
  id: string;
  provider: 'PAY_BY_LINK_QR';
  providerVersion: string;
  userId: string;
  obligationId: string;
  paymentHash: string;
  accountId?: string;
  amount: number;
  currency: TaxCurrency;
  orderId: string;
  description: string;
  receiverIban: string;
  paymentLink: string;
  shortPaymentLink?: string;
  qrPayload: string;
  qrCodeDataUrl?: string;
  status: TaxPaymentStatus;
  repayable: boolean;
  isActive: boolean;
  selectedBankHashes: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  payerBank?: string;
  payerIban?: string;
  payerName?: string;
  rawStatus?: string;
  providerReference: string;
}

export interface CreateTaxPaymentInput {
  userId: string;
  obligation: TaxObligation;
  bankHashes?: string[];
  repayable?: boolean;
  requestShortLink?: boolean;
}
