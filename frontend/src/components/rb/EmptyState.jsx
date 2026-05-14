import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({ title, subtitle, action, className }) {
  return (
    <div className={cn("rounded-xl border border-border/80 bg-card px-6 py-10 text-center", className)}>
      <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{subtitle}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
