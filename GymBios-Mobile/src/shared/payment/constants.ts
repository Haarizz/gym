import type { OnlineMethodType, PaymentMethod } from './types';

export interface PaymentMethodOption {
  id: PaymentMethod;
  /** Feather icon name */
  iconName: string;
  /** Stripe-collected tiles need a publishable key (and a native build). */
  online: boolean;
  /** Stripe only offers UPI and net banking for INR. */
  inrOnly?: boolean;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'card', iconName: 'credit-card', online: true },
  { id: 'upi', iconName: 'smartphone', online: true, inrOnly: true },
  { id: 'netbanking', iconName: 'globe', online: true, inrOnly: true },
  { id: 'cash', iconName: 'dollar-sign', online: false },
  { id: 'credit', iconName: 'clock', online: false },
  { id: 'mixed', iconName: 'layers', online: false },
];

export const ONLINE_METHOD_TYPES: OnlineMethodType[] = ['card', 'upi', 'netbanking'];

/**
 * What the API receives for each method — the same titles the backend, receipts and
 * reports already know. UPI / Net banking are "Online Payment" legs with a type.
 */
export const METHOD_API_TITLES: Record<PaymentMethod, string> = {
  card: 'Card',
  upi: 'Online Payment',
  netbanking: 'Online Payment',
  cash: 'Cash',
  credit: 'Credit',
  mixed: 'Mixed',
};

export const ONLINE_PAYMENT_TYPE_LABELS: Record<OnlineMethodType, string | undefined> = {
  card: undefined,
  upi: 'UPI',
  netbanking: 'Net Banking',
};
