import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function LogoMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rb_p_g" x1="10" y1="8" x2="62" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="rb_p_hi" x1="18" y1="22" x2="58" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="56" height="56" rx="20" fill="url(#rb_p_g)" />
      <rect
        x="14"
        y="14"
        width="44"
        height="44"
        rx="16"
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(255,255,255,0.18)"
      />
      <path
        d="M26 48V24h13.3c4.1 0 6.9 2.4 6.9 6.1 0 2.7-1.3 4.7-3.5 5.6 2.8.8 4.5 3 4.5 6 0 4.2-3.1 6.8-7.9 6.8H26Zm6.6-14.0h6.1c2.1 0 3.2-1.0 3.2-2.6 0-1.6-1.2-2.6-3.2-2.6h-6.1V34Zm0 9.0h6.7c2.3 0 3.6-1.1 3.6-2.9 0-1.8-1.3-2.9-3.6-2.9h-6.7V43Z"
        fill="url(#rb_p_hi)"
      />
    </svg>
  );
}

/**
 * 1) Animated gradient shift (subtle)
 * 2) Sparkle highlight follows mouse (radial)
 * 3) Dark mode toggle (class-based)
 */
function PremiumBackground({ sparkleX, sparkleY }) {
  return (
    <>
      {/* base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      {/* animated color wash */}
      <div className="pointer-events-none absolute inset-0 rb-animated-wash opacity-[0.65]" />

      {/* premium grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-multiply dark:mix-blend-screen [background-image:radial-gradient(rgba(15,23,42,0.30)_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* calm grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px"
        }}
      />

      {/* soft blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full bg-indigo-200/55 blur-3xl dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute -right-48 -top-44 h-[680px] w-[680px] rounded-full bg-violet-200/45 blur-3xl dark:bg-violet-500/12" />
      <div className="pointer-events-none absolute -bottom-56 left-1/3 h-[740px] w-[740px] rounded-full bg-sky-200/45 blur-3xl dark:bg-sky-500/10" />

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_60%_at_50%_20%,transparent_0%,rgba(2,6,23,0.06)_100%)] dark:[background:radial-gradient(70%_60%_at_50%_20%,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

      {/* sparkle follow (mouse) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.65] transition-opacity duration-300"
        style={{
          background: `radial-gradient(220px 220px at ${sparkleX}px ${sparkleY}px, rgba(99,102,241,0.22), transparent 60%)`
        }}
      />
    </>
  );
}

function FieldIcon({ name }) {
  if (name === "email") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" aria-hidden="true">
        <path
          d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M6.5 8.2 12 12l5.5-3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" aria-hidden="true">
        <path
          d="M7.5 10.5V8.8a4.5 4.5 0 0 1 9 0v1.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M6.5 10.5h11A2.5 2.5 0 0 1 20 13v5A3 3 0 0 1 17 21H7A3 3 0 0 1 4 18v-5a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  return null;
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 dark:bg-slate-900/60 dark:text-slate-200"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Dark
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Light
        </>
      )}
    </button>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // sparkle follow
  const wrapRef = useRef(null);
  const [sparkle, setSparkle] = useState({ x: 9999, y: 9999 });

  // theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("rb-theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("rb-theme", theme);
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setToken(res.data.token);
      await onLogin?.();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  function onMouseMove(e) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSparkle({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  function onMouseLeave() {
    setSparkle({ x: 9999, y: 9999 });
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative min-h-screen overflow-hidden px-4 py-10 flex items-center"
    >
      <PremiumBackground sparkleX={sparkle.x} sparkleY={sparkle.y} />

      <div className="relative mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center">
              <LogoMark className="h-14 w-14 drop-shadow-sm" />
            </div>
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Rent Breaker
          </h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {greeting}. Sign in to continue.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/60 dark:text-slate-200">
              Secure sign-in
            </span>
            <span className="rounded-full border bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/60 dark:text-slate-200">
              Role-based access
            </span>
            <span className="rounded-full border bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/60 dark:text-slate-200">
              Invoice-ready
            </span>
          </div>

          <div className="mt-4 flex justify-center">
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>

        {/* Glow */}
        <div className="pointer-events-none absolute -inset-8 rounded-[36px] bg-gradient-to-br from-indigo-200/60 via-white/0 to-violet-200/60 blur-2xl dark:from-indigo-500/15 dark:to-violet-500/15" />

        {/* Card */}
        <Card className="relative rounded-[28px] border border-slate-200/80 bg-white/80 shadow-[0_24px_90px_rgba(2,6,23,0.16)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55 dark:shadow-[0_24px_90px_rgba(0,0,0,0.40)]">
          <CardContent className="p-6 sm:p-7">
            <form onSubmit={submit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-800 dark:text-slate-200">Email</Label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <FieldIcon name="email" />
                  </div>

                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="pl-9 bg-white/60 dark:bg-slate-900/60"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-800 dark:text-slate-200">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-xs font-medium text-primary hover:opacity-90 transition-opacity"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <FieldIcon name="lock" />
                  </div>

                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className="pl-9 bg-white/60 dark:bg-slate-900/60"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
<Button type="submit" className="w-full" disabled={loading}>
  {loading ? "Signing in..." : "Sign in"}
</Button>

              <Separator />

              <Button asChild variant="outline" className="w-full">
                <Link to="/register">Create customer account</Link>
              </Button>

              <p className="pt-1 text-center text-xs text-slate-600 dark:text-slate-400">
                Need access? Contact an administrator to provision your role.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}