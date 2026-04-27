import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
  GitBranch,
  Pencil,
  ShoppingCart,
  Heart,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CategoryBadge, StatusBadge, EmptyState, ListSkeleton } from "./ui-bits";
import { ageString, ageDays, ageWeeks, fmtDate, fmtKg, fmtRelative } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pig, WeightLog, MedicalLog, LineageResponse } from "@shared/schema";

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
          <div className="flex items-center gap-1">
            <EditProfileButton pig={data} />
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" data-testid="button-detail-close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Source badge */}
        <div className="mt-2">
          <SourceBadge pig={data} />
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
              <TabsList className="w-full grid grid-cols-5" data-testid="tabs-detail">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="weights" data-testid="tab-weights">Weights</TabsTrigger>
                <TabsTrigger value="treatments" data-testid="tab-treatments">Treatments</TabsTrigger>
                <TabsTrigger value="lineage" data-testid="tab-lineage">Lineage</TabsTrigger>
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
              <TabsContent value="lineage">
                <LineageTab pigId={data.id} />
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

function SourceBadge({ pig }: { pig: PigDetailData }) {
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const byId = new Map(pigs.map((p) => [p.id, p] as const));
  const mother = pig.mother_id ? byId.get(pig.mother_id) : null;
  const father = pig.father_id ? byId.get(pig.father_id) : null;

  if (pig.source === "Purchased") {
    const ago = pig.purchase_date ? Math.floor((Date.now() - new Date(pig.purchase_date).getTime()) / (30 * 86400000)) : null;
    return (
      <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-xs" data-testid="source-badge-purchased">
        <ShoppingCart className="h-3 w-3" />
        <span className="font-medium">Purchased</span>
        {pig.purchase_price_usd != null && <span className="tabular-nums">${pig.purchase_price_usd}</span>}
        {pig.purchase_supplier && <span className="text-muted-foreground">· {pig.purchase_supplier}</span>}
        {ago != null && <span className="text-muted-foreground">· {ago}mo ago</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-xs" data-testid="source-badge-bred">
      <Heart className="h-3 w-3" />
      <span className="font-medium">Bred</span>
      {mother && (
        <span className="text-muted-foreground">· Mother: {mother.name ?? mother.tag_id} ({mother.tag_id})</span>
      )}
      {father && (
        <span className="text-muted-foreground">· Father: {father.name ?? father.tag_id} ({father.tag_id})</span>
      )}
    </span>
  );
}

function LineageTab({ pigId }: { pigId: string }) {
  const { data, isLoading } = useQuery<LineageResponse>({
    queryKey: ["/api/pigs", pigId, "lineage"],
    queryFn: async () => (await apiRequest("GET", `/api/pigs/${pigId}/lineage`)).json(),
  });
  if (isLoading || !data) return <ListSkeleton rows={4} />;
  const { parents, full_siblings, half_siblings, offspring, coefficient_of_inbreeding } = data;
  return (
    <div className="mt-2 space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">COI</span>
        <span className="font-mono tabular-nums font-semibold">{(coefficient_of_inbreeding * 100).toFixed(1)}%</span>
        <Link href={`/lineage/${pigId}`}>
          <a className="ml-auto text-xs text-primary hover:underline inline-flex items-center gap-1" data-testid="link-open-lineage">
            Open full tree <ExternalLink className="h-3 w-3" />
          </a>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ParentTile label="Mother" node={parents.mother} />
        <ParentTile label="Father" node={parents.father} />
      </div>
      <SiblingsRow title={`Full siblings · ${full_siblings.length}`} nodes={full_siblings} warn />
      <SiblingsRow title={`Half siblings · ${half_siblings.length}`} nodes={half_siblings} />
      <SiblingsRow title={`Offspring · ${offspring.length}`} nodes={offspring} />
    </div>
  );
}

function ParentTile({ label, node }: { label: string; node: any }) {
  if (!node) return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-xs text-muted-foreground italic">
      {label}: Unknown
    </div>
  );
  return (
    <Link href={`/lineage/${node.id}`}>
      <a className="rounded-lg border border-card-border bg-card p-3 hover:border-primary/50 transition block">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium text-sm truncate">{node.name ?? "unnamed"}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground font-mono">{node.tag_id}</div>
      </a>
    </Link>
  );
}

function SiblingsRow({ title, nodes, warn }: { title: string; nodes: any[]; warn?: boolean }) {
  if (nodes.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 ${warn ? "border-amber-500/30 bg-amber-500/5" : "border-card-border bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {nodes.map((n) => (
          <Link key={n.id} href={`/lineage/${n.id}`}>
            <a className="text-[11px] rounded border border-card-border bg-background hover:border-primary/40 px-2 py-0.5 inline-flex items-center gap-1">
              <span className="font-mono tabular-nums text-muted-foreground">{n.tag_id}</span>
              {n.name && <span>{n.name}</span>}
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EditProfileButton({ pig }: { pig: PigDetailData }) {
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const sows = pigs.filter((p) => p.sex === "F" && p.id !== pig.id);
  const boars = pigs.filter((p) => p.sex === "M" && p.id !== pig.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(pig.name ?? "");
  const [notes, setNotes] = useState(pig.notes ?? "");
  const [motherId, setMotherId] = useState(pig.mother_id ?? "");
  const [fatherId, setFatherId] = useState(pig.father_id ?? "");
  const { toast } = useToast();
  const update = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/pigs/${pig.id}`, {
      name: name || null,
      notes: notes || null,
      mother_id: motherId || null,
      father_id: fatherId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pigs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pigs", pig.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/pigs", pig.id, "lineage"] });
      toast({ title: "Profile updated" });
      setOpen(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Edit profile" data-testid="button-edit-profile">
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit profile · {pig.tag_id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daisy" data-testid="input-edit-name" />
          </div>
          <div>
            <Label>Mother</Label>
            <select className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm" value={motherId} onChange={(e) => setMotherId(e.target.value)} data-testid="select-edit-mother">
              <option value="">— Unknown —</option>
              {sows.map((p) => <option key={p.id} value={p.id}>{p.tag_id}{p.name ? ` · ${p.name}` : ""}</option>)}
            </select>
          </div>
          <div>
            <Label>Father</Label>
            <select className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm" value={fatherId} onChange={(e) => setFatherId(e.target.value)} data-testid="select-edit-father">
              <option value="">— Unknown —</option>
              {boars.map((p) => <option key={p.id} value={p.id}>{p.tag_id}{p.name ? ` · ${p.name}` : ""}</option>)}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} data-testid="textarea-edit-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending} data-testid="button-save-profile">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
