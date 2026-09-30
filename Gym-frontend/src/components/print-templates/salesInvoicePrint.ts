import type { CompanyDetails } from '../../utils/company-details';
import type { CurrencyCode } from '../../utils/currency';
import type { SalesInvoice } from '../../utils/supabase/sales-invoice-service';
import type { Product } from '../../utils/supabase/products-service';
import { displayDate, PAYMENT_TERMS } from '../purchase/purchaseInvoiceUtils';
import { balanceOf } from '../sales-invoice/salesInvoiceUtils';
import type { PrintDocument } from './documentTemplate';

// Prints a Sales Invoice with its default print template (Sales & Purchases ›
// Settings › Print Templates › Sales Invoice) via printPurchaseDocument, which
// is document-type agnostic despite its name.

type CatalogProduct = Pick<Product, 'id' | 'brand' | 'barcode' | 'description' | 'imageUrls'>;

const day = (v?: string) => (v ? displayDate(v.slice(0, 10)) : undefined);
const termsLabel = (v?: string) => (v ? PAYMENT_TERMS.find(t => t.value === v)?.label ?? v : undefined);

export function buildSalesInvoiceDocument(
  inv: SalesInvoice, company: CompanyDetails, currencyCode: CurrencyCode,
  extras: { memberCode?: string } = {}, products: CatalogProduct[] = [],
): PrintDocument {
  const discount = inv.discountAmount + inv.footerDiscount;
  return {
    docType: 'sales-invoice',
    // BillBull titles a taxed invoice "Tax Invoice".
    title: inv.taxAmount > 0 ? 'Tax Invoice' : 'Sales Invoice',
    number: inv.invoiceNumber || 'Draft',
    date: day(inv.invoiceDate) ?? '—',
    company,
    currencyCode,
    supplier: {
      name: inv.customerName || 'Walk-in Customer',
      contact: inv.customerType === 'MEMBER' && extras.memberCode ? `Member ID: ${extras.memberCode}` : undefined,
      address: inv.customerAddress,
      phone: inv.customerPhone,
      email: inv.customerEmail,
      trn: inv.customerTrn,
    },
    meta: [
      { setting: 'showDocNumber', label: 'Invoice No.', value: inv.invoiceNumber || 'Draft' },
      { setting: 'showDocDate', label: 'Invoice Date', value: day(inv.invoiceDate) },
      { setting: 'showDueDate', label: 'Due Date', value: day(inv.dueDate) },
      { setting: 'showPaymentTerms', label: 'Payment Terms', value: termsLabel(inv.paymentTerms) },
      { setting: 'showPOReference', label: 'Customer Ref.', value: inv.reference },
      { setting: 'showSalesperson', label: 'Salesperson', value: inv.salesperson },
      { setting: 'showPreparedBy', label: 'Prepared By', value: inv.createdBy },
    ],
    lines: inv.items.map(i => {
      const p = products.find(x => x.id === i.productId);
      return {
        name: i.productName,
        code: i.productSku,
        sku: i.productSku,
        brand: p?.brand,
        barcode: p?.barcode,
        image: p?.imageUrls?.[0],
        description: [p?.description, i.notes].filter(Boolean).join('\n'),
        uom: i.unitOfMeasure,
        qty: i.quantity,
        price: i.unitPrice,
        discountPercent: i.discountPercent,
        discountAmount: i.discountAmount + i.footerDiscountShare,
        taxable: i.taxableAmount,
        taxPercent: i.taxPercent,
        taxAmount: i.taxAmount,
        total: i.totalAmount,
      };
    }),
    totals: {
      subtotal: inv.subtotal,
      discount,
      taxable: inv.taxableAmount,
      tax: inv.taxAmount,
      shipping: inv.deliveryCharge,
      roundOff: inv.roundOff,
      grandTotal: inv.totalAmount,
      paid: inv.amountPaid,
      balance: inv.status === 'CANCELLED' ? 0 : balanceOf(inv),
    },
    notes: inv.notes,
  };
}
