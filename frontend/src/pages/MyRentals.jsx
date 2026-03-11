import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function money(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function RentalStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();

  const map = {
    open:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25",
    active:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25",
    pending:
      "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700",
    closed:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25",
    completed:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25",
    cancelled:
      "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/25"
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
    rose:
      "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200",
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

export default function MyRentals() {
  const [error, setError] = useState("");
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  async function load() {
    const res = await api.get("/rentals/my");
    setRentals(res.data || []);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoice(r) {
    setError("");
    setDownloadingId(r._id);
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
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  const summary = useMemo(() => {
    const total = rentals.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
    const closed = rentals.filter((r) => String(r.status).toLowerCase() === "closed").length;
    const open = rentals.filter((r) => String(r.status).toLowerCase() === "open").length;
    return { total, closed, open, count: rentals.length };
  }, [rentals]);

  const headerRight = (
    <Button variant="outline" onClick={refresh} disabled={loading}>
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader title="My rentals" description="Track your rentals and download invoices once closed." right={headerRight} />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="rentals" value={summary.count} tone="indigo" />
          <MetricPill label="open" value={summary.open} tone="blue" />
          <MetricPill label="closed" value={summary.closed} tone="emerald" />
          <MetricPill label="total billed" value={money(summary.total)} tone="amber" />
        </div>
      </div>

      <Separator />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Rental history</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {loading ? "Loading..." : `${rentals.length} rental(s)`}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                        Loading rentals…
                      </TableCell>
                    </TableRow>
                  ) : rentals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <EmptyState
                          title="No rentals yet"
                          subtitle="Once you rent a machine, your history will appear here."
                          action={
                            <Button variant="outline" onClick={refresh}>
                              Refresh
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rentals.map((r) => (
                      <TableRow
                        key={r._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell>
                          <RentalStatusBadge status={r.status} />
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

                        <TableCell className="text-right">{money(r.totalAmount ?? "-")}</TableCell>

                        <TableCell className="text-right">
                          {String(r.status).toLowerCase() === "closed" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadInvoice(r)}
                              disabled={downloadingId === r._id}
                            >
                              {downloadingId === r._id ? "Downloading..." : "Invoice PDF"}
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              If you see “No Customer profile linked…”, ask admin/staff to link your login to your Customer record.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}