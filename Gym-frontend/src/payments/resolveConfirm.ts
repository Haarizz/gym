/**
 * Pure resolution of a modal's confirm payload into manager operations,
 * extracted out of PaymentAllocationPanel so the edit-in-place / append /
 * auto-chain behavior is unit-testable without mounting React.
 */

import { CreatePaymentLineInput, PaymentLine, PaymentType } from "./paymentModel";
import { suggestedNextMethod } from "./paymentFlow";

export interface ConfirmDraft {
  paymentType: PaymentType;
  amount: number;
  paymentSubtype?: string | null;
  reference?: string | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
}

export interface ResolveConfirmResult {
  /** Lines to update in place, keyed by id. */
  updates: { id: string; patch: CreatePaymentLineInput }[];
  /** Ids to remove — a modal returned no draft of the edited line's type. */
  removals: string[];
  /** Lines to append, in the order the modal listed them. */
  appends: CreatePaymentLineInput[];
  /** The tender to open next, or null to return to the panel. */
  nextMethod: PaymentType | null;
}

export function draftToLineInput(draft: ConfirmDraft): CreatePaymentLineInput {
  return {
    paymentType: draft.paymentType,
    paymentSubtype: draft.paymentSubtype ?? null,
    amount: draft.amount,
    reference: draft.reference ?? null,
    bankAccountId: draft.bankAccountId ?? null,
    bankAccountName: draft.bankAccountName ?? null,
    customerCode: draft.customerCode ?? null,
    customerName: draft.customerName ?? null,
  };
}

export interface ResolveConfirmArgs {
  drafts: ConfirmDraft | ConfirmDraft[];
  editingLine: PaymentLine | null;
  invoiceTotal: number;
  allocatedBeforeConfirm: number;
  offeredTypes: PaymentType[];
}

/**
 * If editing: the draft whose type matches the edited line replaces it in
 * place; a modal that returns no draft of that type removes the line rather
 * than leaving a stale zero-value tender; any other drafts append. Editing
 * never chains onward.
 *
 * If adding: append in the order the modal listed them, then — when a
 * balance is still owed — resolve the next suggested tender immediately.
 */
export function resolveConfirm({
  drafts,
  editingLine,
  invoiceTotal,
  allocatedBeforeConfirm,
  offeredTypes,
}: ResolveConfirmArgs): ResolveConfirmResult {
  const draftList = Array.isArray(drafts) ? [...drafts] : [drafts];

  if (editingLine) {
    const matchIndex = draftList.findIndex((d) => d.paymentType === editingLine.paymentType);
    const updates: ResolveConfirmResult["updates"] = [];
    const removals: string[] = [];

    if (matchIndex >= 0) {
      const [match] = draftList.splice(matchIndex, 1);
      updates.push({ id: editingLine.id, patch: draftToLineInput(match) });
    } else {
      removals.push(editingLine.id);
    }

    return {
      updates,
      removals,
      appends: draftList.map(draftToLineInput),
      nextMethod: null,
    };
  }

  const appends = draftList.map(draftToLineInput);
  const addedTotal = draftList.reduce((sum, d) => sum + d.amount, 0);
  const remainingAfter = Math.max(0, invoiceTotal - (allocatedBeforeConfirm + addedTotal));
  const lastType = draftList[draftList.length - 1]?.paymentType ?? null;
  const nextMethod = lastType ? suggestedNextMethod(lastType, remainingAfter, offeredTypes) : null;

  return { updates: [], removals: [], appends, nextMethod };
}
