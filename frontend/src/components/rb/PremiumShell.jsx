import { cn } from "@/lib/utils";

export function PremiumShell({ children, className }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* subtle animated wash (same vibe, calmer than auth) */}
      <div className="pointer-events-none absolute inset-0 rb-animated-wash opacity-[0.40]" />

      {/* very subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "96px 96px"
        }}
      />

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_60%_at_50%_0%,transparent_0%,rgba(2,6,23,0.06)_100%)] dark:[background:radial-gradient(70%_60%_at_50%_0%,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

      <div className={cn("relative rb-container py-6", className)}>{children}</div>
    </div>
  );
}