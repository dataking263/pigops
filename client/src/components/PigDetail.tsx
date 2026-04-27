import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Calendar,
  Tag,
  MapPin,
  ArrowLeftRight,
  Stethoscope,
  Scale,
  X,
  DollarSign,
  Skull,
  Activity,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CategoryBadge, StatusBadge, EmptyState, ListSkeleton } from "./ui-bits";
import { ageString, ageDays, ageWeeks, fmtDate, fmtKg, fmtRelative } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pig, WeightLog, MedicalLog } from "@shared/schema";

interface PigDetailData extends Pig {
  weights: WeightLog[];
  treatments: MedicalLog[];
}

export function PigDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<PigDetailData>({ queryKey: ["/api/pigs", id] });
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { toast } = useToast();

  const markDeceased = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/mortality", {
        pig_id: id,
        pen: data?.current_pen ? String(data.current_pen) : "—",
        category: data?.category,
        cause_of_death: "Unknown",
        date_logged: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pigs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mortality"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Marked deceased",
        description: `${data?.tag_id} has been recorded as deceased.`,
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              // Find and delete the most recent mortality for this pig
              const all = await fetch("/api/mortality").then((r) => r.json());
              const mine = all.find((m: any) => m.pig_id === id);
              if (mine) {
                await apiRequest("DELETE", `/api/mortality/${mine.id}`, undefined);
                queryClient.invalidateQueries();
                toast({ title: "Undone" });
              }
            }}
          >
            Undo
          </Button>
        ),
      });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={data.category} />
              <StatusBadge status={data.status} />
            </div>
            <h2 className="text-xl font-semibold font-mono tabular-nums" data-testid="text-pig-tag">{data.tag_id}</h2>
            <div className="text-sm text-muted-foreground mt-0.5">
              {data.breed ?? "—"} · {ageString(data.birth_date)} old
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" data-testid="button-detail-close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <Button variant="outline" size="sm" data-testid="button-action-weigh"><Scale className="h-3.5 w-3.5 mr-1.5"/> Weigh</Button>
          <Button variant="outline" size="sm" data-testid="button-action-treat"><Stethoscope className="h-3.5 w-3.5 mr-1.5"/> Treat</Button>
          <Button variant="outline" size="sm" data-testid="button-action-move"><ArrowLeftRight className="h-3.5 w-3.5 mr-1.5"/> Move pen</Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.status !== "Active" || markDeceased.isPending}
            onClick={() => markDeceased.mutate()}
            data-testid="button-action-deceased"
          >
            {markDeceased.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/> : <Skull className="h-3.5 w-3.5 mr-1.5"/>}
            Deceased
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0">
          {/* Metadata column */}
          <div className="border-b lg:border-b-0 lg:border-r border-border p-6 space-y-4 bg-muted/20">
            <Meta label="Tag ID" icon={<Tag className="h-3.5 w-3.5"/>} value={<span className="font-mono">{data.tag_id}</span>} />
            <Meta label="Breed" value={data.breed ?? "—"} />
            <Meta label="Birth date" icon={<Calendar className="h-3.5 w-3.5"/>} value={fmtDate(data.birth_date)} />
            <Meta label="Age" value={`${ageDays(data.birth_date) ?? 0} days · ${ageWeeks(data.birth_date) ?? 0} weeks`} />
            <Meta label="Pen" icon={<MapPin className="h-3.5 w-3.5"/>} value={`Pen ${data.current_pen ?? "—"}`} />
            <Meta label="Latest weight" value={data.weights[0] ? fmtKg(data.weights[0].weight_kg) : "—"} />
            <Meta label="Weight at weaning" value={data.weight_at_weaning_kg ? fmtKg(data.weight_at_weaning_kg) : "—"} />
            <SlaughterCountdown pig={data} />
          </div>

          {/* Right column: chart + tabs */}
          <div className="p-6 space-y-5">
            {data.weights.length >= 2 && (
              <WeightChart pig={data} curves={settings?.breed_standard_curves ? JSON.parse(settings.breed_standard_curves) : null} />
            )}

            <Tabs defaultValue="all">
              <TabsList className="w-full grid grid-cols-4" data-testid="tabs-detail">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="weights" data-testid="tab-weights">Weights</TabsTrigger>
                <TabsTrigger value="treatments" data-testid="tab-treatments">Treatments</TabsTrigger>
                <TabsTrigger value="movements" data-testid="tab-movements">Movements</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <Timeline pig={data} />
              </TabsContent>
              <TabsContent value="weights">
                <WeightList pig={data} />
              </TabsContent>
              <TabsContent value="treatments">
                <TreatmentList pig={data} />
              </TabsContent>
              <TabsContent value="movements">
                <EmptyState
                  icon={<ArrowLeftRight className="h-5 w-5" />}
                  title="No movements"
                  description="Pen transfers will appear here when logged."
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, icon, value }: { label: string; icon?: React.ReactNode; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
        {icon}{label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function SlaughterCountdown({ pig }: { pig: PigDetailData }) {
  if (!pig.birth_date) return null;
  const days = ageDays(pig.birth_date) ?? 0;
  const target = 168; // 24 weeks
  const remaining = target - days;
  if (pig.status !== "Active") return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Target market</div>
      <div className="font-mono font-semibold text-sm tabular-nums mt-0.5">
        {remaining > 0 ? `${remaining} days` : "Ready"}
      </div>
      <div className="text-[10px] text-muted-foreground">~24 weeks · 100 kg target</div>
    </div>
  );
}

function WeightChart({ pig, curves }: { pig: PigDetailData; curves: any }) {
  const data = useMemo(() => {
    const sorted = [...pig.weights].sort((a, b) => a.date_logged.localeCompare(b.date_logged));
    return sorted.map((w) => {
      const ageW = pig.birth_date
        ? Math.floor((new Date(w.date_logged).getTime() - new Date(pig.birth_date).getTime()) / (7 * 86400000))
        : null;
      // breed-standard target at this age
      let target: number | undefined;
      if (ageW !== null && curves) {
        if (ageW <= 8) target = (ageW / 8) * curves.weaner_target_kg_at_8w;
        else if (ageW <= 24)
          target =
            curves.weaner_target_kg_at_8w +
            ((curves.finisher_target_kg_at_24w - curves.weaner_target_kg_at_8w) * (ageW - 8)) / 16;
        else target = curves.finisher_target_kg_at_24w;
        if (target !== undefined) target = Number(target.toFixed(1));
      }
      return {
        date: w.date_logged,
        weight: w.weight_kg,
        target,
      };
    });
  }, [pig, curves]);

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp className="h-4 w-4"/> Weight trajectory</h3>
          <div className="text-xs text-muted-foreground">vs breed-standard target curve</div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              fontSize={10}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} unit="kg" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, key: string) => [`${v} kg`, key === "weight" ? "Actual" : "Target"]}
              labelFormatter={(l) => fmtDate(l as string)}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            <Line type="monotone" dataKey="target" name="Target" stroke="hsl(var(--accent))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="weight" name="Actual" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Timeline({ pig }: { pig: PigDetailData }) {
  const items = useMemo(() => {
    const arr: Array<{ id: string; type: string; title: string; desc: string; date: string; icon: React.ReactNode }> = [];
    for (const w of pig.weights) arr.push({
      id: `w-${w.id}`,
      type: "weight",
      title: "Weight recorded",
      desc: `${w.weight_kg} kg`,
      date: w.date_logged,
      icon: <Scale className="h-3.5 w-3.5" />,
    });
    for (const t of pig.treatments) arr.push({
      id: `t-${t.id}`,
      type: "treatment",
      title: t.treatment_type,
      desc: `${t.product_name}${t.dose ? ` · ${t.dose}` : ""}`,
      date: t.date_logged,
      icon: <Stethoscope className="h-3.5 w-3.5" />,
    });
    arr.push({
      id: "created",
      type: "created",
      title: "Record created",
      desc: `Tag ${pig.tag_id} added to herd`,
      date: pig.created_at,
      icon: <Activity className="h-3.5 w-3.5" />,
    });
    return arr.sort((a, b) => b.date.localeCompare(a.date));
  }, [pig]);

  if (items.length === 0) return <EmptyState icon={<Activity className="h-5 w-5"/>} title="No activity yet" />;

  return (
    <ol className="relative pl-5 border-l border-border space-y-4 mt-2">
      {items.map((it) => (
        <li key={it.id} className="relative" data-testid={`timeline-${it.id}`}>
          <span className="absolute -left-[27px] top-1 h-5 w-5 rounded-full bg-card border border-border grid place-items-center text-muted-foreground">
            {it.icon}
          </span>
          <div className="text-sm font-medium">{it.title}</div>
          <div className="text-xs text-muted-foreground">{it.desc}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
            {fmtDate(it.date)} · {fmtRelative(it.date)}
          </div>
        </li>
      ))}
    </ol>
  );
}

function WeightList({ pig }: { pig: PigDetailData }) {
  if (pig.weights.length === 0) return <EmptyState icon={<Scale className="h-5 w-5"/>} title="No weights logged" />;
  return (
    <ul className="divide-y divide-border mt-2">
      {pig.weights.map((w) => (
        <li key={w.id} className="py-2.5 flex items-center justify-between">
          <span className="text-sm">{fmtDate(w.date_logged)}</span>
          <span className="font-mono tabular-nums font-medium">{fmtKg(w.weight_kg)}</span>
        </li>
      ))}
    </ul>
  );
}

function TreatmentList({ pig }: { pig: PigDetailData }) {
  if (pig.treatments.length === 0) return <EmptyState icon={<Stethoscope className="h-5 w-5"/>} title="No treatments" />;
  return (
    <ul className="divide-y divide-border mt-2">
      {pig.treatments.map((t) => (
        <li key={t.id} className="py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t.product_name}</div>
              <div className="text-xs text-muted-foreground">{t.treatment_type}{t.dose ? ` · ${t.dose}` : ""}</div>
              {t.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{t.notes}"</div>}
            </div>
            <div className="text-xs tabular-nums text-muted-foreground shrink-0">{fmtDate(t.date_logged)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
