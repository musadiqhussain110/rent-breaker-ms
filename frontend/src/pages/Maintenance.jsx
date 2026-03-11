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

function toYMD(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function daysUntil(dateStrOrDate) {
  if (!dateStrOrDate) return null;
  const d = new Date(dateStrOrDate);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const ms = startTarget.getTime() - startToday.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function ScheduleTagBadge({ tag, dueIn }) {
  const t = String(tag || "scheduled");

  if (t === "overdue") {
    return (
      <Badge
        variant="outline"
        className="bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/25"
      >
        overdue {dueIn !== null ? `(${dueIn})` : ""}
      </Badge>
    );
  }
  if (t === "dueSoon") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25"
      >
        due soon {dueIn !== null ? `(${dueIn})` : ""}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700"
    >
      scheduled {dueIn !== null ? `(${dueIn})` : ""}
    </Badge>
  );
}

function MaintStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    open:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25",
    done:
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
    amber:
      "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
    rose:
      "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200",
    blue:
      "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200"
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

export default function Maintenance() {
  const [error, setError] = useState("");

  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);

  const [statusFilter, setStatusFilter] = useState("open"); // open | done | all
  const [q, setQ] = useState("");

  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const [showOnlyScheduled, setShowOnlyScheduled] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);

  const [form, setForm] = useState({
    machineId: "",
    title: "",
    description: "",
    cost: "",
    startDate: new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  });

  const eligibleMachines = useMemo(() => {
    // backend blocks rented
    return machines.filter((m) => (m.status || "").toLowerCase() !== "rented");
  }, [machines]);

  const scheduledMachines = useMemo(() => {
    const list = machines
      .filter((m) => !!m.nextMaintenanceDate)
      .map((m) => {
        const dueIn = daysUntil(m.nextMaintenanceDate);
        let tag = "scheduled";
        if (dueIn !== null && dueIn < 0) tag = "overdue";
        else if (dueIn !== null && dueIn <= 7) tag = "dueSoon";
        return { ...m, dueIn, tag };
      })
      .sort((a, b) => {
        const rank = (t) => (t === "overdue" ? 0 : t === "dueSoon" ? 1 : 2);
        const ra = rank(a.tag);
        const rb = rank(b.tag);
        if (ra !== rb) return ra - rb;

        const da = new Date(a.nextMaintenanceDate).getTime();
        const db = new Date(b.nextMaintenanceDate).getTime();
        return da - db;
      });

    if (showOnlyScheduled) return list;

    return machines
      .map((m) => {
        const dueIn = daysUntil(m.nextMaintenanceDate);
        let tag = "scheduled";
        if (!m.nextMaintenanceDate) tag = "none";
        else if (dueIn !== null && dueIn < 0) tag = "overdue";
        else if (dueIn !== null && dueIn <= 7) tag = "dueSoon";
        return { ...m, dueIn, tag };
      })
      .sort((a, b) => {
        const rank = (t) => (t === "overdue" ? 0 : t === "dueSoon" ? 1 : t === "scheduled" ? 2 : 3);
        const ra = rank(a.tag);
        const rb = rank(b.tag);
        if (ra !== rb) return ra - rb;
        const da = new Date(a.nextMaintenanceDate || 0).getTime();
        const db = new Date(b.nextMaintenanceDate || 0).getTime();
        return da - db;
      });
  }, [machines, showOnlyScheduled]);

  async function loadMachines() {
    const res = await api.get("/machines");
    setMachines(res.data || []);
  }

  async function loadItems(filter) {
    const f = filter ?? statusFilter;
    const params = {};
    if (f === "open" || f === "done") params.status = f;

    const res = await api.get("/maintenance", { params });
    setItems(res.data || []);
  }

  async function loadAll() {
    await Promise.all([loadMachines(), loadItems()]);
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e?.response?.data?.message || e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFilterChange(v) {
    setStatusFilter(v);
    setError("");
    try {
      await loadItems(v);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  async function refresh() {
    setError("");
    try {
      await Promise.all([loadMachines(), loadItems()]);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }

  async function createMaintenance(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (!form.machineId) throw new Error("Please select a machine");
      if (!form.title.trim()) throw new Error("Title is required");

      const payload = {
        machineId: form.machineId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        cost: form.cost === "" ? undefined : Number(form.cost),
        startDate: form.startDate || undefined
      };

      await api.post("/maintenance", payload);

      await Promise.all([loadMachines(), loadItems()]);

      setForm((f) => ({
        ...f,
        machineId: "",
        title: "",
        description: "",
        cost: ""
      }));

      setOpenCreate(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function completeMaintenance(m) {
    const ok = window.confirm(`Mark maintenance as done?\nMachine: ${m?.machine?.name}\nTitle: ${m?.title}`);
    if (!ok) return;

    setError("");
    setCompletingId(m._id);

    try {
      await api.post(`/maintenance/${m._id}/complete`, {});
      await Promise.all([loadMachines(), loadItems()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setCompletingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) => {
      const hay = [m.status, m.machine?.name, m.machine?.type, m.machine?.serialNumber, m.title, m.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const summary = useMemo(() => {
    let open = 0;
    let done = 0;
    for (const it of items) {
      const s = String(it.status || "").toLowerCase();
      if (s === "open") open += 1;
      else if (s === "done") done += 1;
    }

    const overdue = scheduledMachines.filter((m) => m.tag === "overdue").length;
    const dueSoon = scheduledMachines.filter((m) => m.tag === "dueSoon").length;

    return { open, done, total: items.length, overdue, dueSoon };
  }, [items, scheduledMachines]);

  const headerRight = (
    <>
      <Button variant="outline" onClick={refresh}>
        Refresh
      </Button>

      <Dialog
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v);
          if (!v) {
            setForm({
              machineId: "",
              title: "",
              description: "",
              cost: "",
              startDate: new Date().toISOString().slice(0, 10)
            });
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>Open maintenance</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Open maintenance</DialogTitle>
            <DialogDesc>Note: You cannot start maintenance if a machine is rented.</DialogDesc>
          </DialogHeader>

          <form onSubmit={createMaintenance} className="space-y-4">
            <div className="space-y-2">
              <Label>Machine</Label>
              <Select value={form.machineId} onValueChange={(v) => setForm((f) => ({ ...f, machineId: v }))}>
                <SelectTrigger className="bg-white/60 dark:bg-slate-900/60">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMachines.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} {m.type ? `(${m.type})` : ""} — status: {m.status}
                    </SelectItem>
                  ))}
                  {eligibleMachines.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">No eligible machines.</div>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder='e.g. "Oil change"'
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="optional"
                className="bg-white/60 dark:bg-slate-900/60"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="e.g. 1500"
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
                {saving ? "Saving..." : "Open"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader title="Maintenance" description="Track upcoming schedules and manage maintenance records." right={headerRight} />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="open" value={summary.open} tone="blue" />
          <MetricPill label="done" value={summary.done} tone="emerald" />
          <MetricPill label="overdue" value={summary.overdue} tone="rose" />
          <MetricPill label="due soon" value={summary.dueSoon} tone="amber" />
          <MetricPill label="total records" value={summary.total} tone="indigo" />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Upcoming maintenance schedule */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-950 dark:text-slate-50">
                    Upcoming maintenance schedule
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Machines with next maintenance date.
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => setShowOnlyScheduled((v) => !v)}>
                  {showOnlyScheduled ? "Show all machines" : "Show scheduled only"}
                </Button>
              </div>

              <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Next date</TableHead>
                      <TableHead className="text-right">Due in</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {scheduledMachines
                      .filter((m) => (showOnlyScheduled ? !!m.nextMaintenanceDate : true))
                      .map((m) => (
                        <TableRow
                          key={m._id}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                        >
                          <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                            {m.name}
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {m.type ? `(${m.type})` : ""} {m.serialNumber ? `• ${m.serialNumber}` : ""}
                            </div>
                          </TableCell>
                          <TableCell>{m.location || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {m.nextMaintenanceDate ? toYMD(m.nextMaintenanceDate) : "-"}
                          </TableCell>
                          <TableCell className="text-right">{m.dueIn === null ? "-" : m.dueIn}</TableCell>
                          <TableCell>
                            {m.tag === "none" ? (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700"
                              >
                                no date
                              </Badge>
                            ) : (
                              <ScheduleTagBadge tag={m.tag} dueIn={m.dueIn} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                    {machines.filter((m) => !!m.nextMaintenanceDate).length === 0 && showOnlyScheduled ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8">
                          <EmptyState
                            title="No scheduled dates"
                            subtitle="Set nextMaintenanceDate in Machines page to populate the schedule."
                            action={
                              <Button variant="outline" onClick={refresh}>
                                Refresh
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance records */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Maintenance records</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {filteredItems.length} result(s) • {items.length} total
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search records..."
                    className="sm:w-[320px] bg-white/60 dark:bg-slate-900/60"
                  />

                  <div className="flex items-center gap-2">
                    <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:inline">Filter</span>
                    <Select value={statusFilter} onValueChange={onFilterChange}>
                      <SelectTrigger className="w-[170px] bg-white/60 dark:bg-slate-900/60">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">open</SelectItem>
                        <SelectItem value="done">done</SelectItem>
                        <SelectItem value="all">all</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

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
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredItems.map((m) => (
                      <TableRow
                        key={m._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell>
                          <MaintStatusBadge status={m.status} />
                        </TableCell>

                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                          {m.machine?.name || "-"}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {m.machine?.type || ""} {m.machine?.serialNumber ? `• ${m.machine.serialNumber}` : ""}{" "}
                            {m.machine?.status ? `• status=${m.machine.status}` : ""}
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[280px]">
                          <div className="font-medium text-slate-950 dark:text-slate-100">{m.title}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {m.description || "-"}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">{m.cost ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(m.startDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(m.endDate)}</TableCell>

                        <TableCell className="text-right">
                          {String(m.status).toLowerCase() === "open" ? (
                            <Button size="sm" onClick={() => completeMaintenance(m)} disabled={completingId === m._id}>
                              {completingId === m._id ? "Completing..." : "Complete"}
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8">
                          <EmptyState
                            title="No maintenance records"
                            subtitle={q.trim() ? "Try a different search term or clear the filter." : "Open a maintenance record to start tracking work."}
                            action={<Button onClick={() => setOpenCreate(true)}>Open maintenance</Button>}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}