import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ChevronDown, Gift, Mail, MessageSquare, RefreshCw, Search, User, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ListPagination } from "../list-pagination";
import { useCurrency } from "../../utils/currency";
import { useBranch } from "../../utils/branch-context";
import { useDebouncedValue } from "../../utils/use-debounced-value";
import { printCreditReceipt } from "../../utils/receipt-invoice";
import {
  customerCreditsService, CREDIT_TYPES, type CustomerCredit, type CustomerCreditsPage,
} from "../../utils/supabase/customer-credits-service";
import bs from "../../pages/billing.module.css";

const PAGE_SIZE = 20;

const TYPE_COLOR: Record<string, string> = {
  "Refund as credit": "bg-blue-100 text-blue-800",
  "Referral reward": "bg-purple-100 text-purple-800",
  "Manual credit": "bg-slate-100 text-slate-700",
};

/**
 * Billing › Member Receipts › Customer Credits: credit held on member wallets (refunds kept
 * as credit, referral rewards...), each with what is used and what is left.
 */
export function CustomerCreditsPanel() {
  const navigate = useNavigate();
  const { formatCurrency, currencyCode } = useCurrency();
  const { activeBranchId } = useBranch();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerCreditsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [debounced, type, status, activeBranchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    customerCreditsService.list({ search: debounced || undefined, type, status, page, size: PAGE_SIZE })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e?.message || "Could not load customer credits"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, type, status, page, activeBranchId]);

  const sum = data?.summary;
  const money = (n: number) => formatCurrency(Number(n) || 0);
  const printReceipt = (c: CustomerCredit) => printCreditReceipt({
    creditNo: c.creditNo, date: c.date, memberName: c.memberName, memberId: c.memberId, memberPhone: c.memberPhone,
    memberEmail: c.memberEmail, creditType: c.creditType, remarks: c.remarks, amount: c.amount, used: c.used,
    balance: c.balance, status: c.status, processedBy: c.processedBy,
  }, currencyCode);
  const whatsApp = (c: CustomerCredit) => {
    const phone = (c.memberPhone || "").replace(/[^\d]/g, "");
    const text = `Hi ${c.memberName}, you have ${money(c.balance)} of credit (${c.creditNo}) on your wallet, ready to use at checkout.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const email = (c: CustomerCredit) => {
    window.open(`mailto:${c.memberEmail ?? ""}?subject=${encodeURIComponent(`Your credit ${c.creditNo}`)}&body=${encodeURIComponent(
      `Hi ${c.memberName},\n\nYou have ${money(c.balance)} of credit (${c.creditNo}, ${c.creditType}) on your wallet. It can be used at checkout.`)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className={bs.cards}>
        {[
          { label: "Total Credits", value: sum ? sum.totalCredits.toLocaleString() : "—", tone: "blue", icon: <Wallet /> },
          { label: "Active Credits", value: sum ? sum.active.toLocaleString() : "—", tone: "green", icon: <CheckCircle /> },
          { label: "Fully Used", value: sum ? sum.fullyUsed.toLocaleString() : "—", tone: "amber", icon: <RefreshCw /> },
          { label: "Total Balance", value: sum ? money(sum.totalBalance) : "—", tone: "teal", icon: <Gift /> },
        ].map(card => (
          <div key={card.label} className={bs.card}>
            <div>
              <div className={bs.cardLabel}>{card.label}</div>
              <div className={bs.cardValue}>{card.value}</div>
            </div>
            <span className={bs.cardIcon} data-tone={card.tone}>{card.icon}</span>
          </div>
        ))}
      </div>

      <div className={bs.banner}>
        <div className={bs.bannerMain}>
          <span className={bs.bannerIcon}><Gift /></span>
          <div>
            <div className={bs.bannerLabel}>Total outstanding credit balance</div>
            <div className={bs.bannerValue}>{sum ? money(sum.totalBalance) : "—"}</div>
          </div>
        </div>
        {sum && (
          <div className={bs.bannerSide}>
            <div className={bs.bannerLabel}>Held by</div>
            <div className={bs.bannerSideValue}>{sum.membersWithBalance} member{sum.membersWithBalance === 1 ? "" : "s"}</div>
            <div className={bs.bannerLabel}>{money(sum.totalIssued)} issued in total</div>
          </div>
        )}
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className={bs.tableTitle}>
            <Wallet className="h-4 w-4 text-primary" />
            Customer Credit Ledger
            <span className={bs.count}>{(data?.total ?? 0).toLocaleString()}</span>
          </CardTitle>
          <CardDescription>Credit on member wallets — spending uses the oldest credit first. Credits don't expire.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={bs.creditFilters}>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search member, phone or credit no…" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Credit type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {CREDIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Fully Used">Fully used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="text-center py-12 text-red-600 text-sm">{error}</div>
          ) : !loading && (data?.credits.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {search || type !== "all" || status !== "all"
                ? "No credits match these filters."
                : "No customer credits yet. Refunds kept as credit and referral rewards show up here."}
            </div>
          ) : (
            <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Credit No.</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Credit Type</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.credits ?? []).map(c => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        {c.date ? (
                          <>
                            <div className={bs.when}>{new Date(c.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                            {c.processedBy && <div className={bs.whenSub}>{c.processedBy}</div>}
                          </>
                        ) : "-"}
                      </TableCell>
                      <TableCell><div className={bs.receiptNo}>{c.creditNo}</div></TableCell>
                      <TableCell>
                        <div className="font-medium">{c.memberName}</div>
                        <div className="text-xs text-muted-foreground">{c.memberId}{c.remarks ? ` · ${c.remarks}` : ""}</div>
                      </TableCell>
                      <TableCell><Badge className={TYPE_COLOR[c.creditType] ?? "bg-slate-100 text-slate-700"}>{c.creditType}</Badge></TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{money(c.amount)}</TableCell>
                      <TableCell className="text-right text-red-600 whitespace-nowrap">{c.used > 0 ? money(c.used) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap" style={{ color: c.balance > 0 ? "#2B7A78" : undefined }}>{money(c.balance)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">No expiry</TableCell>
                      <TableCell>
                        <Badge className={c.status === "Active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className={bs.actions}>
                          <button type="button" className={bs.primaryAction} onClick={() => printReceipt(c)} title="Print the customer credit receipt">
                            <Gift /> Credit receipt
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2.5">More <ChevronDown className="h-3.5 w-3.5 ml-1" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {c.memberDbId != null && (
                                <DropdownMenuItem onClick={() => navigate("/member-history-analytics", { state: { memberId: c.memberDbId } })}>
                                  <User className="h-4 w-4 mr-2 text-blue-600" /> Member profile
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled={!c.memberPhone} onClick={() => whatsApp(c)}>
                                <MessageSquare className="h-4 w-4 mr-2 text-green-600" /> Send via WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => email(c)}>
                                <Mail className="h-4 w-4 mr-2 text-orange-600" /> Send via email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <ListPagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} noun="credits" disabled={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
