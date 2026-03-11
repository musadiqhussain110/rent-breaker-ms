import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function StatTile({ title, value, hint, tone = "default" }) {
  const tones = {
    default:
      "border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/45",
    indigo:
      "border-indigo-200/70 bg-indigo-50/60 dark:border-indigo-500/25 dark:bg-indigo-500/10",
    emerald:
      "border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    amber:
      "border-amber-200/70 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/10",
    rose:
      "border-rose-200/70 bg-rose-50/60 dark:border-rose-500/25 dark:bg-rose-500/10",
    blue:
      "border-blue-200/70 bg-blue-50/60 dark:border-blue-500/25 dark:bg-blue-500/10"
  };

  return (
    <div
      className={`rounded-[22px] border p-5 shadow-[0_18px_60px_rgba(2,6,23,0.06)] backdrop-blur ${tones[tone] || tones.default}`}
    >
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  );
}

export default function Reports() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState(null);

  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(todayYmd);
  const [to, setTo] = useState(todayYmd);

  const [revenue, setRevenue] = useState(null);
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [util, setUtil] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [customerHistory, setCustomerHistory] = useState(null);

  async function loadSummary() {
    const res = await api.get("/reports/summary");
    setSummary(res.data);
  }

  async function loadAdvanced() {
    const params = { from, to };

    const [revRes, dailyRes, monthlyRes, utilRes] = await Promise.all([
      api.get("/reports/revenue", { params }),
      api.get("/reports/daily", { params }),
      api.get("/reports/monthly", { params }),
      api.get("/reports/utilization", { params })
    ]);

    setRevenue(revRes.data);
    setDaily(dailyRes.data);
    setMonthly(monthlyRes.data);
    setUtil(utilRes.data);
  }

  async function refreshAll() {
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadAdvanced()]);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const machinesByStatus = summary?.machinesByStatus || {};
  const available = machinesByStatus.available || 0;
  const reserved = machinesByStatus.reserved || 0;
  const rented = machinesByStatus.rented || 0;
  const maintenance = machinesByStatus.maintenance || 0;

  const openRentals = summary?.rentals?.open ?? 0;
  const closedRentals = summary?.rentals?.closed ?? 0;
  const totalRevenueAll = summary?.revenue ?? 0;

  async function loadCustomerHistory() {
    setError("");
    setCustomerHistory(null);
    try {
      if (!customerId.trim()) throw new Error("Enter a customerId");
      const res = await api.get(`/reports/customer/${customerId.trim()}/history`);
      setCustomerHistory(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }

  const headerRight = (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-white/60 dark:bg-slate-900/60"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-white/60 dark:bg-slate-900/60"
          />
        </div>
      </div>

      <Button onClick={refreshAll} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </Button>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader
          title="Reports"
          description="Revenue, utilization, and trends for your rental business."
          right={headerRight}
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="available" value={available} tone="emerald" />
          <MetricPill label="reserved" value={reserved} tone="indigo" />
          <MetricPill label="rented" value={rented} tone="blue" />
          <MetricPill label="maintenance" value={maintenance} tone="rose" />
          <MetricPill label="open rentals" value={openRentals} tone="default" />
          <MetricPill label="closed rentals" value={closedRentals} tone="default" />
          <MetricPill label="all-time revenue" value={money(totalRevenueAll)} tone="amber" />
        </div>
      </div>

      <Separator />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Overview tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile title="Machines Available" value={available} hint="Ready to rent" tone="emerald" />
        <StatTile title="Machines Reserved" value={reserved} hint="Requested (pending)" tone="indigo" />
        <StatTile title="Machines Rented" value={rented} hint="Currently out" tone="blue" />
        <StatTile title="Machines in Maintenance" value={maintenance} hint="Not rentable" tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile title="Open Rentals" value={openRentals} hint="Active rentals" tone="default" />
        <StatTile title="Closed Rentals" value={closedRentals} hint="Returned rentals" tone="default" />
        <StatTile title="Revenue (All Closed Rentals)" value={money(totalRevenueAll)} hint="Sum totalAmount" tone="amber" />
      </div>

      {/* Revenue range card */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4">
              <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Revenue (Range)</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {from} → {to}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile title="Revenue" value={money(revenue?.revenue)} hint={`${revenue?.from || "-"} to ${revenue?.to || "-"}`} tone="amber" />
              <StatTile title="Closed Rentals" value={revenue?.rentalsClosed ?? 0} hint="In selected range" tone="default" />
              <StatTile title="Avg Rental" value={money(revenue?.avgRental)} hint="In selected range" tone="indigo" />
              <StatTile title="Date Range" value={`${from} → ${to}`} hint="" tone="default" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily + Monthly */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />
          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4">
                <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Daily report</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Closed rentals by return day</div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-right">Rentals</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(daily?.days || []).map((d) => (
                      <TableRow key={d.day} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <TableCell className="font-mono text-xs">{d.day}</TableCell>
                        <TableCell className="text-right">{d.rentals}</TableCell>
                        <TableCell className="text-right">{money(d.revenue)}</TableCell>
                      </TableRow>
                    ))}

                    {(daily?.days || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8">
                          <EmptyState title="No daily data" subtitle="No closed rentals in this range." />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />
          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4">
                <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Monthly report</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Closed rentals by return month</div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Rentals</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(monthly?.months || []).map((m) => (
                      <TableRow key={m.month} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <TableCell className="font-mono text-xs">{m.month}</TableCell>
                        <TableCell className="text-right">{m.rentals}</TableCell>
                        <TableCell className="text-right">{money(m.revenue)}</TableCell>
                      </TableRow>
                    ))}

                    {(monthly?.months || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8">
                          <EmptyState title="No monthly data" subtitle="No closed rentals in this range." />
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

      {/* Utilization */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4">
              <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Machine utilization</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                By closed rentals in selected range
              </div>
            </div>

            <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead className="text-right">Rentals</TableHead>
                    <TableHead className="text-right">Rental Days</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(util?.machines || []).map((x) => (
                    <TableRow
                      key={x.machine?._id || `${x.machine?.name}-${x.machine?.serialNumber}`}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      <TableCell className="font-medium text-slate-950 dark:text-slate-100">
                        {x.machine?.name || "-"}{" "}
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          {x.machine?.type ? `(${x.machine.type})` : ""}{" "}
                          {x.machine?.serialNumber ? `• ${x.machine.serialNumber}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{x.rentals}</TableCell>
                      <TableCell className="text-right">{x.rentalDays}</TableCell>
                      <TableCell className="text-right">{money(x.revenue)}</TableCell>
                    </TableRow>
                  ))}

                  {(util?.machines || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8">
                        <EmptyState title="No utilization data" subtitle="No closed rentals in this range." />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer history (report view) */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4">
              <div className="text-base font-semibold text-slate-950 dark:text-slate-50">
                Customer rental history (report view)
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Paste a customerId to view their rentals (server report).
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Paste customerId here"
                className="sm:w-[380px] bg-white/60 dark:bg-slate-900/60"
              />
              <Button onClick={loadCustomerHistory}>Load history</Button>
            </div>

            {customerHistory ? (
              <>
                <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-medium">Customer:</span> {customerHistory.customer?.name}{" "}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {customerHistory.customer?.phone ? `• ${customerHistory.customer.phone}` : ""}{" "}
                    {customerHistory.customer?.email ? `• ${customerHistory.customer.email}` : ""}
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(customerHistory.rentals || []).map((r) => (
                        <TableRow key={r._id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                          <TableCell className="text-sm">{r.status}</TableCell>
                          <TableCell className="font-medium text-slate-950 dark:text-slate-100">{r.machine?.name || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.startDate ? String(r.startDate).slice(0, 10) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.endDate ? String(r.endDate).slice(0, 10) : "-"}
                          </TableCell>
                          <TableCell className="text-right">{money(r.totals?.totalAmount ?? r.totalAmount)}</TableCell>
                          <TableCell className="text-right">{money(r.totals?.totalPaid)}</TableCell>
                          <TableCell className="text-right">{money(r.totals?.balance)}</TableCell>
                        </TableRow>
                      ))}

                      {(customerHistory.rentals || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8">
                            <EmptyState title="No rentals" subtitle="No rentals for this customer." />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Tip: open Customers page and copy the customer’s MongoDB ID, then paste it here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}