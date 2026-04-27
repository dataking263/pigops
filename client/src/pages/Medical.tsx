import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Plus, Bell, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ListSkeleton, StatusPill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { MedicalLog, Pig } from "@shared/schema";
import { TreatmentLogForm } from "@/components/LogForms";

export default function Medical() {
  const [open, setOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery<MedicalLog[]>({ queryKey: ["/api/medical"] });
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const tagById = useMemo(() => {
    const m = new Map<string, string>();
    pigs.forEach((p) => m.set(p.id, p.tag_id));
    return m;
  }, [pigs]);

  // Upcoming = next_due_date in future
  const upcoming = useMemo(
    () =>
      logs
        .filter((l) => l.next_due_date && new Date(l.next_due_date) > new Date(Date.now() - 86400000))
        .sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1)),
    [logs],
  );

  // Group upcoming by date label
  const upcomingByDate = useMemo(() => {
    const groups: Record<string, MedicalLog[]> = {};
    for (const l of upcoming) {
      const d = (l.next_due_date ?? "").slice(0, 10);
      groups[d] = groups[d] ?? [];
      groups[d].push(l);
    }
    return groups;
  }, [upcoming]);

  const recent = useMemo(
    () => [...logs].sort((a, b) => (a.date_logged < b.date_logged ? 1 : -1)).slice(0, 25),
    [logs],
  );

  return (
    <>
      <PageHeader
        title="Medical"
        subtitle={`${upcoming.length} upcoming · ${logs.length} total treatments`}
        actions={
          <Button onClick={() => setOpen(true)} data-testid="button-log-treatment">
            <Plus className="h-4 w-4 mr-1.5" /> Log treatment
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1200px] mx-auto w-full">
        {/* Reminder card */}
        <div className="rounded-xl border border-card-border bg-[hsl(var(--accent))]/[0.05] dark:bg-[hsl(var(--accent))]/[0.08] p-4 mb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-card grid place-items-center text-[hsl(var(--accent))] shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-0.5">Treatment reminders</div>
            <p className="text-xs text-muted-foreground">
              Upcoming treatments appear in the dashboard activity feed and the notifications inbox. On a real deployment, push notifications would fire 24h before each due date.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Upcoming calendar */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold tracking-tight">Upcoming</h2>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{upcoming.length} due</span>
            </div>
            <div className="rounded-xl border border-card-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-4"><ListSkeleton /></div>
              ) : upcoming.length === 0 ? (
                <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No upcoming treatments" description="All caught up — log a new treatment to schedule the next one." />
              ) : (
                <ul className="divide-y divide-card-border">
                  {Object.entries(upcomingByDate).map(([date, entries]) => {
                    const due = new Date(date).getTime();
                    const today = new Date(); today.setHours(0,0,0,0);
                    const days = Math.round((due - today.getTime()) / 86400000);
                    const overdue = days < 0;
                    return (
                      <li key={date} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-xs font-semibold tracking-tight">
                            {fmtDate(date)}
                          </div>
                          <StatusPill status={overdue ? "alert" : days <= 1 ? "warn" : "good"}>
                            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                          </StatusPill>
                        </div>
                        <ul className="space-y-1">
                          {entries.map((l) => (
                            <li key={l.id} className="text-xs text-muted-foreground flex items-baseline justify-between gap-2">
                              <span className="truncate">
                                <span className="font-medium text-foreground">{l.treatment_type}</span> · {l.product_name}
                              </span>
                              <span className="font-mono tabular-nums shrink-0">
                                {l.pig_id ? tagById.get(l.pig_id) ?? "—" : l.pen ? `pen ${l.pen}` : "all"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Recent log */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold tracking-tight">Recent treatments</h2>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{logs.length} total</span>
            </div>
            <div className="rounded-xl border border-card-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-4"><ListSkeleton /></div>
              ) : recent.length === 0 ? (
                <EmptyState icon={<Stethoscope className="h-6 w-6" />} title="No treatments logged" />
              ) : (
                <ul className="divide-y divide-card-border">
                  {recent.map((l) => (
                    <li key={l.id} className="px-4 py-2.5" data-testid={`row-treatment-${l.id}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium truncate">{l.treatment_type} · {l.product_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{fmtRelative(l.date_logged)}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {l.pig_id ? `Pig ${tagById.get(l.pig_id) ?? "—"}` : l.pen ? `Pen ${l.pen}` : "All herd"}
                        {l.dose ? ` · ${l.dose}` : ""}
                        {l.next_due_date ? ` · next ${fmtDate(l.next_due_date)}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-treatment">
          <TreatmentLogForm onDone={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
