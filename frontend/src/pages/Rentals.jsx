import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function money(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RentalStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    open:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25",
    closed:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25"
  };
  return (
    <Badge
      variant="outline"
      className={
        map[s] ||
        "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700"
      }
    >
      {s || "unknown"}
    </Badge>
  );
}

function MetricPill({ label, value, tone = "default" }) {
  const tones = {
    default:
      "border-slate-200 bg-white/70 text-slate-700 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-200",
    indigo:
      "border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200",
    emerald:
      "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    blue:
      "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200",
    amber:
      "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs shadow-sm backdrop-blur ${tones[tone] || tones.default}`}>
      <span className="font-medium">{value}</span> <span className="opacity-80">{label}</span>
    </div>
  );
}

function EmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/70 p-10 text-center shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45">
      <div className="mx-auto mb-4 h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 shadow-sm" />
      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
      {subtitle ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default function Rentals({ user }) {
  const role = user?.role;
  const canCreate = role === "admin" || role === "staff"; // operator cannot create

  const [error, setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);

  const [rentals, setRentals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("open"); // open | closed | all

  const [saving, setSaving] = useState(false);
  const [returningId, setReturningId] = useState(null);

  // payment dialog state (per rental)
  const [payOpen, setPayOpen] = useState(false);
  const [payRental, setPayRental] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "cash", note: "" });

  const [openCreate, setOpenCreate] = useState(false);

  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    customerId: "",
    machineId: "",
    startDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    days: "",
    advancePaid: "",
    notes: ""
  });

  const availableMachines = useMemo(
    () => machines.filter((m) => (m.status || "").toLowerCase() === "available"),
    [machines]
  );

  async function loadCustomers() {
    const res = await api.get("/customers");
    setCustomers(res.data || []);
  }

  async function loadMachines() {
    const res = await api.get("/machines");
    setMachines(res.data || []);
  }

  async function loadRentals(filter) {
    const f = filter ?? statusFilter;
    const params = {};
    if (f === "open" || f === "closed") params.status = f;

    const res = await api.get("/rentals", { params });
    setRentals(res.data || []);
  }

  async function loadAll() {
    // customers endpoint is staff/admin only; operator should not call it.
    if (canCreate) {
      await Promise.all([loadCustomers(), loadMachines(), loadRentals()]);
    } else {
      await Promise.all([loadMachines(), loadRentals()]);
    }
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e?.response?.data?.message || e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFilterChange(v) {
    setStatusFilter(v);
    setError("");
    try {
      await loadRentals(v);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  async function refresh() {
    setError("");
    try {
      await Promise.all([loadRentals(), loadMachines()]);
      if (canCreate) await loadCustomers();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }

  async function createRental(e) {
    e.preventDefault();
    if (!canCreate) return;

    setError("");
    setSaving(true);

    try {
      if (!form.customerId) throw new Error("Please select a customer");
      if (!form.machineId) throw new Error("Please select a machine");
      if (!form.startDate) throw new Error("Please select a start date");

      const payload = {
        customerId: form.customerId,
        machineId: form.machineId,
        startDate: form.startDate,
        days: form.days ? Number(form.days) : undefined,
        advancePaid: form.advancePaid === "" ? undefined : Number(form.advancePaid),
        notes: form.notes.trim() || undefined
      };

      await api.post("/rentals", payload);

      await Promise.all([loadRentals(), loadMachines()]);

      setForm((f) => ({
        ...f,
        machineId: "",
        days: "",
        advancePaid: "",
        notes: ""
      }));

      setOpenCreate(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function returnRental(r) {
    const ok = window.confirm(`Return rental?\nCustomer: ${r?.customer?.name}\nMachine: ${r?.machine?.name}`);
    if (!ok) return;

    setError("");
    setReturningId(r._id);
    try {
      await api.post(`/rentals/${r._id}/return`, {});
      await Promise.all([loadRentals(), loadMachines()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setReturningId(null);
    }
  }

  function openPay(r) {
    setPayRental(r);
    setPaymentForm({ amount: "", method: "cash", note: "" });
    setPayOpen(true);
  }

  async function addPayment() {
    const r = payRental;
    if (!r?._id) return;

    const amt = Number(paymentForm.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Payment amount must be > 0");
      return;
    }

    setError("");
    setPayingId(r._id);
    try {
      await api.post(`/rentals/${r._id}/pay`, {
        amount: amt,
        method: paymentForm.method,
        note: paymentForm.note.trim() || undefined
      });

      setPayOpen(false);
      setPayRental(null);
      setPaymentForm({ amount: "", method: "cash", note: "" });

      await loadRentals();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setPayingId(null);
    }
  }

  async function downloadInvoice(r) {
    setError("");
    try {
      const res = await api.get(`/rentals/${r._id}/invoice.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${r._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  const filteredRentals = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rentals;

    return rentals.filter((r) => {
      const totals = r.totals || {};
      const hay = [
        r.status,
        r.customer?.name,
        r.customer?.phone,
        r.machine?.name,
        r.machine?.type,
        r.machine?.serialNumber,
        String(totals.totalAmount ?? r.totalAmount ?? ""),
        String(totals.totalPaid ?? ""),
        String(totals.balance ?? "")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [rentals, q]);

  const summary = useMemo(() => {
    let open = 0;
    let closed = 0;
    let totalBalance = 0;

    for (const r of rentals) {
      const s = String(r.status || "").toLowerCase();
      if (s === "open") open += 1;
      else if (s === "closed") closed += 1;

      const totals = r.totals || {};
      const bal = Number(totals.balance ?? 0);
      if (!Number.isNaN(bal)) totalBalance += bal;
    }

    return { open, closed, total: rentals.length, totalBalance };
  }, [rentals]);

  const headerRight = (
    <>
      <div className="w-full sm:w-[340px]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (customer, machine, serial...)"
          className="bg-white/60 dark:bg-slate-900/60"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:inline">Filter</span>
        <Select value={statusFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[170px] bg-white/60 dark:bg-slate-900/60">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">open ({summary.open})</SelectItem>
            <SelectItem value="closed">closed ({summary.closed})</SelectItem>
            <SelectItem value="all">all ({summary.total})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" onClick={refresh}>
        Refresh
      </Button>

      {canCreate ? (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>Create rental</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>Create rental</DialogTitle>
              <DialogDesc>Select customer and an available machine.</DialogDesc>
            </DialogHeader>

            <form onSubmit={createRental} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
                    <SelectTrigger className="bg-white/60 dark:bg-slate-900/60">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Machine (available)</Label>
                  <Select value={form.machineId} onValueChange={(v) => setForm((f) => ({ ...f, machineId: v }))}>
                    <SelectTrigger className="bg-white/60 dark:bg-slate-900/60">
                      <SelectValue placeholder="Select machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMachines.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name} {m.type ? `(${m.type})` : ""} — rate: {m.dailyRate}
                        </SelectItem>
                      ))}
                      {availableMachines.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">No available machines.</div>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Planned days (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.days}
                    onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                    placeholder="e.g. 3"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Advance paid (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.advancePaid}
                    onChange={(e) => setForm((f) => ({ ...f, advancePaid: e.target.value }))}
                    placeholder="e.g. 5000"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader
          title="Rentals"
          description={
            canCreate
              ? "Create rentals, record payments, return rentals, and download invoices."
              : "Read-only: you can return rentals and record payments, but cannot create new rentals."
          }
          right={headerRight}
        />

        {/* Premium “chips” summary (matches Machines/Requests) */}
        <div className="flex flex-wrap gap-2">
          <MetricPill label="open" value={summary.open} tone="blue" />
          <MetricPill label="closed" value={summary.closed} tone="emerald" />
          <MetricPill label="total" value={summary.total} tone="indigo" />
          <MetricPill label="balance" value={money(summary.totalBalance)} tone="amber" />
        </div>
      </div>

      <Separator />

      {/* Premium container (glow + blur) */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRentals.map((r) => {
                    const totals = r.totals || {};
                    const canAct = String(r.status).toLowerCase() === "open";

                    return (
                      <TableRow
                        key={r._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell>
                          <RentalStatusBadge status={r.status} />
                        </TableCell>

                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                          {r.customer?.name || "-"}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.customer?.phone || ""}</div>
                        </TableCell>

                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                          {r.machine?.name || "-"}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {r.machine?.type ? `(${r.machine.type})` : ""}{" "}
                            {r.machine?.serialNumber ? `• ${r.machine.serialNumber}` : ""}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">{fmtDate(r.startDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.endDate)}</TableCell>

                        <TableCell className="text-right">{money(r.dailyRateSnapshot)}</TableCell>
                        <TableCell className="text-right">{money(totals.totalAmount ?? r.totalAmount)}</TableCell>
                        <TableCell className="text-right">{money(totals.totalPaid)}</TableCell>
                        <TableCell className="text-right">{money(totals.balance)}</TableCell>

                        <TableCell className="text-right">
                          {canAct ? (
                            <div className="inline-flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPay(r)}
                                disabled={payingId === r._id || returningId === r._id}
                              >
                                Add payment
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => returnRental(r)}
                                disabled={returningId === r._id || payingId === r._id}
                              >
                                {returningId === r._id ? "Returning..." : "Return"}
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => downloadInvoice(r)}>
                              Invoice PDF
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredRentals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8">
                        <EmptyState
                          title="No rentals found"
                          subtitle={q.trim() ? "Try a different search term or clear the filter." : "No rentals yet."}
                          action={
                            canCreate ? (
                              <Button onClick={() => setOpenCreate(true)}>Create rental</Button>
                            ) : (
                              <Button variant="outline" onClick={refresh}>
                                Refresh
                              </Button>
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {!canCreate ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Operator access: you can return rentals and record payments, but cannot create rentals.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Payment dialog */}
      <Dialog
        open={payOpen}
        onOpenChange={(v) => {
          setPayOpen(v);
          if (!v) {
            setPayRental(null);
            setPaymentForm({ amount: "", method: "cash", note: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDesc>
              Rental: <span className="font-mono text-xs">{payRental?._id}</span>
            </DialogDesc>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 1000"
                disabled={payingId === payRental?._id}
                className="bg-white/60 dark:bg-slate-900/60"
              />
            </div>

            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger disabled={payingId === payRental?._id} className="bg-white/60 dark:bg-slate-900/60">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">cash</SelectItem>
                  <SelectItem value="bank">bank</SelectItem>
                  <SelectItem value="card">card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={paymentForm.note}
                onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                rows={3}
                placeholder="Optional note"
                disabled={payingId === payRental?._id}
                className="bg-white/60 dark:bg-slate-900/60"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayOpen(false)}
              disabled={payingId === payRental?._id}
            >
              Cancel
            </Button>
            <Button onClick={addPayment} disabled={payingId === payRental?._id}>
              {payingId === payRental?._id ? "Saving..." : "Add payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}