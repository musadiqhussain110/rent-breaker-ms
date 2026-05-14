import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rb/EmptyState";
import { StatusBadge } from "@/components/rb/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
    default: "border-border bg-muted text-muted-foreground",
    indigo: "border-primary/25 bg-primary/10 text-primary",
    emerald: "border-accent/25 bg-accent/10 text-accent",
    amber: "border-secondary/25 bg-secondary/10 text-secondary",
    rose: "border-border bg-muted text-muted-foreground"
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs shadow-sm backdrop-blur ${tones[tone] || tones.default}`}>
      <span className="font-medium">{value}</span>{" "}
      <span className="opacity-80">{label}</span>
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
      const message = e?.response?.data?.message || e.message || "Failed to load machines";
      setErr(message);
      toast.error(message);
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
      toast.success("Machine added successfully.");
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
        <Card className="relative border-border/80 bg-card">
          <CardContent className="p-4 sm:p-5">
            {err ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            ) : null}

            <div className="rb-table-shell">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
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
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
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
