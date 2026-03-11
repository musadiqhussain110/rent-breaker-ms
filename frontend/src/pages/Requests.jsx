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

function fmtDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function canCancelWithin2Hours(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  return Date.now() - created <= TWO_HOURS_MS;
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    pending:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25",
    approved:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25",
    rejected:
      "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/25",
    cancelled:
      "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700"
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
    amber:
      "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
    rose:
      "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
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

export default function Requests({ user }) {
  const role = user?.role;
  const isCustomer = role === "customer";
  const isStaff = role === "staff" || role === "admin";

  const [error, setError] = useState("");

  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);

  const [statusFilter, setStatusFilter] = useState("pending"); // pending/approved/rejected/cancelled/all
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);

  const [openCreate, setOpenCreate] = useState(false);

  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    machineId: "",
    startDate: new Date().toISOString().slice(0, 10),
    days: "",
    notes: ""
  });

  const availableMachines = useMemo(
    () => machines.filter((m) => (m.status || "").toLowerCase() === "available"),
    [machines]
  );

  async function loadMachines() {
    const res = await api.get("/machines");
    setMachines(res.data || []);
  }

  async function loadRequests(filter) {
    const f = filter ?? statusFilter;
    const params = {};
    if (f && f !== "all") params.status = f;

    const res = await api.get("/requests", { params });
    setItems(res.data || []);
  }

  async function loadAll() {
    await Promise.all([loadMachines(), loadRequests()]);
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e?.response?.data?.message || e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFilterChange(v) {
    setStatusFilter(v);
    setError("");
    try {
      await loadRequests(v);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  async function refresh() {
    setError("");
    try {
      await Promise.all([loadRequests(), loadMachines()]);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }

  async function createRequest(e) {
    e.preventDefault();
    if (!isCustomer) return;

    setError("");
    setSaving(true);
    try {
      if (!form.machineId) throw new Error("Please select a machine");
      if (!form.startDate) throw new Error("Please select start date");

      const payload = {
        machineId: form.machineId,
        startDate: form.startDate,
        days: form.days ? Number(form.days) : undefined,
        notes: form.notes.trim() || undefined
      };

      await api.post("/requests", payload);

      setForm((f) => ({
        ...f,
        machineId: "",
        days: "",
        notes: ""
      }));

      setOpenCreate(false);
      await Promise.all([loadRequests(), loadMachines()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function approve(reqItem) {
    if (!isStaff) return;

    const ok = window.confirm(
      `Approve request?\nCustomer: ${reqItem?.customerUser?.email}\nMachine: ${reqItem?.machine?.name}`
    );
    if (!ok) return;

    setError("");
    setActingId(reqItem._id);
    try {
      await api.post(`/requests/${reqItem._id}/approve`, {});
      await Promise.all([loadRequests(), loadMachines()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setActingId(null);
    }
  }

  async function reject(reqItem) {
    if (!isStaff) return;

    const ok = window.confirm(
      `Reject request?\nCustomer: ${reqItem?.customerUser?.email}\nMachine: ${reqItem?.machine?.name}`
    );
    if (!ok) return;

    setError("");
    setActingId(reqItem._id);
    try {
      await api.post(`/requests/${reqItem._id}/reject`, {});
      await Promise.all([loadRequests(), loadMachines()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setActingId(null);
    }
  }

  async function cancel(reqItem) {
    if (!isCustomer) return;

    const ok = window.confirm("Cancel this request? (only allowed within 2 hours)");
    if (!ok) return;

    setError("");
    setActingId(reqItem._id);
    try {
      await api.post(`/requests/${reqItem._id}/cancel`, {});
      await Promise.all([loadRequests(), loadMachines()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setActingId(null);
    }
  }

  const showActionsCol = isStaff || isCustomer;

  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      const hay = [r.status, r.machine?.name, r.machine?.type, r.machine?.serialNumber, r.customerUser?.email, r.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const counts = useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0, cancelled: 0, all: items.length };
    for (const it of items) {
      const s = String(it.status || "").toLowerCase();
      if (out[s] !== undefined) out[s] += 1;
    }
    return out;
  }, [items]);

  const headerRight = (
    <>
      <div className="w-full sm:w-[340px]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (machine, email, serial...)"
          className="bg-white/60 dark:bg-slate-900/60"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:inline">Filter</span>
        <Select value={statusFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[190px] bg-white/60 dark:bg-slate-900/60">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">pending ({counts.pending})</SelectItem>
            <SelectItem value="approved">approved ({counts.approved})</SelectItem>
            <SelectItem value="rejected">rejected ({counts.rejected})</SelectItem>
            <SelectItem value="cancelled">cancelled ({counts.cancelled})</SelectItem>
            <SelectItem value="all">all ({counts.all})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" onClick={refresh}>
        Refresh
      </Button>

      {isCustomer ? (
        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) {
              setForm((f) => ({
                ...f,
                machineId: "",
                days: "",
                notes: ""
              }));
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>Request a machine</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle>Request a machine</DialogTitle>
              <DialogDesc>
                Once requested, the machine is reserved until staff approves/rejects (or you cancel within 2 hours).
              </DialogDesc>
            </DialogHeader>

            <form onSubmit={createRequest} className="space-y-4">
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
                  <Label>Days (optional)</Label>
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

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={3}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
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
                  {saving ? "Submitting..." : "Submit request"}
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
          title="Rental requests"
          description="Customers can request machines. Staff can approve/reject. Customers can cancel within 2 hours."
          right={headerRight}
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="pending" value={counts.pending} tone="amber" />
          <MetricPill label="approved" value={counts.approved} tone="emerald" />
          <MetricPill label="rejected" value={counts.rejected} tone="rose" />
          <MetricPill label="cancelled" value={counts.cancelled} tone="default" />
          <MetricPill label="total" value={counts.all} tone="indigo" />
        </div>
      </div>

      <Separator />

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
                    <TableHead>Machine</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Rental</TableHead>
                    {showActionsCol ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredItems.map((r) => {
                    const customerCanCancel =
                      isCustomer && r.status === "pending" && canCancelWithin2Hours(r.createdAt);

                    return (
                      <TableRow
                        key={r._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>

                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                          {r.machine?.name || "-"}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {r.machine?.type || ""} {r.machine?.serialNumber ? `• ${r.machine.serialNumber}` : ""}{" "}
                            {r.machine?.status ? `• status=${r.machine.status}` : ""}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                          {r.customerUser?.email || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.startDate)}</TableCell>
                        <TableCell>{r.days || "-"}</TableCell>
                        <TableCell className="max-w-[360px] truncate">{r.notes || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.decidedAt ? fmtDateTime(r.decidedAt) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.rental ? (typeof r.rental === "string" ? r.rental : r.rental._id) : "-"}
                        </TableCell>

                        {showActionsCol ? (
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              {isStaff && r.status === "pending" ? (
                                <>
                                  <Button size="sm" onClick={() => approve(r)} disabled={actingId === r._id}>
                                    {actingId === r._id ? "..." : "Approve"}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => reject(r)}
                                    disabled={actingId === r._id}
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : null}

                              {customerCanCancel ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancel(r)}
                                  disabled={actingId === r._id}
                                >
                                  {actingId === r._id ? "..." : "Cancel"}
                                </Button>
                              ) : null}

                              {!isStaff && !customerCanCancel ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}

                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showActionsCol ? 9 : 8} className="py-8">
                        <EmptyState
                          title="No requests found"
                          subtitle={q.trim() ? "Try a different search term or clear the filter." : "No requests yet."}
                          action={
                            isCustomer ? (
                              <Button onClick={() => setOpenCreate(true)}>Request a machine</Button>
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

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Tip: Customers can cancel only within 2 hours of creating a pending request.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}