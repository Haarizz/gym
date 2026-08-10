import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { History, Search, RefreshCw, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  financialAuditLogService, type FinancialAuditLog,
} from "../utils/supabase/financial-audit-log-service";

const actionColors: Record<string, string> = {
  CREATE: "bg-blue-100 text-blue-800",
  UPDATE: "bg-yellow-100 text-yellow-800",
  POST: "bg-green-100 text-green-800",
  AUTO_POST: "bg-emerald-100 text-emerald-800",
  REVERSE: "bg-orange-100 text-orange-800",
  CANCEL: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
};

export function FinancialAuditLogPage() {
  const [logs, setLogs] = useState<FinancialAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [module, setModule] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financialAuditLogService.search({
        entityType: entityType || undefined,
        module: module || undefined,
        from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      });
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load financial audit log");
    } finally {
      setLoading(false);
    }
  }, [entityType, module, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Audit Log</h1>
          <p className="text-gray-600 mt-1">Who posted, reversed, cancelled or deleted a voucher — and when</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="e.g. JournalVoucher" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Input placeholder="e.g. BILLING, PAYROLL" value={module} onChange={(e) => setModule(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "PPP") : "Any"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "PPP") : "Any"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Audit Trail
            {loading && <span className="ml-2 text-sm font-normal text-gray-500">(loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm whitespace-nowrap">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={actionColors[l.action] ?? "bg-gray-100 text-gray-800"}>{l.action}</Badge></TableCell>
                    <TableCell>{l.entityType} #{l.entityId}</TableCell>
                    <TableCell className="font-mono text-sm">{l.voucherNo || "—"}</TableCell>
                    <TableCell>{l.module || "—"}</TableCell>
                    <TableCell>{l.performedBy || "—"}</TableCell>
                    <TableCell className="max-w-[320px] truncate" title={l.summary}>{l.summary || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!loading && logs.length === 0 && (
            <div className="text-center py-10">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit log entries found</h3>
              <p className="text-gray-600">Adjust the filters above, or check back after posting a voucher.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
