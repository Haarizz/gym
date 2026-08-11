import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Plus, RefreshCw, CalendarClock, Lock, Unlock, XCircle } from "lucide-react";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  fiscalYearService, type FiscalYear, type FiscalPeriod, type FiscalYearCreateRequest,
} from "../utils/supabase/fiscal-year-service";

const defaultForm: FiscalYearCreateRequest = {
  name: `FY${new Date().getFullYear()}`,
  startDate: `${new Date().getFullYear()}-01-01`,
  endDate: `${new Date().getFullYear()}-12-31`,
};

const yearStatusColors: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const periodStatusColors: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-yellow-100 text-yellow-800",
  LOCKED: "bg-red-100 text-red-800",
};

export function FiscalPeriodsPage() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FiscalYearCreateRequest>(defaultForm);

  const loadYears = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fiscalYearService.getYears();
      setYears(data);
      if (!selectedYearId && data.length > 0) setSelectedYearId(data[0].id);
    } catch (err: any) {
      toast.error(err.message || "Failed to load fiscal years");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => { loadYears(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedYearId) { setPeriods([]); return; }
    fiscalYearService.getPeriods(selectedYearId).then(setPeriods).catch((err) => toast.error(err.message || "Failed to load periods"));
  }, [selectedYearId]);

  const handleCreateYear = async () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error("Name, start and end date are required"); return; }
    try {
      const created = await fiscalYearService.createYear(form);
      toast.success("Fiscal year created with 12 monthly periods");
      setIsFormOpen(false);
      setForm(defaultForm);
      await loadYears();
      setSelectedYearId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create fiscal year");
    }
  };

  const handleYearAction = async (id: string, action: "close" | "reopen") => {
    try {
      if (action === "close") await fiscalYearService.closeYear(id);
      else await fiscalYearService.reopenYear(id);
      toast.success(`Fiscal year ${action === "close" ? "closed" : "reopened"}`);
      loadYears();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} fiscal year`);
    }
  };

  const handlePeriodAction = async (id: string, action: "close" | "lock" | "reopen") => {
    try {
      if (action === "close") await fiscalYearService.closePeriod(id);
      else if (action === "lock") await fiscalYearService.lockPeriod(id);
      else await fiscalYearService.reopenPeriod(id);
      toast.success(`Period ${action === "close" ? "closed" : action === "lock" ? "locked" : "reopened"}`);
      const data = await fiscalYearService.getPeriods(selectedYearId);
      setPeriods(data);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} period`);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fiscal Years & Periods</h1>
          <p className="text-gray-600 mt-1">
            Close or lock a period to stop new postings from landing in it. Posting to an unconfigured
            date is still allowed by default.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={loadYears} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Fiscal Year
          </Button>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">Fiscal Years</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow
                    key={y.id}
                    className={cn("cursor-pointer", y.id === selectedYearId && "bg-primary/5")}
                    onClick={() => setSelectedYearId(y.id)}
                  >
                    <TableCell className="font-medium">{y.name}</TableCell>
                    <TableCell>{y.startDate}</TableCell>
                    <TableCell>{y.endDate}</TableCell>
                    <TableCell><Badge variant="secondary" className={yearStatusColors[y.status] ?? "bg-gray-100 text-gray-800"}>{y.status}</Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {y.status === "OPEN" ? (
                        <Button variant="outline" size="sm" onClick={() => handleYearAction(y.id, "close")}>Close Year</Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleYearAction(y.id, "reopen")}>Reopen</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!loading && years.length === 0 && (
            <div className="text-center py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-5">
                <CalendarClock className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fiscal years configured</h3>
              <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 mt-4"><Plus className="h-4 w-4 mr-2" />New Fiscal Year</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Periods</CardTitle>
          <Select value={selectedYearId} onValueChange={setSelectedYearId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.startDate}</TableCell>
                    <TableCell>{p.endDate}</TableCell>
                    <TableCell><Badge variant="secondary" className={periodStatusColors[p.status] ?? "bg-gray-100 text-gray-800"}>{p.status}</Badge></TableCell>
                    <TableCell className="space-x-2">
                      {p.status === "OPEN" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handlePeriodAction(p.id, "close")}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Close
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handlePeriodAction(p.id, "lock")}>
                            <Lock className="h-3.5 w-3.5 mr-1" />Lock
                          </Button>
                        </>
                      )}
                      {(p.status === "CLOSED" || p.status === "LOCKED") && (
                        <Button variant="outline" size="sm" onClick={() => handlePeriodAction(p.id, "reopen")}>
                          <Unlock className="h-3.5 w-3.5 mr-1" />Reopen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {periods.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">Select a fiscal year above to see its periods.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setForm(defaultForm); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Fiscal Year</DialogTitle>
            <DialogDescription>Creates the year and its 12 monthly periods (all OPEN) in one step.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. FY2027" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateYear} className="bg-primary hover:bg-primary/90">Create Fiscal Year</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
