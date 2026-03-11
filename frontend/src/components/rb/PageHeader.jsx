import { cn } from "@/lib/utils";

export function PageHeader({ title, description, right, className }) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{description}</p>
        ) : null}
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}