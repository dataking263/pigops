import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skull, Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ListSkeleton, StatusPill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { MortalityLog, Pig } from "@shared/schema";
import { DeathLogForm } from "@/components/LogForms";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const CAUSE_COLORS: Record<string, string> = {
  Disease: "hsl(var(--status-alert))",
  Crushing: "hsl(var(--status-warn))",
  Stillborn: "hsl(14 50% 60%)",
  Unknown: "hsl(var(--muted-foreground))",
  Predator: "hsl(25 60% 45%)",
  Other: "hsl(200 30% 50%)",
};

export default function Mortality() {
  const [open, setOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery<MortalityLog[]>({ queryKey: ["/api/mortality"] });
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const tagById = useMemo(() => {
    const m = new Map<string, string>();
    pigs.forEach((p) => m.set(p.id, p.tag_id));
    return m;
  }, [pigs]);

  // Outbreak detection: 3+ same cause in last 7 days
  const outbreaks = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    const m: Record<string, MortalityLog[]> = {};
    for (const l of logs) {
      if (new Date(l.date_logged).getTime() > cutoff) {
        m[l.cause_of_death] = m[l.cause_of_death] ?? [];
        m[l.cause_of_death].push(l);
      }
    }
    return Object.entries(m).filter(([, list]) => list.length >= 3);
  }, [logs]);

  const byCause = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of logs) m[l.cause_of_death] = (m[l.cause_of_death] ?? 0) + 1;
    return Object.entries(m).map(([cause, count]) => ({ cause, count }));
  }, [logs]);

  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[key] = 0;
    }
    for (const l of logs) {
      const key = l.date_logged.slice(0, 7);
      if (key in m) m[key] += 1;
    }
    return Object.entries(m).map(([month, count]) => ({ month: month.slice(5), count }));
  }, [logs]);

  return (
    <>
      <PageHeader
        title="Mortality"
        subtitle={`${logs.length} total events · last 30 days: ${logs.filter((l) => Date.now() - new Date(l.date_logged).getTime() < 30 * 86400000).length}`}
        actions={
          <Button onClick={() => setOpen(true)} variant="destructive" data-testid="button-log-death">
            <Plus className="h-4 w-4 mr-1.5" /> Log death
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1400px] mx-auto w-full space-y-5">
        {outbreaks.length > 0 && (
          <div className="rounded-xl border border-[hsl(var(--status-alert))]/40 bg-[hsl(var(--status-alert))]/[0.06] p-4 flex items-start gap-3" data-testid="banner-outbreak">
            <div className="h-9 w-9 rounded-lg bg-card grid place-items-center text-[hsl(var(--status-alert))] shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5">Possible outbreak detected</div>
              <p className="text-xs text-muted-foreground">
                {outbreaks.map(([cause, list]) => `${list.length} ${cause.toLowerCase()} deaths in the last 7 days`).join(" · ")}.
                Notify the vet and review pen biosecurity.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cause breakdown pie */}
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="text-sm font-semibold mb-3">Cause breakdown</div>
            {byCause.length === 0 ? (
              <EmptyState icon={<Skull className="h-6 w-6" />} title="No deaths recorded" />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCause} dataKey="count" nameKey="cause" innerRadius={60} outerRadius={95} paddingAngle={2}>
                      {byCause.map((entry, idx) => (
                        <Cell key={idx} fill={CAUSE_COLORS[entry.cause] ?? "hsl(var(--primary))"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Monthly trend */}
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="text-sm font-semibold mb-3">By month · last 6</div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--card-border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--status-alert))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent log */}
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border bg-card-foreground/[0.02]">
            Recent mortality events
          </div>
          {isLoading ? (
            <div className="p-4"><ListSkeleton /></div>
          ) : logs.length === 0 ? (
            <EmptyState icon={<Skull className="h-6 w-6" />} title="No deaths recorded" description="Log mortality events with photo evidence and GPS." />
          ) : (
            <ul className="divide-y divide-card-border">
              {logs.slice(0, 25).map((l) => (
                <li key={l.id} className="px-4 py-3" data-testid={`row-mortality-${l.id}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2">
                      <StatusPill status="alert">{l.cause_of_death}</StatusPill>
                      <div className="text-sm font-medium">
                        {l.pig_id ? `Pig ${tagById.get(l.pig_id) ?? "—"}` : l.category ? l.category : "Unknown"}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{fmtRelative(l.date_logged)}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtDate(l.date_logged)}
                    {l.pen ? ` · pen ${l.pen}` : ""}
                    {l.notes ? ` · ${l.notes}` : ""}
                    {l.photo_lat ? ` · GPS ${l.photo_lat.toFixed(3)},${l.photo_lng?.toFixed(3)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-death">
          <DeathLogForm onDone={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
