import type { PaymentMethod } from './types';

export interface PaymentMethodOption {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  iconName: string; // Feather icon name
  badgeColor: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cash',
    title: 'Cash',
    subtitle: 'Physical cash payment',
    iconName: 'dollar-sign',
    badgeColor: '#10B981',
  },
  {
    id: 'card',
    title: 'Card',
    subtitle: 'Debit or Credit Card',
    iconName: 'credit-card',
    badgeColor: '#3B82F6',
  },
  {
    id: 'credit',
    title: 'Credit',
    subtitle: 'Add to member account',
    iconName: 'book-open',
    badgeColor: '#F59E0B',
  },
  {
    id: 'mixed',
    title: 'Mixed Payment',
    subtitle: 'Split across methods',
    iconName: 'layers',
    badgeColor: '#8B5CF6',
  },
  {
    id: 'cheque',
    title: 'Cheque',
    subtitle: 'Paper cheque payment',
    iconName: 'file-text',
    badgeColor: '#64748B',
  },
  {
    id: 'bank_transfer',
    title: 'Bank Transfer',
    subtitle: 'Direct wire / ETF',
    iconName: 'server',
    badgeColor: '#14B8A6',
  },
  {
    id: 'online',
    title: 'Online Payment',
    subtitle: 'UPI, Wallet, Stripe',
    iconName: 'smartphone',
    badgeColor: '#EF4444',
  },
];

export const CARD_TYPE_OPTIONS = [
  'Visa',
  'Mastercard',
  'American Express',
  'Discover',
  'Diners Club',
  'UnionPay',
  'Other',
];

export const ONLINE_PAYMENT_TYPE_OPTIONS = [
  'UPI',
  'Google Pay',
  'PhonePe',
  'Paytm',
  'PayPal',
  'Stripe',
  'Apple Pay',
  'Other',
];

export interface LedgerBankAccount {
  id: string;
  code: string;
  name: string;
}

export const DEFAULT_BANK_ACCOUNTS: LedgerBankAccount[] = [
  { id: '1', code: '1010', name: 'Main Operating Account (Emirates NBD)' },
  { id: '2', code: '1020', name: 'Petty Cash Bank (ADCB)' },
  { id: '3', code: '1030', name: 'Revenue Collection Account (FAB)' },
];
