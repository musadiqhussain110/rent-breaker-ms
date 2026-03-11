import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();

  const map = {
    available:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25",
    rented:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25",
    maintenance:
      "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/25",
    reserved:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25"
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

const EMPTY_FORM = {
  name: "",
  type: "",
  capacity: "",
  location: "",
  serialNumber: "",
  dailyRate: "",
  nextMaintenanceDate: "",
  status: "available",
  notes: ""
};

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
      <span className="font-medium">{value}</span>{" "}
      <span className="opacity-80">{label}</span>
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

export default function Machines({ user }) {
  const role = user?.role;
  const canWrite = role === "admin" || role === "staff";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  // create form
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/machines");
      setRows(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load machines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((m) => {
      const hay = [m.name, m.type, m.capacity, m.location, m.serialNumber, m.status, m.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const counts = useMemo(() => {
    const base = { total: rows.length, available: 0, rented: 0, maintenance: 0, reserved: 0 };
    for (const m of rows) {
      const s = String(m?.status || "").toLowerCase();
      if (s in base) base[s] += 1;
    }
    return base;
  }, [rows]);

  async function createMachine() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        name: form.name,
        type: form.type,
        capacity: form.capacity || undefined,
        location: form.location || undefined,
        serialNumber: form.serialNumber || undefined,
        dailyRate: form.dailyRate === "" ? undefined : Number(form.dailyRate),
        nextMaintenanceDate: form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate) : null,
        status: form.status || "available",
        notes: form.notes || undefined
      };

      await api.post("/machines", payload);
      setOpenCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Create machine failed");
    } finally {
      setSaving(false);
    }
  }

  const headerRight = (
    <>
      <div className="w-full sm:w-[360px]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search machines (name, type, status, serial...)"
          className="bg-white/60 dark:bg-slate-900/60"
        />
      </div>

      <Button variant="outline" onClick={load} disabled={loading}>
        Refresh
      </Button>

      {canWrite ? (
        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setForm(EMPTY_FORM);
          }}
        >
          <DialogTrigger asChild>
            <Button>Add machine</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>Add machine</DialogTitle>
              <DialogDescription>Enter machine details. You can edit later.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Serial number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Daily rate *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.dailyRate}
                  onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Next maintenance date</Label>
                <Input
                  type="date"
                  value={form.nextMaintenanceDate}
                  onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-white/60 dark:bg-slate-900/60">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">available</SelectItem>
                    <SelectItem value="reserved">reserved</SelectItem>
                    <SelectItem value="rented">rented</SelectItem>
                    <SelectItem value="maintenance">maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>
            </div>

            {err ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {err}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button onClick={createMachine} disabled={saving || !form.name || !form.type || form.dailyRate === ""}>
                {saving ? "Saving..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* More “Login-level” header: title + chips */}
      <div className="space-y-3">
        <PageHeader
          title="Machines"
          description={
            canWrite
              ? "Inventory, availability, maintenance dates, and pricing — all in one place."
              : "Inventory and availability — read-only access."
          }
          right={headerRight}
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="total" value={counts.total} tone="indigo" />
          <MetricPill label="available" value={counts.available} tone="emerald" />
          <MetricPill label="reserved" value={counts.reserved} tone="default" />
          <MetricPill label="rented" value={counts.rented} tone="amber" />
          <MetricPill label="maintenance" value={counts.maintenance} tone="rose" />
        </div>
      </div>

      <Separator />

      {/* Premium container card (glow + blur) */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            {err ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {err}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead>Next Maint.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-600 dark:text-slate-300">
                        Loading machines…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8">
                        <EmptyState
                          title="No machines found"
                          subtitle={
                            q.trim()
                              ? "Try a different search term or clear the filter."
                              : "Start by adding your first machine to the inventory."
                          }
                          action={
                            canWrite ? (
                              <Button onClick={() => setOpenCreate(true)}>Add machine</Button>
                            ) : (
                              <Button variant="outline" onClick={load}>
                                Refresh
                              </Button>
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((m) => (
                      <TableRow
                        key={m._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">{m.name}</TableCell>
                        <TableCell>{m.type || "-"}</TableCell>
                        <TableCell>{m.capacity || "-"}</TableCell>
                        <TableCell>{m.location || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{m.serialNumber || "-"}</TableCell>
                        <TableCell className="text-right">{m.dailyRate ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(m.nextMaintenanceDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!canWrite ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You have read-only access to Machines.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}