import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import { PageHeader } from "@/components/rb/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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

async function copyToClipboard(text) {
  const t = String(text || "");
  if (!t) return false;

  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function RoleBadge({ role }) {
  const r = String(role || "").toLowerCase();
  const map = {
    admin:
      "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:border-purple-500/25",
    staff:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25",
    operator:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25",
    customer:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25"
  };

  return (
    <Badge
      variant="outline"
      className={
        map[r] ||
        "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:border-slate-700"
      }
    >
      {r || "unknown"}
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
    purple:
      "border-purple-200 bg-purple-50/70 text-purple-900 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-200",
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

export default function Users({ user }) {
  const role = user?.role;
  const isAdmin = role === "admin";

  // create user form (dialog)
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");

  // list users
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // copy feedback
  const [copiedMsg, setCopiedMsg] = useState("");

  async function loadUsers(opts) {
    if (!isAdmin) return;

    const query = opts?.q ?? q;
    const rf = opts?.roleFilter ?? roleFilter;

    const params = {};
    if (query) params.q = query;
    if (rf && rf !== "all") params.role = rf;

    const res = await api.get("/auth/users", { params });
    setUsers(res.data || []);
  }

  useEffect(() => {
    loadUsers().catch((e) => setError(e?.response?.data?.message || e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    // backend already filters, but this keeps UI responsive while typing
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const hay = [u._id, u.name, u.email, u.role].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [users, q]);

  const stats = useMemo(() => {
    const out = { total: users.length, admin: 0, staff: 0, operator: 0, customer: 0 };
    for (const u of users) {
      const r = String(u.role || "").toLowerCase();
      if (out[r] !== undefined) out[r] += 1;
    }
    return out;
  }, [users]);

  async function submit(e) {
    e.preventDefault();
    if (!isAdmin) return;

    setError("");
    setOk("");
    setCopiedMsg("");
    setLoadingCreate(true);

    try {
      const payload = {
        name: name.trim() || undefined,
        email: email.trim(),
        password,
        role: newRole
      };

      await api.post("/auth/users", payload);

      setOk(`User created: ${payload.email} (${payload.role})`);
      setName("");
      setEmail("");
      setPassword("");
      setNewRole("staff");
      setOpenCreate(false);

      setLoadingList(true);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingCreate(false);
      setLoadingList(false);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    if (!isAdmin) return;

    setError("");
    setCopiedMsg("");
    setLoadingList(true);
    try {
      await loadUsers({ q, roleFilter });
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function onReload() {
    if (!isAdmin) return;

    setError("");
    setCopiedMsg("");
    setLoadingList(true);
    try {
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function onCopy(label, value) {
    const ok = await copyToClipboard(value);
    if (!ok) {
      setCopiedMsg("Copy failed. Your browser may block clipboard access.");
      return;
    }
    setCopiedMsg(`${label} copied.`);
    window.setTimeout(() => setCopiedMsg(""), 2000);
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in-0 duration-300">
        <PageHeader title="Users" description="You must be an admin to access this page." />

        <Separator />

        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/45 via-white/0 to-violet-200/45 blur-2xl dark:from-indigo-500/10 dark:to-violet-500/10" />

          <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45">
            <CardContent className="p-6">
              <div className="text-base font-semibold text-slate-950 dark:text-slate-50">Forbidden</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Only admins can view and manage users.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const headerRight = (
    <>
      <Button variant="outline" onClick={onReload} disabled={loadingList}>
        {loadingList ? "Loading..." : "Reload"}
      </Button>

      <Dialog
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v);
          if (!v) {
            setName("");
            setEmail("");
            setPassword("");
            setNewRole("staff");
            setError("");
            setOk("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>Create user</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDesc>Creates a new login user (admin-only).</DialogDesc>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Staff Member"
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff1@example.com"
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Set initial password"
                  className="bg-white/60 dark:bg-slate-900/60"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-white/60 dark:bg-slate-900/60">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="staff">staff</SelectItem>
                    <SelectItem value="operator">operator</SelectItem>
                    <SelectItem value="customer">customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {ok ? <div className="text-sm text-emerald-700 dark:text-emerald-300">{ok}</div> : null}
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={loadingCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={loadingCreate}>
                {loadingCreate ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Uses <code>POST /api/auth/users</code> and <code>GET /api/auth/users</code> (admin-only).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="space-y-3">
        <PageHeader
          title="Users"
          description="Create users and copy user IDs to link customers (Customers → Linked Login User ID)."
          right={headerRight}
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill label="total" value={stats.total} tone="indigo" />
          <MetricPill label="admin" value={stats.admin} tone="purple" />
          <MetricPill label="staff" value={stats.staff} tone="blue" />
          <MetricPill label="operator" value={stats.operator} tone="amber" />
          <MetricPill label="customer" value={stats.customer} tone="emerald" />
        </div>
      </div>

      <Separator />

      <div className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/55 via-white/0 to-violet-200/55 blur-2xl dark:from-indigo-500/12 dark:to-violet-500/12" />

        <Card className="relative rounded-[26px] border border-slate-200/80 bg-white/70 shadow-[0_24px_90px_rgba(2,6,23,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name/email"
                className="sm:w-[320px] bg-white/60 dark:bg-slate-900/60"
              />

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="sm:w-[190px] bg-white/60 dark:bg-slate-900/60">
                  <SelectValue placeholder="Filter role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all roles</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                  <SelectItem value="operator">operator</SelectItem>
                  <SelectItem value="customer">customer</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loadingList}>
                  {loadingList ? "Searching..." : "Search"}
                </Button>
                <Button type="button" variant="outline" onClick={onReload} disabled={loadingList}>
                  Reload
                </Button>
              </div>
            </form>

            <div className="mt-3">
              {copiedMsg ? <div className="text-sm text-emerald-700 dark:text-emerald-300">{copiedMsg}</div> : null}
              {error ? (
                <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto rounded-[22px] border bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/50 dark:border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-slate-950/70">
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Copy</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow
                      key={u._id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      <TableCell className="font-mono text-xs">{u._id}</TableCell>
                      <TableCell>{u.name || "-"}</TableCell>
                      <TableCell className="font-medium text-slate-950 dark:text-slate-100">{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{fmtDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => onCopy("User ID", u._id)}>
                            Copy ID
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onCopy("Email", u.email)}>
                            Copy Email
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <EmptyState
                          title="No users found"
                          subtitle={q.trim() ? "Try a different search term or clear the filter." : "Create your first user to get started."}
                          action={<Button onClick={() => setOpenCreate(true)}>Create user</Button>}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Tip: Copy the User ID and paste it in Customers → <b>Linked Login User ID</b>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}