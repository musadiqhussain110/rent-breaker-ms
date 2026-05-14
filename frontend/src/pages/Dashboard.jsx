import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

import { EmptyState } from "@/components/rb/EmptyState";
import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function MetricPill({ label, value, tone = "default" }) {
  const tones = {
    default: "border-border bg-muted text-muted-foreground",
    indigo: "border-primary/25 bg-primary/10 text-primary",
    emerald: "border-accent/25 bg-accent/10 text-accent",
    blue: "border-secondary/25 bg-secondary/10 text-secondary",
    amber: "border-secondary/25 bg-secondary/10 text-secondary",
    rose: "border-border bg-muted text-muted-foreground"
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs shadow-sm backdrop-blur ${tones[tone] || tones.default}`}>
      <span className="font-medium">{value}</span> <span className="opacity-80">{label}</span>
    </div>
  );
}

function QuickAction({ to, label, hint, tone = "default" }) {
  const tones = {
    default: "border-border/80 bg-card hover:bg-muted",
    indigo: "border-primary/20 bg-primary/5 hover:bg-primary/10",
    emerald: "border-accent/25 bg-accent/5 hover:bg-accent/10",
    amber: "border-secondary/20 bg-secondary/5 hover:bg-secondary/10",
    rose: "border-border/80 bg-card hover:bg-muted",
    blue: "border-secondary/20 bg-secondary/5 hover:bg-secondary/10"
  };

  return (
      <Link
        to={to}
        className={cn(
          "group block rounded-xl border p-5 transition-colors",
          tones[tone] || tones.default
        )}
      >
      <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{label}</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</div>
      <div className="mt-4 text-xs font-medium text-slate-700 opacity-80 group-hover:opacity-100 dark:text-slate-200">
        Open →
      </div>
    </Link>
  );
}

export default function Dashboard({ user }) {
  const role = user?.role;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState(null);
  const [myRentals, setMyRentals] = useState(null);

  async function loadSummary() {
    // staff/admin only (most setups). We'll attempt and ignore if forbidden.
    const res = await api.get("/reports/summary");
    setSummary(res.data);
  }

  async function loadMyRentals() {
    const res = await api.get("/rentals/my");
    setMyRentals(res.data || []);
  }

  async function loadAll() {
    setError("");
    setLoading(true);
    try {
      const tasks = [];
      if (role === "admin" || role === "staff") tasks.push(loadSummary());
      if (role === "customer") tasks.push(loadMyRentals());
      await Promise.all(tasks);
    } catch (e) {
      // If user is not allowed for summary, show a friendly message (but don't break the page)
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const machinesByStatus = summary?.machinesByStatus || {};
  const available = machinesByStatus.available || 0;
  const reserved = machinesByStatus.reserved || 0;
  const rented = machinesByStatus.rented || 0;
  const maintenance = machinesByStatus.maintenance || 0;

  const openRentals = summary?.rentals?.open ?? 0;
  const closedRentals = summary?.rentals?.closed ?? 0;
  const allRevenue = summary?.revenue ?? 0;

  const mySummary = useMemo(() => {
    const list = Array.isArray(myRentals) ? myRentals : [];
    const count = list.length;
    const closedCount = list.filter((r) => String(r.status).toLowerCase() === "closed").length;
    const billed = list.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
    return { count, closedCount, billed };
  }, [myRentals]);

  const headerRight = (
    <Button variant="outline" onClick={loadAll} disabled={loading}>
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader
          title="Dashboard"
          description={
            role === "customer"
              ? "Welcome back — your rentals and requests at a glance."
              : "Your operations snapshot — machines, rentals, and revenue."
          }
          right={headerRight}
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="role" value={role || "unknown"} tone="indigo" />
          <MetricPill label="account" value={user?.name || "Account"} tone="default" />
          {role === "admin" || role === "staff" ? (
            <>
              <MetricPill label="available" value={available} tone="emerald" />
              <MetricPill label="reserved" value={reserved} tone="blue" />
              <MetricPill label="rented" value={rented} tone="amber" />
              <MetricPill label="maintenance" value={maintenance} tone="rose" />
              <MetricPill label="open rentals" value={openRentals} tone="default" />
              <MetricPill label="revenue" value={money(allRevenue)} tone="amber" />
            </>
          ) : null}

          {role === "customer" ? (
            <>
              <MetricPill label="my rentals" value={mySummary.count} tone="indigo" />
              <MetricPill label="invoices" value={mySummary.closedCount} tone="emerald" />
              <MetricPill label="billed" value={money(mySummary.billed)} tone="amber" />
            </>
          ) : null}
        </div>
      </div>

      <Separator />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <QuickAction to="/machines" label="Machines" hint="Inventory, status, rates, and maintenance dates." tone="indigo" />
        {role === "admin" || role === "staff" ? (
          <>
            <QuickAction to="/rentals" label="Rentals" hint="Create rentals, add payments, return rentals." tone="blue" />
            <QuickAction to="/customers" label="Customers" hint="Manage customers and view history." tone="emerald" />
          </>
        ) : null}

        {role === "operator" ? (
          <>
            <QuickAction to="/rentals" label="Rentals" hint="Return rentals and record payments." tone="blue" />
            <QuickAction to="/maintenance" label="Maintenance" hint="Open/complete maintenance items." tone="rose" />
          </>
        ) : null}

        {role === "customer" ? (
          <>
            <QuickAction to="/requests" label="Requests" hint="Request a machine or track request status." tone="blue" />
            <QuickAction to="/my-rentals" label="My rentals" hint="View your rentals and download invoices." tone="emerald" />
          </>
        ) : null}

        <QuickAction to="/reports" label="Reports" hint="Revenue, utilization, daily & monthly trends." tone="amber" />
      </div>

      {/* Admin/Staff: Summary block */}
      {!loading && (role === "admin" || role === "staff") ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="relative">
            <Card className="relative border-border/80 bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4">
                  <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Machines by status</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Live inventory breakdown.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                    <div className="text-xs text-accent">available</div>
                    <div className="mt-2 text-2xl font-semibold text-accent">{available}</div>
                  </div>
                  <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4">
                    <div className="text-xs text-secondary">reserved</div>
                    <div className="mt-2 text-2xl font-semibold text-secondary">{reserved}</div>
                  </div>
                  <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
                    <div className="text-xs text-primary">rented</div>
                    <div className="mt-2 text-2xl font-semibold text-primary">{rented}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <div className="text-xs text-muted-foreground">maintenance</div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">{maintenance}</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Tip: click Machines to update status or set next maintenance dates.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Card className="relative border-border/80 bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Rentals</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Open vs closed overview.</div>
                  </div>
                  <Link to="/rentals">
                    <Button size="sm" variant="outline">
                      Open rentals page
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400">open</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{openRentals}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400">closed</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{closedRentals}</div>
                  </div>
                  <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4">
                    <div className="text-xs text-secondary">revenue</div>
                    <div className="mt-2 text-2xl font-semibold text-secondary">
                      {money(allRevenue)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Note: “Revenue” is based on closed rentals totals.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Customer: show recent rentals */}
      {!loading && role === "customer" ? (
        <div className="relative">
          <Card className="relative border-border/80 bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4">
                <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Recent rentals</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Latest activity from your account.
                </div>
              </div>

              <div className="rb-table-shell">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(myRentals || []).slice(0, 7).map((r) => (
                      <TableRow key={r._id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                          {r.machine?.name || "-"}{" "}
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            {r.machine?.serialNumber ? `• ${r.machine.serialNumber}` : ""}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.startDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.endDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700">
                            {String(r.status || "unknown").toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{money(r.totalAmount)}</TableCell>
                      </TableRow>
                    ))}

                    {(myRentals || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8">
                          <EmptyState
                            title="No rentals yet"
                            subtitle="Request a machine first, then your rentals will show here."
                            action={
                              <Link to="/requests">
                                <Button>Make a request</Button>
                              </Link>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/my-rentals">
                  <Button variant="outline">View all rentals</Button>
                </Link>
                <Link to="/requests">
                  <Button>Requests</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
