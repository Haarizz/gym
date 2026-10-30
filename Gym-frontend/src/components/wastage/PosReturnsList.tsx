import React, { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ListPagination } from "../list-pagination";
import { useCurrency } from "../../utils/currency";
import { posApi } from "../../pos/api";
import type { SaleReturn } from "../../pos/types";

const PAGE_SIZE = 20;

const METHOD_LABELS: Record<string, string> = {
  ORIGINAL: "Original payment",
  CASH: "Cash",
  CARD: "Card",
  ONLINE: "Online",
  CREDIT: "Account credit",
  WALLET: "Wallet",
  MIXED: "Mixed",
};

/**
 * Customer returns taken at the Point of Sale, listed beside the Wastage / Return vouchers.
 * Read-only: the POS return already refunded the customer, put restocked items back and
 * posted its journal, so there is nothing here to approve or cancel.
 */
export function PosReturnsList() {
  const { formatCurrency } = useCurrency();
  const [rows, setRows] = useState<SaleReturn[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      posApi.listReturns({ search: search.trim() || undefined, page, size: PAGE_SIZE })
        .then((r) => { if (!cancelled) { setRows(r.returns); setTotal(r.pagination.total); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load POS returns"); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, reload]);

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search return no., sale no. or customer..."
                className="pl-11 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReload((n) => n + 1)} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Returns taken at the Point of Sale. They were refunded and (when restocked) put back into stock when they
            were made, so they need no approval here.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-md">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : !loading && rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No POS returns{search ? " match this search" : " yet"}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.returnNumber}
                      <div><Badge variant="outline" className="mt-1 text-[10px]">From POS</Badge></div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : r.businessDate ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.transactionNumber}</TableCell>
                    <TableCell>{r.memberName || "Walk-in"}</TableCell>
                    <TableCell className="text-sm">
                      {r.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {METHOD_LABELS[r.refundMethod] ?? r.refundMethod}
                      {r.cashierName && <div className="text-xs text-muted-foreground">by {r.cashierName}</div>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
                      {formatCurrency(Number(r.totalAmount) || 0)}
                    </TableCell>
                    <TableCell>
                      {r.restock
                        ? <Badge className="bg-green-100 text-green-800">Restocked</Badge>
                        : <Badge className="bg-gray-100 text-gray-700">Not restocked</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="px-4 pb-4">
          <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="returns" disabled={loading} />
        </div>
      </Card>
    </div>
  );
}
