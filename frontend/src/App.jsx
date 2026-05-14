import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users as UsersIcon,
  UserSquare2,
  Wrench
} from "lucide-react";

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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", theme === "dark" ? "bg-accent" : "bg-secondary")} />
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}

function roleTone(role) {
  if (role === "admin") return "bg-primary/10 text-primary border-primary/25";
  if (role === "staff" || role === "operator") return "bg-secondary/10 text-secondary border-secondary/25";
  return "bg-accent/10 text-accent border-accent/30";
}

function pageTitle(pathname) {
  if (pathname.startsWith("/machines")) return "Machines";
  if (pathname.startsWith("/rentals")) return "Rentals";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/maintenance")) return "Maintenance";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/requests")) return "Requests";
  if (pathname.startsWith("/my-rentals")) return "My Rentals";
  if (pathname.startsWith("/users")) return "Users";
  return "Dashboard";
}

function Forbidden() {
  return (
    <div className="rb-content py-8">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Forbidden</h2>
        <p className="mt-2 text-sm text-muted-foreground">You don’t have permission to view this page.</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ user, allow, element }) {
  if (!user) return <Forbidden />;
  if (!allow.includes(user.role)) return <Forbidden />;
  return element;
}

function AppLayout({ user, onLogout, theme, setTheme, children }) {
  const location = useLocation();
  const role = user?.role;
  const title = pageTitle(location.pathname);

  const items = useMemo(() => {
    const all = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff", "operator", "customer"] },
      { to: "/machines", label: "Machines", icon: Settings, roles: ["admin", "staff", "operator"] },
      { to: "/rentals", label: "Rentals", icon: ClipboardList, roles: ["admin", "staff", "operator"] },
      { to: "/customers", label: "Customers", icon: UsersIcon, roles: ["admin", "staff"] },
      { to: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["admin", "staff", "operator"] },
      { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "staff"] },
      { to: "/requests", label: "Requests", icon: ClipboardList, roles: ["admin", "staff", "customer"] },
      { to: "/my-rentals", label: "My Rentals", icon: UserSquare2, roles: ["customer"] },
      { to: "/users", label: "Users", icon: UsersIcon, roles: ["admin"] }
    ];
    return all.filter((x) => x.roles.includes(role));
  }, [role]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/95 md:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              R
            </span>
            Rent Breaker
          </Link>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="rb-content flex h-16 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <Badge variant="outline" className={cn("h-9 rounded-lg px-3 text-xs capitalize", roleTone(role))}>
                {user?.name || "Account"} · {role}
              </Badge>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="rb-content py-6">{children}</main>
      </div>
    </div>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => !!localStorage.getItem("token"));
  const loggedIn = !!localStorage.getItem("token");

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
    if (!loggedIn) return;
    let active = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (active) setUser(res.data);
      })
      .catch(() => {
        setToken(null);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    return () => {
      active = false;
    };
  }, [loggedIn]);

  function logout() {
    setBooting(false);
    setToken(null);
    setUser(null);
    navigate("/");
  }

  if (booting) {
    return (
      <div className="rb-content py-10">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Loading...</h2>
          <p className="mt-2 text-sm text-muted-foreground">Preparing your workspace.</p>
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
      <div className="rb-content py-10">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Session expired</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please login again.</p>
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
    );
  }

  return (
    <AppLayout user={user} onLogout={logout} theme={theme} setTheme={setTheme}>
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
    </AppLayout>
  );
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}
