import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ListSkeleton, StatusPill } from "@/components/ui-bits";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { fmtDate, fmtRelative } from "@/lib/format";
import { PIG_CATEGORIES } from "@shared/schema";
import type { CensusRecord, DashboardKpis } from "@shared/schema";

export default function Census() {
  const { toast } = useToast();
  const { data: records = [], isLoading } = useQuery<CensusRecord[]>({ queryKey: ["/api/census"] });
  const { data: kpis } = useQuery<DashboardKpis>({ queryKey: ["/api/dashboard"] });

  const overdue = kpis?.census_status === "overdue";
  const last = records[0];

  // Pre-fill from current dashboard headcount
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(PIG_CATEGORIES.map((c) => [c, 0])),
  );

  useEffect(() => {
    if (kpis?.headcount?.by_category) {
      const next: Record<string, number> = {};
      PIG_CATEGORIES.forEach((c) => {
        next[c] = kpis.headcount.by_category[c] ?? 0;
      });
      setCounts(next);
    }
  }, [kpis]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const submit = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 Sun
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      return apiRequest("POST", "/api/census/submit", {
        week_start_date: weekStart.toISOString().slice(0, 10),
        total_count: total,
        by_category: JSON.stringify(counts),
        submitted_at: new Date().toISOString(),
        submitted_by: "Manager",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/census"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({ title: "Census submitted", description: `${total} pigs counted across ${PIG_CATEGORIES.length} categories.` });
    },
  });

  return (
    <>
      <PageHeader
        title="Sunday Census"
        subtitle="Weekly hard-gate. The dashboard banner persists until submitted."
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[900px] mx-auto w-full space-y-5">
        {/* Status banner */}
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            overdue
              ? "border-[hsl(var(--status-alert))]/40 bg-[hsl(var(--status-alert))]/[0.06]"
              : "border-[hsl(var(--status-good))]/40 bg-[hsl(var(--status-good))]/[0.06]"
          }`}
          data-testid={overdue ? "banner-census-overdue" : "banner-census-current"}
        >
          <div className="h-9 w-9 rounded-lg bg-card grid place-items-center shrink-0">
            {overdue ? <AlertTriangle className="h-4 w-4 text-[hsl(var(--status-alert))]" /> : <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-good))]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-0.5">
              {overdue ? "Census overdue" : "Census up to date"}
            </div>
            <p className="text-xs text-muted-foreground">
              {last ? `Last submitted ${fmtDate(last.submitted_at)} (${fmtRelative(last.submitted_at)}) by ${last.submitted_by ?? "—"}.` : "No census submitted yet."}
            </p>
          </div>
        </div>

        {/* Submit form */}
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-semibold tracking-tight">Submit count</h2>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">Week of Sun {new Date().toLocaleDateString()}</span>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PIG_CATEGORIES.map((c) => (
                <div key={c} className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{c}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={counts[c] ?? 0}
                    onChange={(e) => setCounts((cur) => ({ ...cur, [c]: Math.max(0, Number(e.target.value)) }))}
                    className="font-mono tabular-nums text-base"
                    data-testid={`input-census-${c.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between rounded-lg bg-muted/40 px-4 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total counted</div>
                <div className="font-mono tabular-nums font-semibold text-2xl mt-1" data-testid="text-census-total">{total}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">System headcount</div>
                <div className="font-mono tabular-nums text-base text-muted-foreground mt-1">{kpis?.headcount.total ?? "—"}</div>
                {kpis && total !== kpis.headcount.total && (
                  <StatusPill status="warn" className="mt-1">{Math.abs(total - kpis.headcount.total)} discrepancy</StatusPill>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="submit" disabled={submit.isPending || total === 0} size="lg" data-testid="button-submit-census">
                {submit.isPending ? "Submitting…" : "Submit census"}
              </Button>
            </div>
          </form>
        </div>

        {/* History */}
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border bg-card-foreground/[0.02]">
            Census history
          </div>
          {isLoading ? (
            <div className="p-4"><ListSkeleton /></div>
          ) : records.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="No history" description="Submit your first census to start tracking trends." />
          ) : (
            <ul className="divide-y divide-card-border">
              {records.slice(0, 12).map((r) => {
                let cat: Record<string, number> = {};
                try { cat = JSON.parse(r.by_category); } catch {}
                return (
                  <li key={r.id} className="px-4 py-3" data-testid={`row-census-${r.id}`}>
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <div className="text-sm font-medium">Week of {fmtDate(r.week_start_date)}</div>
                      <div className="font-mono tabular-nums text-sm">{r.total_count}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                      {Object.entries(cat).filter(([, v]) => v > 0).map(([k, v]) => `${k.toLowerCase()}:${v}`).join(" · ")}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
