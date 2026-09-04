package com.company.project.controlplane.service.migration;

import com.company.project.controlplane.service.migration.SchemaIntrospector.ForeignKeyEdge;

import java.util.List;

/**
 * A small, explicit, hand-verified list of parent-child relationships that exist at
 * the JPA/application level (a @Column holding another table's id) but have NO real
 * database-level FOREIGN KEY constraint — confirmed absent from a live query of
 * information_schema.table_constraints. Without this bridge, SchemaIntrospector's
 * pure FK-graph walk would classify each of these child tables as "Global" (no path
 * to any branch_id-bearing table) and copy them in full, unfiltered — which happens
 * to be harmless today only because this source database holds exactly one gym, and
 * would silently leak other gyms' data into a target tenant database if this source
 * ever held more than one.
 *
 * Deliberately NOT derived by a naming heuristic (e.g. "any column ending in _id
 * matching another table's name"): salary_payment_employees.employee_id is a plain
 * unique String business key matching Staff.staffId, not a numeric FK to any table's
 * surrogate PK — a heuristic would have incorrectly bridged it. Each entry below was
 * verified by reading the actual entity source, not inferred from column naming.
 */
public final class BridgeEdges {

    private BridgeEdges() {}

    public static final List<ForeignKeyEdge> JPA_ONLY_EDGES = List.of(
            // MemberNote.memberId -> Member.id (entities/MemberNote.java, plain @Column, no @JoinColumn)
            new ForeignKeyEdge("member_notes", "member_id", "members", "id"),
            // MemberAddon.memberDbId -> Member.id (entities/MemberAddon.java; memberId on this same
            // entity is a separate String business key, not this bridge's concern)
            new ForeignKeyEdge("member_addons", "member_db_id", "members", "id"),
            // SaleTransactionItem.transactionId -> SaleTransaction.id (entities/SaleTransactionItem.java)
            new ForeignKeyEdge("sale_transaction_items", "transaction_id", "sale_transactions", "id"),
            // PurchaseOrderItem.purchaseOrderId -> PurchaseOrder.id (entities/PurchaseOrderItem.java)
            new ForeignKeyEdge("purchase_order_items", "purchase_order_id", "purchase_orders", "id"),
            // JournalVoucherLine.journalVoucherId -> JournalVoucher.id (entities/JournalVoucherLine.java)
            new ForeignKeyEdge("journal_voucher_lines", "journal_voucher_id", "journal_vouchers", "id"),
            // SupplierBillItem.billId -> SupplierBill.id (entities/SupplierBillItem.java)
            new ForeignKeyEdge("supplier_bill_items", "bill_id", "supplier_bills", "id"),
            // WastageReturnItem.voucherId -> WastageReturn.id (entities/WastageReturnItem.java)
            new ForeignKeyEdge("wastage_return_items", "voucher_id", "wastage_returns", "id"),
            // PaymentVoucherBill.paymentVoucherId -> PaymentVoucher.id (entities/PaymentVoucherBill.java)
            new ForeignKeyEdge("payment_voucher_bills", "payment_voucher_id", "payment_vouchers", "id")
            // salary_payment_employees.employee_id is deliberately NOT here — verified to be a
            // String business key (unique, matches Staff.staffId), not a numeric FK to any
            // table's surrogate id. It has no DB-level scoping mechanism at all and is treated
            // as global reference data by TenantDataMigrationService, with an explicit note
            // logged at migration time so this isn't mistaken for an oversight later.
    );
}
