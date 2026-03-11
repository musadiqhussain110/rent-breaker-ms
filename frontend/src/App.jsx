import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Machines from "./pages/Machines";
import Customers from "./pages/Customers";
import Rentals from "./pages/Rentals";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Requests from "./pages/Requests";
import Users from "./pages/Users";
import MyRentals from "./pages/MyRentals";

import { api, setToken } from "./api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { PremiumShell } from "@/components/rb/PremiumShell";

function ThemeToggle({ theme, setTheme, size = "md" }) {
  const base = "inline-flex items-center gap-2 rounded-full border shadow-sm backdrop-blur transition-colors";
  const sizes = {
    sm: "bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-white/90 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-800 dark:hover:bg-slate-900/80",
    md: "bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white/90 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-800 dark:hover:bg-slate-900/80"
  };

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className={cn(base, sizes[size] || sizes.md)}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Dark
        </>
      ) : (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          Light
        </>
      )}
    </button>
  );
}

function Forbidden() {
  return (
    <div className="rb-container py-10">
      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-950/50 dark:border-slate-800">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Forbidden</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You don’t have permission to view this page.</p>
      </div>
    </div>
  );
}

function roleColor(role) {
  if (role === "admin")
    return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:border-purple-500/25";
  if (role === "staff")
    return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/25";
  if (role === "operator")
    return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/25";
  return "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/25";
}

function BrandMark({ size = "md" }) {
  const sizes = {
    md: { outer: "h-12 w-12", inner: "h-9 w-9", letter: "text-lg" },
    lg: { outer: "h-14 w-14", inner: "h-10 w-10", letter: "text-xl" }
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      className={cn(
        "grid place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-[0_18px_60px_rgba(99,102,241,0.35)] ring-1 ring-white/10",
        s.outer
      )}
    >
      <div className={cn("grid place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur", s.inner)}>
        <div className={cn("font-semibold text-white", s.letter)}>B</div>
      </div>
    </div>
  );
}

function Nav({ user, onLogout, theme, setTheme }) {
  const role = user?.role;
  const location = useLocation();

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/machines", label: "Machines" }
  ];

  if (role === "admin" || role === "staff") {
    links.push({ to: "/customers", label: "Customers" });
    links.push({ to: "/rentals", label: "Rentals" });
    links.push({ to: "/maintenance", label: "Maintenance" });
    links.push({ to: "/requests", label: "Requests" });
    links.push({ to: "/reports", label: "Reports" });
    if (role === "admin") links.push({ to: "/users", label: "Users" });
  } else if (role === "operator") {
    links.push({ to: "/rentals", label: "Rentals" });
    links.push({ to: "/maintenance", label: "Maintenance" });
  } else if (role === "customer") {
    links.push({ to: "/requests", label: "Requests" });
    links.push({ to: "/my-rentals", label: "My Rentals" });
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:bg-slate-950/60 dark:border-slate-800">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4">
        {/* Left: Brand (click -> dashboard)
            Blue border you see is the focus ring from:
              focus:ring-2 focus:ring-indigo-500/40
            We keep accessibility but make it subtle + only show on keyboard focus using focus-visible.
        */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35 focus-visible:ring-offset-0"
        >
          <BrandMark size="lg" />
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">Rent Breaker</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Machine Rental Management</div>
          </div>
        </Link>

        <div className="hidden justify-center md:flex">
          <nav className="flex items-center gap-1 whitespace-nowrap px-1">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/60"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center justify-end gap-3">
          <ThemeToggle theme={theme} setTheme={setTheme} size="md" />

          <Badge variant="outline" className={cn("hidden sm:inline-flex px-4 py-2 text-sm font-medium", roleColor(role))}>
            {user?.name ? user.name : "Account"} • {user?.role}
          </Badge>

          <Button className="px-4 py-2 text-sm" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="block px-5 pb-3 md:hidden">
        <div className="-mx-5 overflow-x-auto px-5">
          <nav className="flex w-max items-center gap-1 whitespace-nowrap">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/60"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ user, allow, element }) {
  if (!user) return <Forbidden />;
  if (!allow.includes(user.role)) return <Forbidden />;
  return element;
}

function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const loggedIn = !!localStorage.getItem("token");
  const role = user?.role;

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("rb-theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("rb-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const defaultAfterLogin = useMemo(() => "/dashboard", []);

  async function loadMe() {
    const res = await api.get("/auth/me");
    setUser(res.data);
  }

  useEffect(() => {
    if (!loggedIn) {
      setBooting(false);
      return;
    }

    setBooting(true);
    loadMe()
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  function logout() {
    setToken(null);
    setUser(null);
    navigate("/");
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="rb-container py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-950/50 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Loading...</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Preparing your workspace.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <Login
              onLogin={async () => {
                await loadMe();
                navigate(defaultAfterLogin);
              }}
            />
          }
        />
        <Route
          path="/register"
          element={
            <Register
              onRegistered={async () => {
                await loadMe();
                navigate(defaultAfterLogin);
              }}
            />
          }
        />
        <Route
          path="*"
          element={
            <Login
              onLogin={async () => {
                await loadMe();
                navigate(defaultAfterLogin);
              }}
            />
          }
        />
      </Routes>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="rb-container py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-950/50 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Session expired</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Please login again.</p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                setToken(null);
                navigate("/");
              }}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav user={user} onLogout={logout} theme={theme} setTheme={setTheme} />

      <PremiumShell>
        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/machines" element={<Machines user={user} />} />

          <Route path="/customers" element={<ProtectedRoute user={user} allow={["admin", "staff"]} element={<Customers user={user} />} />} />

          <Route path="/rentals" element={<ProtectedRoute user={user} allow={["admin", "staff", "operator"]} element={<Rentals user={user} />} />} />

          <Route path="/maintenance" element={<ProtectedRoute user={user} allow={["admin", "staff", "operator"]} element={<Maintenance user={user} />} />} />

          <Route path="/requests" element={<ProtectedRoute user={user} allow={["admin", "staff", "customer"]} element={<Requests user={user} />} />} />

          <Route path="/my-rentals" element={<ProtectedRoute user={user} allow={["customer"]} element={<MyRentals />} />} />

          <Route path="/reports" element={<ProtectedRoute user={user} allow={["admin", "staff"]} element={<Reports user={user} />} />} />

          <Route path="/users" element={<ProtectedRoute user={user} allow={["admin"]} element={<Users user={user} />} />} />

          <Route path="*" element={<Dashboard user={user} />} />
        </Routes>
      </PremiumShell>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}