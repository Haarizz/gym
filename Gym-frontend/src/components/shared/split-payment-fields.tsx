import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { CurrencyGlyph } from "../../utils/currency";
import { FaMoneyBillWave, FaCreditCard, FaFileLines, FaCheck, FaXmark, FaDollarSign } from "react-icons/fa6";

export interface SplitPaymentValue {
  cash: number;
  card: number;
  cheque: number;
}

interface SplitPaymentFieldsProps {
  total: number;
  value: SplitPaymentValue;
  onChange: (value: SplitPaymentValue) => void;
  chequeReference?: string;
  onChequeReferenceChange?: (value: string) => void;
  currencyCode?: string;
}

/**
 * Cash + Card + Cheque split entry for a "Mixed" payment, shared across every
 * payment window (add-member, create-receipt, receipt-voucher, payment-voucher,
 * point-of-sale) so the breakdown sent to the backend — and how it posts to the
 * ledger — is consistent everywhere.
 */
export function isSplitPaymentValid(value: SplitPaymentValue, total: number) {
  const sum = (value.cash || 0) + (value.card || 0) + (value.cheque || 0);
  return Math.abs(sum - total) < 0.01;
}

export function buildSplitPaymentBreakdown(value: SplitPaymentValue, chequeReference?: string) {
  const legs: { method: string; amount: number; reference?: string }[] = [];
  if (value.cash > 0) legs.push({ method: "Cash", amount: value.cash });
  if (value.card > 0) legs.push({ method: "Card", amount: value.card });
  if (value.cheque > 0) {
    legs.push({
      method: "Cheque",
      amount: value.cheque,
      ...(chequeReference ? { reference: chequeReference } : {})
    });
  }
  return legs;
}

export function SplitPaymentFields({
  total,
  value,
  onChange,
  chequeReference,
  onChequeReferenceChange,
  currencyCode = ""
}: SplitPaymentFieldsProps) {
  const valid = isSplitPaymentValid(value, total);
  const sum = (value.cash || 0) + (value.card || 0) + (value.cheque || 0);

  return (
    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
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
            className="mt-1"
            placeholder="0"
          />
        </div>

        <div>
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
            className="mt-1"
            placeholder="0"
          />
        </div>

        <div>
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
            className="mt-1"
            placeholder="0"
          />
        </div>
      </div>

      {value.cheque > 0 && onChequeReferenceChange && (
        <div>
          <Label htmlFor="splitChequeRef">Cheque Reference (optional)</Label>
          <Input
            id="splitChequeRef"
            type="text"
            value={chequeReference || ""}
            onChange={(e) => onChequeReferenceChange(e.target.value)}
            className="mt-1"
            placeholder="Cheque number"
          />
        </div>
      )}

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
    </div>
  );
}
