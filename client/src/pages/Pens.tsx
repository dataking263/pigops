import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  Layers,
  Syringe,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui-bits";
import { fmtRelative, fmtDate, fmtNum } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PenSummary } from "@shared/schema";
import { PenDetail } from "@/components/PenDetail";

const HEALTH_COLOR: Record<string, string> = {
  green: "bg-[hsl(140_45%_45%)] dark:bg-[hsl(140_50%_55%)]",
  amber: "bg-[hsl(38_85%_55%)] dark:bg-[hsl(38_85%_60%)]",
  red: "bg-[hsl(0_70%_50%)] dark:bg-[hsl(0_75%_60%)]",
};

const HEALTH_LABEL: Record<string, string> = {
  green: "Healthy",
  amber: "Watch",
  red: "Action",
};

export default function Pens() {
  const { toast } = useToast();
  const { data: pens, isLoading } = useQuery<PenSummary[]>({
    queryKey: ["/api/pens"],
    refetchInterval: 60000,
  });
  const [openId, setOpenId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const [matchDetail, params] = useRoute<{ id: string }>("/pens/:id");
  useEffect(() => {
    if (matchDetail && params?.id) {
      const n = Number(params.id);
      if (!Number.isNaN(n)) setOpenId(n);
    }
  }, [matchDetail, params?.id]);
  function handleOpenChange(open: boolean) {
    if (!open) {
      setOpenId(null);
      if (matchDetail) navigate("/pens");
    }
  }

  const regenerate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pens/regenerate-reminders", {}),
    onSuccess: async (res) => {
      const stats = await res.json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminders refreshed",
        description: `${stats.reminders_created ?? "—"} active across ${stats.active_pigs ?? "—"} pigs.`,
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Pens"
        subtitle="7 pens · health & medication overview"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            data-testid="button-regenerate-reminders"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerate.isPending ? "animate-spin" : ""}`} />
            {regenerate.isPending ? "Refreshing…" : "Regenerate reminders"}
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 max-w-[1400px] mx-auto w-full">
        {isLoading || !pens ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <PenCardSkeleton key={i} />
            ))}
          </div>
        ) : pens.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-5 w-5" />}
            title="No pens configured"
            description="Pens haven't been seeded yet. Try regenerating."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="grid-pens">
            {pens.map((pen) => (
              <PenCard
                key={pen.id}
                pen={pen}
                onOpen={() => setOpenId(pen.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={openId !== null} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden"
        >
          {openId !== null && <PenDetail penId={openId} onClose={() => handleOpenChange(false)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PenCard({ pen, onOpen }: { pen: PenSummary; onOpen: () => void }) {
  const { toast } = useToast();
  const clean = useMutation({
    mutationFn: () => apiRequest("POST", `/api/pens/${pen.id}/clean`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens", pen.id] });
      toast({ title: `Pen ${pen.id} marked cleaned` });
    },
  });

  const next = pen.next_due_reminder;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = next ? next.due_date < today : false;
  const daysUntilNext = next
    ? Math.round((new Date(next.due_date).getTime() - Date.now()) / 86400000)
    : null;
  const last = pen.last_treatment;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      aria-label={`Pen ${pen.id} · ${pen.role} · status ${HEALTH_LABEL[pen.health_status]}`}
      data-testid={`card-pen-${pen.id}`}
      className="text-left group relative rounded-xl border border-card-border bg-card p-4 md:p-5 hover-elevate cursor-pointer flex flex-col gap-4 min-w-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-mono font-bold text-lg tabular-nums shrink-0 shadow-sm"
          data-testid={`badge-pen-num-${pen.id}`}
        >
          {pen.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pen {pen.id}</div>
          <h3 className="text-sm font-semibold tracking-tight leading-tight truncate">
            {pen.role}
          </h3>
        </div>
        <HealthPill status={pen.health_status} />
      </div>

      {/* Occupancy */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono font-semibold text-2xl tabular-nums leading-none">
            {fmtNum(pen.occupancy)}
          </span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
        {Object.keys(pen.category_mix).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(pen.category_mix).map(([cat, n]) => (
              <span
                key={cat}
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums font-medium"
                data-testid={`mix-${pen.id}-${cat.toLowerCase()}`}
              >
                {n} {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 text-xs">
        <Row
          icon={<Syringe className="h-3.5 w-3.5" />}
          label="Next treatment"
          value={
            next ? (
              <span className={overdue ? "text-status-alert font-medium" : ""}>
                <span className="font-medium">{next.protocol?.name ?? "Treatment"}</span>{" "}
                <span className="text-muted-foreground tabular-nums">
                  · {overdue ? `${Math.abs(daysUntilNext!)}d overdue` : daysUntilNext === 0 ? "today" : `in ${daysUntilNext}d`}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">All current</span>
            )
          }
        />
        <Row
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          label="Last treatment"
          value={
            last ? (
              <span className="text-muted-foreground">
                <span className="text-foreground/80">{last.product_name}</span> ·{" "}
                <span className="tabular-nums">{fmtRelative(last.date_logged)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">No record</span>
            )
          }
        />
        <Row
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Mortality 7d"
          value={
            <span
              className={
                pen.mortality_7d > 0
                  ? "text-status-alert font-medium tabular-nums"
                  : "text-muted-foreground tabular-nums"
              }
            >
              {pen.mortality_7d} death{pen.mortality_7d === 1 ? "" : "s"}
            </span>
          }
        />
        <Row
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Cleaned"
          value={
            pen.days_since_cleaned == null ? (
              <span className="text-muted-foreground italic">Never logged</span>
            ) : pen.days_since_cleaned === 0 ? (
              <span className="text-muted-foreground">Today</span>
            ) : (
              <span className="text-muted-foreground tabular-nums">
                {pen.days_since_cleaned}d ago
              </span>
            )
          }
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-card-border mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          data-testid={`button-view-pen-${pen.id}`}
        >
          View pen <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Mark pen ${pen.id} cleaned today`}
          onClick={(e) => {
            e.stopPropagation();
            clean.mutate();
          }}
          disabled={clean.isPending}
          data-testid={`button-clean-pen-${pen.id}`}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function PenCardSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-muted-foreground/60 shrink-0">{icon}</span>
      <span className="text-muted-foreground/70 text-[11px] uppercase tracking-wider w-[78px] shrink-0">{label}</span>
      <span className="flex-1 min-w-0 truncate">{value}</span>
    </div>
  );
}

export function HealthPill({ status }: { status: "green" | "amber" | "red" }) {
  const dot = HEALTH_COLOR[status];
  const cls =
    status === "green"
      ? "pill-good"
      : status === "amber"
        ? "pill-warn"
        : "pill-alert";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 ${cls}`}
      data-testid={`health-${status}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {HEALTH_LABEL[status]}
    </span>
  );
}
