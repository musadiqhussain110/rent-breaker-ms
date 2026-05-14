import { Badge } from "@/components/ui/badge";

const statusClasses = {
  available: "bg-accent/15 text-accent border-accent/30",
  reserved: "bg-secondary/15 text-secondary border-secondary/30",
  rented: "bg-primary/15 text-primary border-primary/25",
  maintenance: "bg-muted text-muted-foreground border-border"
};

export function StatusBadge({ status }) {
  const s = String(status || "unknown").toLowerCase();
  return (
    <Badge variant="outline" className={statusClasses[s] || "bg-muted text-muted-foreground border-border"}>
      {s}
    </Badge>
  );
}
