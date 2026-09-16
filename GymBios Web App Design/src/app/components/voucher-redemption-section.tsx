import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Gift,
  Tag,
  Ticket,
  Check,
  X,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';

interface VoucherRedemptionSectionProps {
  voucherList: any[];
  voucherCode: string;
  setVoucherCode: (code: string) => void;
  voucherError: string;
  setVoucherError: (error: string) => void;
  isValidatingVoucher: boolean;
  appliedVoucher: any;
  voucherDiscount: number;
  discountAmount: number;
  getMembershipDetails: () => { price: number; name: string };
  getFinalPrice: () => number;
  handleRedeemVoucher: () => void;
  handleRemoveVoucher: () => void;
}

export function VoucherRedemptionSection({
  voucherList,
  voucherCode,
  setVoucherCode,
  voucherError,
  setVoucherError,
  isValidatingVoucher,
  appliedVoucher,
  voucherDiscount,
  discountAmount,
  getMembershipDetails,
  getFinalPrice,
  handleRedeemVoucher,
  handleRemoveVoucher
}: VoucherRedemptionSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <Ticket className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-lg">Redeem Voucher Code (Optional)</h3>
      </div>
      
      {!appliedVoucher ? (
        <>
          {/* Active Vouchers List */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
              <Gift className="h-4 w-4 mr-2" />
              Active Voucher Codes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {voucherList.map((voucher) => (
                <div 
                  key={voucher.id}
                  className="bg-white border border-purple-200 rounded-lg p-3 hover:border-purple-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-purple-900">{voucher.name}</div>
                      <div className="text-xs text-purple-600 font-mono bg-purple-100 rounded px-2 py-0.5 inline-block mt-1">
                        {voucher.code}
                      </div>
                    </div>
                    <Badge className="bg-purple-500 text-white text-xs">
                      {voucher.discountType === 'percentage' 
                        ? `${voucher.discountValue}% OFF` 
                        : `${voucher.discountValue} AED OFF`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-purple-700 mt-2 pt-2 border-t border-purple-100">
                    <span>Valid until: {new Date(voucher.validUntil).toLocaleDateString()}</span>
                    <span>{voucher.usageLimit - voucher.usedCount} left</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Voucher Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-purple-900">Enter Voucher Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (e.g., WELCOME2024)"
                  value={voucherCode}
                  onChange={(e) => {
                    setVoucherCode(e.target.value.toUpperCase());
                    setVoucherError('');
                  }}
                  className={`flex-1 ${voucherError ? 'border-red-500' : ''}`}
                  disabled={isValidatingVoucher}
                />
                <Button
                  onClick={handleRedeemVoucher}
                  disabled={!voucherCode || isValidatingVoucher}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isValidatingVoucher ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply
                    </>
                  )}
                </Button>
              </div>
              {voucherError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{voucherError}</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-500 rounded-full">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className="bg-purple-600 text-white">
                    Voucher Applied
                  </Badge>
                  <span className="font-semibold text-purple-900">{appliedVoucher.name}</span>
                </div>
                <div className="text-xs text-purple-700 font-mono bg-white rounded px-2 py-1 inline-block">
                  {appliedVoucher.code}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-purple-700">
                - {voucherDiscount.toFixed(2)} <span className="text-sm">AED</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveVoucher}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
          
          {/* Show updated total with voucher */}
          {(discountAmount > 0 || voucherDiscount > 0) && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-purple-800">
                  <span>Base Price:</span>
                  <span>{getMembershipDetails().price.toFixed(2)} AED</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span>- {discountAmount.toFixed(2)} AED</span>
                  </div>
                )}
                <div className="flex justify-between text-purple-700 font-semibold">
                  <span>Voucher:</span>
                  <span>- {voucherDiscount.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-200 font-bold text-purple-900">
                  <span>Final Amount:</span>
                  <span className="text-lg">{getFinalPrice().toFixed(2)} AED</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
