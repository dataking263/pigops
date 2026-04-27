import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  X,
  Syringe,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Clock3,
  Info,
  Skull,
  Stethoscope,
  Users,
  StickyNote,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, CategoryBadge } from "@/components/ui-bits";
import { fmtRelative, fmtDate, fmtDateShort, ageString } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { HealthPill } from "@/pages/Pens";
import type {
  Pig,
  MedicalLog,
  MortalityLog,
  Pen,
  MedicationProtocol,
  PenReminder,
  PenSummary,
} from "@shared/schema";

interface PenDetailData {
  pen: Pen;
  summary: PenSummary;
  pigs: Pig[];
  reminders: Array<PenReminder & { protocol: MedicationProtocol }>;
  medical_logs: MedicalLog[];
  mortality_logs: MortalityLog[];
  mort_7d: number;
  mort_30d: number;
}

export function PenDetail({ penId, onClose }: { penId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<PenDetailData>({ queryKey: ["/api/pens", penId] });
  const { toast } = useToast();

  if (isLoading || !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  const pen = data.pen;
  const summary = data.summary;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-mono font-bold text-2xl tabular-nums shadow-sm">
            {pen.id}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Pen {pen.id}
              </span>
              <HealthPill status={summary.health_status} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight mt-0.5">{pen.role}</h2>
            <div className="text-xs text-muted-foreground mt-1 tabular-nums">
              {summary.occupancy} active ·{" "}
              {summary.pending_count > 0
                ? `${summary.pending_count} pending treatment${summary.pending_count === 1 ? "" : "s"}`
                : "no pending treatments"}
              {summary.overdue_count > 0 && (
                <span className="text-status-alert font-medium ml-1">
                  · {summary.overdue_count} overdue
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            data-testid="button-pen-detail-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-3 border-b border-border bg-background">
          <TabsList className="grid grid-cols-5 w-full max-w-xl">
            <TabsTrigger value="overview" data-testid="tab-pen-overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-pen-schedule">Schedule</TabsTrigger>
            <TabsTrigger value="pigs" data-testid="tab-pen-pigs">Pigs</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-pen-history">History</TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-pen-notes">Notes</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll">
          <TabsContent value="overview" className="p-6 space-y-5 mt-0">
            <OverviewPane data={data} />
          </TabsContent>
          <TabsContent value="schedule" className="p-6 mt-0">
            <SchedulePane data={data} />
          </TabsContent>
          <TabsContent value="pigs" className="p-6 mt-0">
            <PigsPane data={data} />
          </TabsContent>
          <TabsContent value="history" className="p-6 mt-0">
            <HistoryPane data={data} />
          </TabsContent>
          <TabsContent value="notes" className="p-6 mt-0">
            <NotesPane data={data} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewPane({ data }: { data: PenDetailData }) {
  const next3 = data.reminders.slice(0, 3);
  const last5 = data.medical_logs.slice(0, 5);

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active pigs" value={String(data.summary.occupancy)} />
        <Stat
          label="30d mortality"
          value={String(data.mort_30d)}
          status={data.mort_30d > 0 ? "alert" : "neutral"}
        />
        <Stat
          label="Cleaned"
          value={
            data.summary.days_since_cleaned == null
              ? "—"
              : data.summary.days_since_cleaned === 0
                ? "Today"
                : `${data.summary.days_since_cleaned}d`
          }
        />
      </div>

      {/* Next reminders */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
          <Syringe className="h-3.5 w-3.5" /> Next reminders
        </h3>
        {next3.length === 0 ? (
          <div className="rounded-lg border border-card-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-status-good" />
            All current. No treatments due.
          </div>
        ) : (
          <ul className="space-y-2">
            {next3.map((r) => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </ul>
        )}
      </section>

      {/* Last treatments */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" /> Recent treatments
        </h3>
        {last5.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-5 w-5" />}
            title="No treatments logged"
            description="Treatments recorded for this pen will appear here."
          />
        ) : (
          <ol className="relative pl-5 border-l border-border space-y-3.5">
            {last5.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[27px] top-0.5 h-5 w-5 rounded-full bg-card border border-border grid place-items-center text-muted-foreground">
                  <Stethoscope className="h-3 w-3" />
                </span>
                <div className="text-sm font-medium">{t.product_name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.treatment_type}{t.dose ? ` · ${t.dose}` : ""}
                </div>
                <div className="text-[11px] text-muted-foreground/80 mt-0.5 tabular-nums">
                  {fmtDate(t.date_logged)} · {fmtRelative(t.date_logged)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function SchedulePane({ data }: { data: PenDetailData }) {
  if (data.reminders.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="All current"
        description="No treatments scheduled within the next 30 days."
      />
    );
  }

  // Group by week bucket
  const groups = new Map<string, typeof data.reminders>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const r of data.reminders) {
    const due = new Date(r.due_date);
    const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
    let bucket = "Later";
    if (days < 0) bucket = "Overdue";
    else if (days === 0) bucket = "Today";
    else if (days <= 7) bucket = "This week";
    else if (days <= 14) bucket = "Next week";
    else bucket = "Later";
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(r);
  }
  const order = ["Overdue", "Today", "This week", "Next week", "Later"];

  return (
    <div className="space-y-6">
      {order
        .filter((k) => groups.has(k))
        .map((bucket) => (
          <div key={bucket}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-2">
              {bucket === "Overdue" ? (
                <span className="text-status-alert">{bucket}</span>
              ) : bucket === "Today" ? (
                <span className="text-status-warn">{bucket}</span>
              ) : (
                <span className="text-muted-foreground">{bucket}</span>
              )}
              <span className="text-[10px] tabular-nums opacity-60">({groups.get(bucket)!.length})</span>
            </h3>
            <ul className="space-y-2">
              {groups.get(bucket)!.map((r) => (
                <ReminderRow key={r.id} reminder={r} expanded />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function ReminderRow({
  reminder,
  expanded,
}: {
  reminder: PenReminder & { protocol: MedicationProtocol };
  expanded?: boolean;
}) {
  const { toast } = useToast();
  const [showRationale, setShowRationale] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = reminder.due_date < today;
  const daysAway = Math.round((new Date(reminder.due_date).getTime() - Date.now()) / 86400000);

  const complete = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reminders/${reminder.id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Reminder marked done", description: `${reminder.protocol?.product_name} logged.` });
    },
  });
  const snooze = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reminders/${reminder.id}/snooze`, { days: 3 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Snoozed 3 days" });
    },
  });

  const proto = reminder.protocol;
  const isCritical = proto?.is_critical === 1;

  return (
    <li
      className={`rounded-lg border p-3 ${overdue ? "border-status-alert/40 bg-[hsl(0_70%_50%/0.05)]" : "border-card-border bg-card"}`}
      data-testid={`reminder-${reminder.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${
            isCritical ? "bg-[hsl(0_70%_50%/0.1)] text-status-alert" : "bg-muted text-muted-foreground"
          }`}
        >
          {isCritical ? <ShieldCheck className="h-4 w-4" /> : <Syringe className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{proto?.name ?? "Treatment"}</span>
                {isCritical && (
                  <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0 h-4">
                    Critical
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {proto?.product_name} · <span className="tabular-nums">{proto?.dose}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`text-xs font-mono tabular-nums ${
                  overdue ? "text-status-alert font-semibold" : daysAway === 0 ? "text-status-warn font-semibold" : ""
                }`}
              >
                {overdue ? `${Math.abs(daysAway)}d late` : daysAway === 0 ? "Today" : `in ${daysAway}d`}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {fmtDateShort(reminder.due_date)}
              </div>
            </div>
          </div>

          {expanded && proto?.rationale && (
            <button
              type="button"
              onClick={() => setShowRationale((v) => !v)}
              className="mt-2 text-[11px] text-muted-foreground italic hover:text-foreground text-left flex items-start gap-1"
            >
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span className={showRationale ? "" : "line-clamp-1"}>{proto.rationale}</span>
            </button>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <Button
              size="sm"
              variant={isCritical && overdue ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
              data-testid={`button-complete-${reminder.id}`}
            >
              {complete.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Mark done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs text-muted-foreground"
              onClick={() => snooze.mutate()}
              disabled={snooze.isPending}
              data-testid={`button-snooze-${reminder.id}`}
            >
              <Clock3 className="h-3 w-3 mr-1" /> Snooze 3d
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function PigsPane({ data }: { data: PenDetailData }) {
  if (data.pigs.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5" />}
        title="No active pigs"
        description="When pigs are assigned to this pen they will appear here."
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {data.pigs.map((p) => (
        <li key={p.id} className="py-2.5">
          <Link
            href={`/herd/${p.id}`}
            className="flex items-center gap-3 hover-elevate -mx-2 px-2 py-1 rounded-md"
            data-testid={`pen-pig-${p.id}`}
          >
            <CategoryBadge category={p.category} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium tabular-nums">{p.tag_id}</div>
              <div className="text-xs text-muted-foreground">
                {p.breed ?? "—"} · {ageString(p.birth_date)} old
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function HistoryPane({ data }: { data: PenDetailData }) {
  type Event = { id: string; type: "med" | "death"; title: string; desc: string; date: string };
  const events: Event[] = [];
  for (const m of data.medical_logs) {
    events.push({
      id: `m-${m.id}`,
      type: "med",
      title: m.product_name,
      desc: `${m.treatment_type}${m.dose ? ` · ${m.dose}` : ""}`,
      date: m.date_logged,
    });
  }
  for (const d of data.mortality_logs) {
    events.push({
      id: `d-${d.id}`,
      type: "death",
      title: `Death recorded`,
      desc: `${d.cause_of_death}${d.category ? ` · ${d.category}` : ""}${d.notes ? ` — ${d.notes}` : ""}`,
      date: d.date_logged,
    });
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-5 w-5" />}
        title="No history"
        description="Treatments and mortality events for this pen will appear here."
      />
    );
  }

  return (
    <ol className="relative pl-5 border-l border-border space-y-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={`absolute -left-[27px] top-0.5 h-5 w-5 rounded-full grid place-items-center ${
              e.type === "death" ? "pill-alert" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {e.type === "death" ? <Skull className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
          </span>
          <div className="text-sm font-medium">{e.title}</div>
          <div className="text-xs text-muted-foreground">{e.desc}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5 tabular-nums">
            {fmtDate(e.date)} · {fmtRelative(e.date)}
          </div>
        </li>
      ))}
    </ol>
  );
}

function NotesPane({ data }: { data: PenDetailData }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<string>(data.pen.notes ?? "");
  useEffect(() => {
    setNotes(data.pen.notes ?? "");
  }, [data.pen.notes]);

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/pens/${data.pen.id}/notes`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens", data.pen.id] });
      toast({ title: "Notes saved" });
    },
  });

  const clean = useMutation({
    mutationFn: () => apiRequest("POST", `/api/pens/${data.pen.id}/clean`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens", data.pen.id] });
      toast({ title: `Pen ${data.pen.id} marked cleaned today` });
    },
  });

  return (
    <div className="space-y-5 max-w-xl">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-4 w-4" /> Pen notes
          </h3>
          <span className="text-[11px] text-muted-foreground">Visible to managers</span>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Repairs, biosecurity flags, observations…"
          rows={6}
          className="text-sm"
          data-testid="textarea-pen-notes"
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            data-testid="button-save-pen-notes"
          >
            {save.isPending ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-card-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Cleaning record</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Last cleaned:{" "}
              <span className="tabular-nums">
                {data.pen.last_cleaned_date
                  ? `${fmtDate(data.pen.last_cleaned_date)} (${fmtRelative(data.pen.last_cleaned_date)})`
                  : "Never logged"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => clean.mutate()}
              disabled={clean.isPending}
              data-testid="button-mark-cleaned-today"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Mark cleaned today
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  status = "neutral",
}: {
  label: string;
  value: string;
  status?: "good" | "warn" | "alert" | "neutral";
}) {
  return (
    <div
      className={`rounded-lg border border-card-border p-3 ${
        status === "alert" ? "bg-[hsl(0_70%_50%/0.05)]" : "bg-card"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div
        className={`font-mono font-semibold text-lg tabular-nums mt-1 leading-none ${
          status === "alert" ? "text-status-alert" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
