import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    default:
      "border-slate-200 bg-white/70 text-slate-700 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-200",
    indigo:
      "border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200",
    emerald:
      "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    blue:
      "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200",
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

function QuickAction({ to, label, hint, tone = "default" }) {
  const tones = {
    default:
      "border-slate-200/80 bg-white/70 hover:bg-white/90 dark:border-slate-800 dark:bg-slate-950/45 dark:hover:bg-slate-950/70",
    indigo:
      "border-indigo-200/70 bg-indigo-50/70 hover:bg-indigo-50 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15",
    emerald:
      "border-emerald-200/70 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
    amber:
      "border-amber-200/70 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
    rose:
      "border-rose-200/70 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-500/25 dark:bg-rose-500/10 dark:hover:bg-rose-500/15",
    blue:
      "border-blue-200/70 bg-blue-50/70 hover:bg-blue-50 dark:border-blue-500/25 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
  };

  return (
    <Link
      to={to}
      className={cn(
        "group block rounded-[22px] border p-5 shadow-[0_18px_60px_rgba(2,6,23,0.06)] backdrop-blur transition-colors",
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
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
      {role === "admin" || role === "staff" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />
            <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4">
                  <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Machines by status</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Live inventory breakdown.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[22px] border border-emerald-200/60 bg-emerald-50/70 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                    <div className="text-xs text-emerald-900/80 dark:text-emerald-200/80">available</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-950 dark:text-emerald-200">{available}</div>
                  </div>
                  <div className="rounded-[22px] border border-blue-200/60 bg-blue-50/70 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
                    <div className="text-xs text-blue-900/80 dark:text-blue-200/80">reserved</div>
                    <div className="mt-2 text-2xl font-semibold text-blue-950 dark:text-blue-200">{reserved}</div>
                  </div>
                  <div className="rounded-[22px] border border-amber-200/60 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
                    <div className="text-xs text-amber-900/80 dark:text-amber-200/80">rented</div>
                    <div className="mt-2 text-2xl font-semibold text-amber-950 dark:text-amber-200">{rented}</div>
                  </div>
                  <div className="rounded-[22px] border border-rose-200/60 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/10">
                    <div className="text-xs text-rose-900/80 dark:text-rose-200/80">maintenance</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-950 dark:text-rose-200">{maintenance}</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Tip: click Machines to update status or set next maintenance dates.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />
            <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
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
                  <div className="rounded-[22px] border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="text-xs text-slate-600 dark:text-slate-400">open</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{openRentals}</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="text-xs text-slate-600 dark:text-slate-400">closed</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{closedRentals}</div>
                  </div>
                  <div className="rounded-[22px] border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
                    <div className="text-xs text-amber-900/80 dark:text-amber-200/80">revenue</div>
                    <div className="mt-2 text-2xl font-semibold text-amber-950 dark:text-amber-200">
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
      {role === "customer" ? (
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4">
                <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Recent rentals</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Latest activity from your account.
                </div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
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