import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowRight, Tag, Scale } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CategoryBadge, EmptyState } from "@/components/ui-bits";
import { ageString, fmtKg } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pig, WeightLog } from "@shared/schema";
import { PigDetail } from "@/components/PigDetail";

const STAGES: { id: string; label: string; description: string }[] = [
  { id: "piglet", label: "Piglet", description: "0–4w · pre-weaning" },
  { id: "weaner", label: "Weaner", description: "4–10w · creep feed" },
  { id: "grower", label: "Grower", description: "10–18w · grower feed" },
  { id: "finisher", label: "Finisher", description: "18w+ · finisher feed" },
  { id: "ready", label: "Ready for market", description: "≥ 90 kg liveweight" },
  { id: "sold", label: "Sold", description: "Off the farm" },
];

const NEXT_CATEGORY: Record<string, string> = {
  Piglet: "Weaner",
  Weaner: "Grower",
  Grower: "Finisher",
};

export default function Pipeline() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const detailId = params.id;
  const { toast } = useToast();

  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const { data: weights = [] } = useQuery<WeightLog[]>({ queryKey: ["/api/weights"] });

  const latestWeight = useMemo(() => {
    const m = new Map<string, WeightLog>();
    for (const w of weights) {
      if (!w.pig_id) continue;
      const cur = m.get(w.pig_id);
      if (!cur || w.date_logged > cur.date_logged) m.set(w.pig_id, w);
    }
    const out = new Map<string, number>();
    m.forEach((w, id) => out.set(id, w.weight_kg));
    return out;
  }, [weights]);

  const advance = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      return apiRequest("PATCH", `/api/pigs/${id}`, { category: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pigs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({ title: "Stage advanced" });
    },
  });

  // Bucket pigs into stages
  const buckets = useMemo(() => {
    const map: Record<string, Pig[]> = { piglet: [], weaner: [], grower: [], finisher: [], ready: [], sold: [] };
    for (const p of pigs) {
      const lw = latestWeight.get(p.id);
      if (p.status === "Deceased" || p.status === "Transferred") continue;
      if (p.status === "Sold") { map.sold.push(p); continue; }
      if (lw && lw >= 90 && p.category !== "Sow" && p.category !== "Boar") {
        map.ready.push(p); continue;
      }
      if (p.category === "Piglet") map.piglet.push(p);
      else if (p.category === "Weaner") map.weaner.push(p);
      else if (p.category === "Grower") map.grower.push(p);
      else if (p.category === "Finisher") map.finisher.push(p);
    }
    return map;
  }, [pigs, latestWeight]);

  const stageList = STAGES.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Drag-free Kanban — tap a card to advance the stage"
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1600px] mx-auto w-full">
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
          {stageList.map((stage) => {
            const list = buckets[stage.id] ?? [];
            return (
              <div key={stage.id} className="shrink-0 w-[300px] snap-start" data-testid={`column-stage-${stage.id}`}>
                <div className="rounded-xl border border-card-border bg-card-foreground/[0.02] dark:bg-card-foreground/[0.04] p-3 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">{stage.label}</div>
                      <div className="text-[11px] text-muted-foreground">{stage.description}</div>
                    </div>
                    <div className="font-mono text-xs px-2 py-0.5 rounded-md bg-card border border-card-border tabular-nums" data-testid={`count-stage-${stage.id}`}>
                      {list.length}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100dvh-280px)] pr-1">
                    {list.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground/70 px-2 py-6 text-center border border-dashed border-card-border rounded-md">
                        No pigs in stage
                      </div>
                    ) : (
                      list.map((p) => {
                        const lw = latestWeight.get(p.id);
                        const next = NEXT_CATEGORY[p.category];
                        return (
                          <div
                            key={p.id}
                            className="rounded-lg border border-card-border bg-card p-3 hover-elevate cursor-pointer group"
                            onClick={() => setLocation(`/pipeline/${p.id}`)}
                            data-testid={`card-pig-${p.tag_id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs font-semibold tabular-nums truncate">{p.tag_id}</span>
                              </div>
                              <CategoryBadge category={p.category} />
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mb-2">{p.breed ?? "—"} · pen {p.current_pen ?? "—"}</div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                                <Scale className="h-3 w-3" />
                                {lw ? fmtKg(lw) : "—"}
                                <span className="mx-1">·</span>
                                {ageString(p.birth_date)}
                              </div>
                              {next && stage.id !== "ready" && stage.id !== "sold" && (
                                <button
                                  className="opacity-0 group-hover:opacity-100 transition text-[10px] font-medium text-primary inline-flex items-center gap-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    advance.mutate({ id: p.id, next });
                                  }}
                                  data-testid={`button-advance-${p.tag_id}`}
                                >
                                  Advance <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {pigs.length === 0 && (
          <div className="mt-4">
            <EmptyState icon={<Tag className="h-6 w-6" />} title="No pigs yet" description="Add a pig from the Herd page to populate the pipeline." />
          </div>
        )}
      </div>

      <Sheet open={!!detailId} onOpenChange={(v) => !v && setLocation("/pipeline")}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto" data-testid="sheet-pipeline-pig-detail">
          {detailId && <PigDetail id={detailId} onClose={() => setLocation("/pipeline")} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
