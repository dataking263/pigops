import { type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  unit,
  sub,
  trend,
  icon,
  status,
  className,
  testId,
  children,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  trend?: ReactNode;
  icon?: ReactNode;
  status?: "good" | "warn" | "alert" | null;
  className?: string;
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-card-border bg-card p-4 md:p-5 flex flex-col gap-2 min-w-0",
        className,
      )}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        {icon && <div className="text-muted-foreground/70 shrink-0">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <div className="font-mono font-semibold text-[28px] leading-none tabular-nums tracking-tight">
          {value}
        </div>
        {unit && <div className="text-sm text-muted-foreground font-medium">{unit}</div>}
        {trend}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {status && (
        <div
          className={cn(
            "self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md mt-1",
            status === "good" && "pill-good",
            status === "warn" && "pill-warn",
            status === "alert" && "pill-alert",
          )}
        >
          {status === "good" ? "On target" : status === "warn" ? "Watch" : "Action needed"}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusPill({
  status,
  children,
  className,
}: {
  status: "good" | "warn" | "alert" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const cls =
    status === "good" ? "pill-good" :
    status === "warn" ? "pill-warn" :
    status === "alert" ? "pill-alert" :
    "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md",
        cls,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    Sow: "bg-[hsl(140_25%_92%)] text-[hsl(140_25%_28%)] dark:bg-[hsl(140_20%_18%)] dark:text-[hsl(140_30%_70%)]",
    Boar: "bg-[hsl(25_25%_88%)] text-[hsl(25_30%_25%)] dark:bg-[hsl(25_15%_22%)] dark:text-[hsl(25_25%_75%)]",
    Piglet: "bg-[hsl(35_70%_92%)] text-[hsl(25_60%_30%)] dark:bg-[hsl(35_25%_22%)] dark:text-[hsl(35_60%_72%)]",
    Weaner: "bg-[hsl(14_50%_92%)] text-[hsl(14_55%_30%)] dark:bg-[hsl(14_25%_22%)] dark:text-[hsl(14_60%_72%)]",
    Grower: "bg-[hsl(200_30%_90%)] text-[hsl(200_45%_30%)] dark:bg-[hsl(200_20%_22%)] dark:text-[hsl(200_40%_72%)]",
    Finisher: "bg-[hsl(14_60%_88%)] text-[hsl(14_65%_28%)] dark:bg-[hsl(14_30%_22%)] dark:text-[hsl(14_60%_72%)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
        map[category] ?? "bg-muted text-muted-foreground",
      )}
    >
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "good" | "warn" | "alert" | "neutral"> = {
    Active: "good",
    Sold: "neutral",
    Deceased: "alert",
    Transferred: "neutral",
  };
  return <StatusPill status={map[status] ?? "neutral"}>{status}</StatusPill>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-muted/50 grid place-items-center text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
