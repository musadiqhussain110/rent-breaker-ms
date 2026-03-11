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

const initialForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  customerUser: ""
};

function isObjectId(v) {
  return /^[a-f\d]{24}$/i.test(String(v || "").trim());
}

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
}

function money(v) {
  const n = Number(v || 0);
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

export default function Customers({ user }) {
  const role = user?.role;
  const canWrite = role === "admin" || role === "staff";

  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [updating, setUpdating] = useState(false);

  // filters
  const [q, setQ] = useState("");

  // customer history states
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [history, setHistory] = useState(null); // { customer, rentals }

  // invoice download state
  const [invoiceDownloadingId, setInvoiceDownloadingId] = useState(null);

  async function load() {
    const res = await api.get("/customers");
    setCustomers(res.data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.message || e.message));
  }, []);

  const filteredCustomers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.phone, c.email, c.address, c.notes, c.customerUser].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [customers, q]);

  const stats = useMemo(() => {
    const total = customers.length;
    const linked = customers.filter((c) => !!c.customerUser).length;
    const missingPhone = customers.filter((c) => !c.phone).length;
    return { total, linked, missingPhone };
  }, [customers]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  }

  async function createCustomer(e) {
    e.preventDefault();
    if (!canWrite) return;

    setError("");
    setSaving(true);
    try {
      const customerUser = form.customerUser.trim();
      if (customerUser && !isObjectId(customerUser)) {
        throw new Error("Linked Login User ID must be a valid MongoDB ObjectId (24 hex characters).");
      }

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        customerUser: customerUser || undefined
      };

      await api.post("/customers", payload);
      setForm(initialForm);
      setOpenCreate(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c) {
    setError("");
    setEditing(c);
    setEditForm({
      name: c?.name || "",
      phone: c?.phone || "",
      email: c?.email || "",
      address: c?.address || "",
      notes: c?.notes || "",
      customerUser: c?.customerUser ? String(c.customerUser) : ""
    });
    setOpenEdit(true);
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(initialForm);
    setOpenEdit(false);
  }

  async function updateCustomer(e) {
    e.preventDefault();
    if (!canWrite) return;
    if (!editing?._id) return;

    setError("");
    setUpdating(true);
    try {
      const customerUser = editForm.customerUser.trim();
      if (customerUser && !isObjectId(customerUser)) {
        throw new Error("Linked Login User ID must be a valid MongoDB ObjectId (24 hex characters).");
      }

      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        customerUser: customerUser || undefined
      };

      const res = await api.put(`/customers/${editing._id}`, payload);
      setCustomers((prev) => prev.map((x) => (x._id === editing._id ? res.data : x)));
      closeEdit();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function unlinkCustomerUser(c) {
    if (!canWrite) return;
    if (!c?._id) return;

    const ok = window.confirm(`Unlink login user from customer "${c.name}"?`);
    if (!ok) return;

    setError("");
    try {
      const res = await api.put(`/customers/${c._id}`, { customerUser: null });
      setCustomers((prev) => prev.map((x) => (x._id === c._id ? res.data : x)));
      if (editing?._id === c._id) {
        setEditing(res.data);
        setEditForm((f) => ({ ...f, customerUser: "" }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  async function deleteCustomer(c) {
    if (!canWrite) return;
    if (!c?._id) return;

    const ok = window.confirm(`Delete customer "${c.name}"?`);
    if (!ok) return;

    setError("");
    try {
      await api.delete(`/customers/${c._id}`);
      setCustomers((prev) => prev.filter((x) => x._id !== c._id));
      if (editing?._id === c._id) closeEdit();
      if (history?.customer?._id === c._id) closeHistory();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  }

  async function viewHistory(c) {
    if (!c?._id) return;

    setHistoryError("");
    setHistory(null);
    setHistoryLoading(true);
    setOpenHistory(true);

    try {
      const res = await api.get(`/reports/customer/${c._id}/history`);
      setHistory(res.data);
    } catch (err) {
      setHistoryError(err?.response?.data?.message || err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryError("");
    setHistory(null);
    setHistoryLoading(false);
    setOpenHistory(false);
  }

  async function downloadInvoicePdf(rentalId) {
    if (!rentalId) return;

    setError("");
    setHistoryError("");
    setInvoiceDownloadingId(rentalId);

    try {
      const res = await api.get(`/rentals/${rentalId}/invoice.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));

      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${rentalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      setHistoryError(msg);
    } finally {
      setInvoiceDownloadingId(null);
    }
  }

  const headerRight = (
    <>
      <div className="w-full sm:w-[360px]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (name, phone, email, linked user...)"
          className="bg-white/60 dark:bg-slate-900/60"
        />
      </div>

      <Button
        variant="outline"
        onClick={() =>
          load().catch((e) => setError(e?.response?.data?.message || e.message))
        }
      >
        Refresh
      </Button>

      {canWrite ? (
        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setForm(initialForm);
          }}
        >
          <DialogTrigger asChild>
            <Button>Add customer</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
              <DialogDesc>
                Tip: Use Users page → copy user id and paste into “Linked Login User ID” to enable My Rentals.
              </DialogDesc>
            </DialogHeader>

            <form onSubmit={createCustomer} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    placeholder="e.g. Ali Khan"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="e.g. 03xx-xxxxxxx"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="e.g. ali@gmail.com"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    placeholder="e.g. Lahore"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    name="notes"
                    value={form.notes}
                    onChange={onChange}
                    rows={3}
                    placeholder="optional"
                    className="bg-white/60 dark:bg-slate-900/60"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Linked Login User ID (optional)</Label>
                  <Input
                    name="customerUser"
                    value={form.customerUser}
                    onChange={onChange}
                    placeholder="Paste User _id (24 hex chars)"
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
                  {saving ? "Saving..." : "Add customer"}
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
        <PageHeader title="Customers" description="Manage customers, link login users, and view rental history." right={headerRight} />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="total" value={stats.total} tone="indigo" />
          <MetricPill label="linked users" value={stats.linked} tone="emerald" />
          <MetricPill label="missing phone" value={stats.missingPhone} tone="amber" />
          <MetricPill label={canWrite ? "edit access" : "read-only"} value={canWrite ? "enabled" : "limited"} tone="default" />
        </div>
      </div>

      <Separator />

      {!canWrite ? (
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/45 via-white/0 to-violet-200/45 blur-2xl dark:from-indigo-500/10 dark:to-violet-500/10" />
          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45">
            <CardContent className="p-5">
              <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">Read-only</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                You don’t have permission to create/edit customers.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Premium list container */}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Linked User</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredCustomers.map((c) => (
                    <TableRow
                      key={c._id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      <TableCell className="font-medium text-slate-950 dark:text-slate-100">{c.name}</TableCell>
                      <TableCell>{c.phone || "-"}</TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{c.address || "-"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{c.notes || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.customerUser ? String(c.customerUser) : "-"}</TableCell>

                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewHistory(c)}
                            disabled={saving || updating || historyLoading}
                          >
                            History
                          </Button>

                          {canWrite ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(c)}
                                disabled={saving || updating || historyLoading}
                              >
                                Edit
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteCustomer(c)}
                                disabled={saving || updating || historyLoading}
                              >
                                Delete
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8">
                        <EmptyState
                          title="No customers found"
                          subtitle={q.trim() ? "Try a different search term or clear the filter." : "Add your first customer to get started."}
                          action={
                            canWrite ? (
                              <Button onClick={() => setOpenCreate(true)}>Add customer</Button>
                            ) : (
                              <Button variant="outline" onClick={() => load().catch((e) => setError(e?.response?.data?.message || e.message))}>
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
              Tip: Use <b>Users</b> page → <b>Copy ID</b> and paste into <b>Linked Login User ID</b> to enable customer{" "}
              <b>My Rentals</b>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDesc>Update customer details and linked login user id.</DialogDesc>
          </DialogHeader>

          <form onSubmit={updateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  value={editForm.name}
                  onChange={onEditChange}
                  required
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" value={editForm.phone} onChange={onEditChange} className="bg-white/60 dark:bg-slate-900/60" />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" value={editForm.email} onChange={onEditChange} className="bg-white/60 dark:bg-slate-900/60" />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" value={editForm.address} onChange={onEditChange} className="bg-white/60 dark:bg-slate-900/60" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" value={editForm.notes} onChange={onEditChange} rows={3} className="bg-white/60 dark:bg-slate-900/60" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Linked Login User ID</Label>
                <Input
                  name="customerUser"
                  value={editForm.customerUser}
                  onChange={onEditChange}
                  placeholder="24 hex chars"
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeEdit} disabled={updating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Save changes"}
                </Button>
              </div>

              <Button type="button" variant="outline" onClick={() => unlinkCustomerUser(editing)} disabled={updating}>
                Unlink login user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="sm:max-w-[1020px]">
          <DialogHeader>
            <DialogTitle>Customer rental history</DialogTitle>
            <DialogDesc>
              {history?.customer?.name ? (
                <>
                  <span className="font-medium">{history.customer.name}</span>{" "}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {history.customer.phone ? `• ${history.customer.phone}` : ""}{" "}
                    {history.customer.email ? `• ${history.customer.email}` : ""}
                  </span>
                </>
              ) : (
                "History"
              )}
            </DialogDesc>
          </DialogHeader>

          {historyLoading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading history...</p> : null}
          {historyError ? <p className="text-sm text-rose-600">{historyError}</p> : null}

          {history ? (
            <div className="overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
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
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {history.rentals.map((r) => {
                    const isClosed = String(r.status).toLowerCase() === "closed";
                    const isDownloading = invoiceDownloadingId === r._id;

                    return (
                      <TableRow
                        key={r._id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                      >
                        <TableCell>
                          <RentalStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="font-medium text-slate-950 dark:text-slate-100">{r.machine?.name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.startDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.endDate)}</TableCell>
                        <TableCell className="text-right">{money(r.totals?.totalAmount ?? r.totalAmount)}</TableCell>
                        <TableCell className="text-right">{money(r.totals?.totalPaid)}</TableCell>
                        <TableCell className="text-right">{money(r.totals?.balance)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(r.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {isClosed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInvoicePdf(r._id)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? "Downloading..." : "Invoice PDF"}
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {history.rentals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8">
                        <EmptyState title="No rentals" subtitle="No rentals for this customer yet." />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeHistory}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}