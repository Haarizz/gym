import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CurrencyGlyph } from "../../utils/currency";
import type { AccountHead } from "../../utils/supabase/account-heads-service";
import { FaMoneyBillWave, FaCreditCard, FaFileLines, FaBuilding, FaMobileScreen, FaCheck, FaXmark, FaDollarSign } from "react-icons/fa6";

export interface SplitPaymentValue {
  cash: number;
  card: number;
  cheque: number;
  bankTransfer: number;
  online: number;
}

export const EMPTY_SPLIT_PAYMENT: SplitPaymentValue = { cash: 0, card: 0, cheque: 0, bankTransfer: 0, online: 0 };

export interface SplitPaymentDetails {
  cardType: string;
  cardReference: string;
  chequeNumber: string;
  chequeBankName: string;
  chequeDate: string;
  bankTransferReference: string;
  bankTransferAccountId: string;
  onlinePaymentType: string;
  onlineProviderName: string;
  onlineReference: string;
}

export const EMPTY_SPLIT_DETAILS: SplitPaymentDetails = {
  cardType: '', cardReference: '',
  chequeNumber: '', chequeBankName: '', chequeDate: '',
  bankTransferReference: '', bankTransferAccountId: '',
  onlinePaymentType: '', onlineProviderName: '', onlineReference: ''
};

export const CARD_TYPE_OPTIONS = ['Visa', 'Mastercard', 'RuPay', 'American Express', 'Maestro', 'Diners Club', 'Other'];
export const ONLINE_PAYMENT_TYPE_OPTIONS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Samsung Pay', 'Apple Pay', 'Amazon Pay', 'UPI', 'Other'];

interface SplitPaymentFieldsProps {
  total: number;
  value: SplitPaymentValue;
  onChange: (value: SplitPaymentValue) => void;
  details: SplitPaymentDetails;
  onDetailsChange: (details: SplitPaymentDetails) => void;
  bankAccounts?: AccountHead[];
  currencyCode?: string;
}

/**
 * Cash + Card + Cheque + Bank Transfer + Online Payment split entry for a
 * "Mixed" payment, shared across every payment window (add-member,
 * create-receipt, receipt-voucher, payment-voucher, point-of-sale) so the
 * breakdown sent to the backend — and how it posts to the ledger — is
 * consistent everywhere. Each leg reveals its own method-specific required
 * fields (card type, cheque number, ...) once given a non-zero amount.
 */
export function isSplitPaymentValid(value: SplitPaymentValue, total: number) {
  const sum = (value.cash || 0) + (value.card || 0) + (value.cheque || 0) + (value.bankTransfer || 0) + (value.online || 0);
  return Math.abs(sum - total) < 0.01;
}

/** Every leg with a non-zero amount must have its method-specific required fields filled in. */
export function isSplitPaymentDetailsValid(value: SplitPaymentValue, details: SplitPaymentDetails) {
  if (value.card > 0 && !details.cardType) return false;
  if (value.cheque > 0 && !details.chequeNumber.trim()) return false;
  if (value.bankTransfer > 0 && !details.bankTransferReference.trim()) return false;
  if (value.online > 0) {
    if (!details.onlinePaymentType) return false;
    if (details.onlinePaymentType === 'Other' && !details.onlineProviderName.trim()) return false;
    if (!details.onlineReference.trim()) return false;
  }
  return true;
}

/**
 * Builds the per-leg breakdown sent to the backend, carrying each leg's own
 * method-specific details (card type, cheque number, ...). NOTE: the backend
 * deserializes every request body — including nested objects like these legs
 * — via a globally-configured SNAKE_CASE Jackson strategy, so multi-word leg
 * fields MUST use snake_case keys (card_type, not cardType) or they silently
 * fail to bind.
 */
export function buildSplitPaymentBreakdown(
  value: SplitPaymentValue,
  details: SplitPaymentDetails,
  bankAccounts: AccountHead[] = []
): Record<string, any>[] {
  const legs: Record<string, any>[] = [];
  if (value.cash > 0) legs.push({ method: 'Cash', amount: value.cash });
  if (value.card > 0) {
    legs.push({
      method: 'Card',
      amount: value.card,
      card_type: details.cardType,
      ...(details.cardReference ? { reference: details.cardReference } : {})
    });
  }
  if (value.cheque > 0) {
    legs.push({
      method: 'Cheque',
      amount: value.cheque,
      cheque_number: details.chequeNumber,
      ...(details.chequeBankName ? { bank_name: details.chequeBankName } : {}),
      ...(details.chequeDate ? { cheque_date: details.chequeDate } : {})
    });
  }
  if (value.bankTransfer > 0) {
    const account = details.bankTransferAccountId
      ? bankAccounts.find(a => String(a.id) === details.bankTransferAccountId)
      : undefined;
    legs.push({
      method: 'Bank Transfer',
      amount: value.bankTransfer,
      reference: details.bankTransferReference,
      ...(account ? { bank_account_code: account.code, bank_account_name: account.name } : {})
    });
  }
  if (value.online > 0) {
    legs.push({
      method: 'Online Payment',
      amount: value.online,
      online_payment_type: details.onlinePaymentType,
      ...(details.onlinePaymentType === 'Other' ? { provider_name: details.onlineProviderName } : {}),
      reference: details.onlineReference
    });
  }
  return legs;
}

export function SplitPaymentFields({
  total,
  value,
  onChange,
  details,
  onDetailsChange,
  bankAccounts = [],
  currencyCode = ""
}: SplitPaymentFieldsProps) {
  const valid = isSplitPaymentValid(value, total);
  const detailsValid = isSplitPaymentDetailsValid(value, details);
  const sum = (value.cash || 0) + (value.card || 0) + (value.cheque || 0) + (value.bankTransfer || 0) + (value.online || 0);

  return (
    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <p className="text-xs text-purple-700">
        Enter an amount for each method used. Leave a method at 0 to leave it out of the split.
      </p>

      {/* Cash leg */}
      <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
        <Label htmlFor="splitCash" className="flex items-center space-x-2">
          <FaMoneyBillWave className="h-4 w-4 text-green-600" />
          <span>Cash Amount {currencyCode && `(${currencyCode})`}</span>
        </Label>
        <Input
          id="splitCash"
          type="number"
          min="0"
          step="0.01"
          value={value.cash}
          onChange={(e) => onChange({ ...value, cash: Math.max(0, parseFloat(e.target.value) || 0) })}
          placeholder="0"
        />
      </div>

      {/* Card leg */}
      <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
        <Label htmlFor="splitCard" className="flex items-center space-x-2">
          <FaCreditCard className="h-4 w-4 text-blue-600" />
          <span>Card Amount {currencyCode && `(${currencyCode})`}</span>
        </Label>
        <Input
          id="splitCard"
          type="number"
          min="0"
          step="0.01"
          value={value.card}
          onChange={(e) => onChange({ ...value, card: Math.max(0, parseFloat(e.target.value) || 0) })}
          placeholder="0"
        />
        {value.card > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs">Card Type <span className="text-red-500">*</span></Label>
              <Select value={details.cardType} onValueChange={(v) => onDetailsChange({ ...details, cardType: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select card type" /></SelectTrigger>
                <SelectContent>
                  {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference (optional)</Label>
              <Input
                value={details.cardReference}
                onChange={(e) => onDetailsChange({ ...details, cardReference: e.target.value })}
                className="mt-1"
                placeholder="Transaction number"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cheque leg */}
      <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
        <Label htmlFor="splitCheque" className="flex items-center space-x-2">
          <FaFileLines className="h-4 w-4 text-gray-600" />
          <span>Cheque Amount {currencyCode && `(${currencyCode})`}</span>
        </Label>
        <Input
          id="splitCheque"
          type="number"
          min="0"
          step="0.01"
          value={value.cheque}
          onChange={(e) => onChange({ ...value, cheque: Math.max(0, parseFloat(e.target.value) || 0) })}
          placeholder="0"
        />
        {value.cheque > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div>
              <Label className="text-xs">Cheque Number <span className="text-red-500">*</span></Label>
              <Input
                value={details.chequeNumber}
                onChange={(e) => onDetailsChange({ ...details, chequeNumber: e.target.value })}
                className="mt-1"
                placeholder="Cheque number"
              />
            </div>
            <div>
              <Label className="text-xs">Bank Name (optional)</Label>
              <Input
                value={details.chequeBankName}
                onChange={(e) => onDetailsChange({ ...details, chequeBankName: e.target.value })}
                className="mt-1"
                placeholder="e.g. SBI"
              />
            </div>
            <div>
              <Label className="text-xs">Cheque Date (optional)</Label>
              <Input
                type="date"
                value={details.chequeDate}
                onChange={(e) => onDetailsChange({ ...details, chequeDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bank Transfer leg */}
      <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
        <Label htmlFor="splitBankTransfer" className="flex items-center space-x-2">
          <FaBuilding className="h-4 w-4 text-teal-600" />
          <span>Bank Transfer Amount {currencyCode && `(${currencyCode})`}</span>
        </Label>
        <Input
          id="splitBankTransfer"
          type="number"
          min="0"
          step="0.01"
          value={value.bankTransfer}
          onChange={(e) => onChange({ ...value, bankTransfer: Math.max(0, parseFloat(e.target.value) || 0) })}
          placeholder="0"
        />
        {value.bankTransfer > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs">Reference <span className="text-red-500">*</span></Label>
              <Input
                value={details.bankTransferReference}
                onChange={(e) => onDetailsChange({ ...details, bankTransferReference: e.target.value })}
                className="mt-1"
                placeholder="Transaction ID"
              />
            </div>
            <div>
              <Label className="text-xs">Bank Account (Ledger)</Label>
              <Select
                value={details.bankTransferAccountId}
                onValueChange={(v) => onDetailsChange({ ...details, bankTransferAccountId: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={bankAccounts.length ? 'Select bank account' : 'No bank accounts in ledger'} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Online Payment leg */}
      <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
        <Label htmlFor="splitOnline" className="flex items-center space-x-2">
          <FaMobileScreen className="h-4 w-4 text-red-600" />
          <span>Online Payment Amount {currencyCode && `(${currencyCode})`}</span>
        </Label>
        <Input
          id="splitOnline"
          type="number"
          min="0"
          step="0.01"
          value={value.online}
          onChange={(e) => onChange({ ...value, online: Math.max(0, parseFloat(e.target.value) || 0) })}
          placeholder="0"
        />
        {value.online > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs">Payment Type <span className="text-red-500">*</span></Label>
              <Select
                value={details.onlinePaymentType}
                onValueChange={(v) => onDetailsChange({ ...details, onlinePaymentType: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                <SelectContent>
                  {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Transaction / Reference ID <span className="text-red-500">*</span></Label>
              <Input
                value={details.onlineReference}
                onChange={(e) => onDetailsChange({ ...details, onlineReference: e.target.value })}
                className="mt-1"
                placeholder="Transaction ID"
              />
            </div>
            {details.onlinePaymentType === 'Other' && (
              <div className="md:col-span-2">
                <Label className="text-xs">Payment Provider Name <span className="text-red-500">*</span></Label>
                <Input
                  value={details.onlineProviderName}
                  onChange={(e) => onDetailsChange({ ...details, onlineProviderName: e.target.value })}
                  className="mt-1"
                  placeholder="Provider name"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <FaDollarSign className="h-4 w-4 text-purple-600" />
          <span className="font-medium">Total Split Amount:</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`font-bold ${valid ? "text-green-600" : "text-red-600"}`}>
            <CurrencyGlyph /> {sum.toFixed(2)}
          </span>
          {valid ? (
            <Badge className="bg-green-100 text-green-800">
              <FaCheck className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <FaXmark className="h-3 w-3 mr-1" />
              Invalid
            </Badge>
          )}
        </div>
      </div>

      {!valid && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <FaXmark className="h-4 w-4" />
          <span>Split amounts must add up to <CurrencyGlyph /> {total.toFixed(2)}</span>
        </p>
      )}

      {valid && !detailsValid && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <FaXmark className="h-4 w-4" />
          <span>Please fill in the required details (marked *) for each method used</span>
        </p>
      )}
    </div>
  );
}
