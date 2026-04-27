import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  GitBranch,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusPill } from "@/components/ui-bits";
import { apiRequest } from "@/lib/queryClient";
import type { Pig, LineageResponse, BreedingCheck, LineageNode } from "@shared/schema";

function SexIcon({ sex, size = "sm" }: { sex: "M" | "F" | string; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  if (sex === "F") {
    return (
      <span
        aria-label="female"
        className={`${cls} inline-flex items-center justify-center text-pink-500/90 shrink-0 font-semibold text-[11px] leading-none`}
      >
        ♀
      </span>
    );
  }
  return (
    <span
      aria-label="male"
      className={`${cls} inline-flex items-center justify-center text-blue-500/90 shrink-0 font-semibold text-[11px] leading-none`}
    >
      ♂
    </span>
  );
}

export default function Lineage() {
  const [, navigate] = useLocation();
  const [matchDetail, params] = useRoute<{ id: string }>("/lineage/:id");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // breeding check selectors
  const [femaleId, setFemaleId] = useState<string>("");
  const [maleId, setMaleId] = useState<string>("");
  const [breedingResult, setBreedingResult] = useState<BreedingCheck | null>(null);
  const [breedingLoading, setBreedingLoading] = useState(false);

  const { data: pigs = [], isLoading: pigsLoading } = useQuery<Pig[]>({
    queryKey: ["/api/pigs"],
  });

  useEffect(() => {
    if (matchDetail && params?.id) setSelectedId(params.id);
  }, [matchDetail, params?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pigs.slice(0, 50);
    return pigs.filter((p) => {
      const t = (p.tag_id ?? "").toLowerCase();
      const n = (p.name ?? "").toLowerCase();
      return t.includes(q) || n.includes(q);
    }).slice(0, 50);
  }, [pigs, search]);

  const sows = useMemo(() => pigs.filter((p) => p.sex === "F" && p.status === "Active"), [pigs]);
  const boars = useMemo(() => pigs.filter((p) => p.sex === "M" && p.status === "Active"), [pigs]);

  async function runBreedingCheck() {
    if (!femaleId || !maleId) return;
    setBreedingLoading(true);
    setBreedingResult(null);
    try {
      const res = await apiRequest("POST", "/api/breeding/check", { female_id: femaleId, male_id: maleId });
      const data = await res.json();
      setBreedingResult(data);
    } finally {
      setBreedingLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Lineage"
        subtitle="Family tree explorer & breeding-pair checker"
      />
      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Pig search list */}
        <aside className="space-y-3 min-w-0" data-testid="lineage-search">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tag or name…"
              className="pl-8"
              data-testid="input-pig-search"
            />
          </div>
          <div className="rounded-xl border border-card-border bg-card max-h-[60vh] overflow-y-auto divide-y divide-card-border">
            {pigsLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center">No pigs match.</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelectedId(p.id); navigate(`/lineage/${p.id}`); }}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/40 transition flex items-center gap-2 min-w-0 ${selectedId === p.id ? "bg-muted/60" : ""}`}
                  data-testid={`button-select-pig-${p.tag_id}`}
                >
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{p.tag_id}</span>
                  <span className="flex-1 min-w-0 truncate text-sm">
                    {p.name ? <span className="font-medium">{p.name}</span> : <span className="text-muted-foreground italic">unnamed</span>}
                  </span>
                  <SexIcon sex={p.sex} />
                </button>
              ))
            )}
          </div>

          {/* Breeding check */}
          <div className="rounded-xl border border-card-border bg-card p-4 space-y-3" data-testid="breeding-check-panel">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500/80" />
              <h3 className="text-sm font-semibold tracking-tight">Breeding-pair check</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pick a female and a male to verify they aren't closely related before breeding.
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Female (sow / gilt)</label>
                <select
                  value={femaleId}
                  onChange={(e) => setFemaleId(e.target.value)}
                  className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm"
                  data-testid="select-breeding-female"
                >
                  <option value="">Select…</option>
                  {sows.map((p) => (
                    <option key={p.id} value={p.id}>{p.tag_id}{p.name ? ` · ${p.name}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Male (boar)</label>
                <select
                  value={maleId}
                  onChange={(e) => setMaleId(e.target.value)}
                  className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm"
                  data-testid="select-breeding-male"
                >
                  <option value="">Select…</option>
                  {boars.map((p) => (
                    <option key={p.id} value={p.id}>{p.tag_id}{p.name ? ` · ${p.name}` : ""}</option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!femaleId || !maleId || breedingLoading}
                onClick={runBreedingCheck}
                data-testid="button-run-breeding-check"
              >
                {breedingLoading ? "Checking…" : "Check pair"}
              </Button>
            </div>
            {breedingResult && (
              <div
                className={`rounded-md p-3 text-xs space-y-1 ${
                  breedingResult.severity === "block"
                    ? "bg-red-500/10 border border-red-500/30"
                    : breedingResult.severity === "warn"
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                }`}
                data-testid={`breeding-result-${breedingResult.severity}`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {breedingResult.severity === "block" ? <ShieldAlert className="h-3.5 w-3.5" /> :
                    breedingResult.severity === "warn" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                      <ShieldCheck className="h-3.5 w-3.5" />}
                  {breedingResult.severity === "block" ? "BLOCKED" : breedingResult.severity === "warn" ? "WARNING" : "OK"}
                </div>
                <div className="text-foreground/80">{breedingResult.reason}</div>
                <div className="text-muted-foreground tabular-nums">COI ≈ {(breedingResult.coefficient * 100).toFixed(1)}%</div>
              </div>
            )}
          </div>
        </aside>

        {/* Tree explorer */}
        <section className="min-w-0">
          {!selectedId ? (
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="Pick a pig to view its lineage"
              description="Search by tag ID (e.g. S-001) or name (e.g. Daisy) on the left."
            />
          ) : (
            <LineageView pigId={selectedId} onSelect={(pid) => { setSelectedId(pid); navigate(`/lineage/${pid}`); }} />
          )}
        </section>
      </div>
    </>
  );
}

function LineageView({ pigId, onSelect }: { pigId: string; onSelect: (id: string) => void }) {
  const { data, isLoading } = useQuery<LineageResponse>({
    queryKey: ["/api/pigs", pigId, "lineage"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pigs/${pigId}/lineage`);
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const { pig, parents, grandparents, full_siblings, half_siblings, offspring, coefficient_of_inbreeding } = data;

  return (
    <div className="space-y-5" data-testid={`lineage-view-${pig.tag_id}`}>
      {/* Header */}
      <div className="rounded-xl border border-card-border bg-card p-4 md:p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Selected pig</div>
          <h2 className="text-xl font-semibold tracking-tight">
            {pig.name ?? <span className="text-muted-foreground italic">Unnamed</span>}
            <span className="ml-2 text-sm font-mono font-medium text-muted-foreground">{pig.tag_id}</span>
          </h2>
          <div className="text-xs text-muted-foreground mt-1">
            {pig.category} · {pig.sex === "F" ? "Female" : "Male"} · {pig.source}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={coefficient_of_inbreeding === 0 ? "good" : coefficient_of_inbreeding < 0.0625 ? "warn" : "alert"}>
            COI {(coefficient_of_inbreeding * 100).toFixed(1)}%
          </StatusPill>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Inbreeding coefficient</span>
        </div>
      </div>

      {/* Tree: 3 generations stacked */}
      <div className="rounded-xl border border-card-border bg-card p-4 md:p-6 space-y-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Ancestors</h3>

        {/* Grandparents row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PersonCard label="Maternal grandmother" node={grandparents.maternal_grandmother} onSelect={onSelect} />
          <PersonCard label="Maternal grandfather" node={grandparents.maternal_grandfather} onSelect={onSelect} />
          <PersonCard label="Paternal grandmother" node={grandparents.paternal_grandmother} onSelect={onSelect} />
          <PersonCard label="Paternal grandfather" node={grandparents.paternal_grandfather} onSelect={onSelect} />
        </div>

        {/* Connector */}
        <div className="flex justify-center">
          <div className="h-5 border-l-2 border-dashed border-muted-foreground/30" />
        </div>

        {/* Parents row */}
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          <PersonCard label="Mother" node={parents.mother} onSelect={onSelect} highlight />
          <PersonCard label="Father" node={parents.father} onSelect={onSelect} highlight />
        </div>

        <div className="flex justify-center">
          <div className="h-5 border-l-2 border-dashed border-muted-foreground/30" />
        </div>

        {/* Self */}
        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          <PersonCard label="This pig" node={pig} onSelect={() => {}} self />
        </div>
      </div>

      {/* Siblings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SiblingPanel title={`Full siblings (${full_siblings.length})`} nodes={full_siblings} severity="warn" onSelect={onSelect} />
        <SiblingPanel title={`Half siblings (${half_siblings.length})`} nodes={half_siblings} severity="muted" onSelect={onSelect} />
      </div>

      {/* Offspring */}
      <div className="rounded-xl border border-card-border bg-card p-4 md:p-5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Offspring ({offspring.length})</h3>
        {offspring.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No offspring recorded.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {offspring.map((o) => <NodeChip key={o.id} node={o} onSelect={onSelect} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonCard({
  label, node, onSelect, highlight, self,
}: {
  label: string;
  node: LineageNode | null;
  onSelect: (id: string) => void;
  highlight?: boolean;
  self?: boolean;
}) {
  if (!node) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-center min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
        <div className="text-xs text-muted-foreground/60 italic mt-1">Unknown</div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => !self && onSelect(node.id)}
      disabled={self}
      className={`text-left rounded-lg p-3 border transition min-w-0 ${
        self
          ? "bg-primary/10 border-primary"
          : highlight
            ? "bg-card border-card-border hover:border-primary/50"
            : "bg-card border-card-border hover:border-primary/40"
      }`}
      data-testid={`person-${node.tag_id}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
      <div className="flex items-center gap-1.5 mt-1 min-w-0">
        <SexIcon sex={node.sex} size="xs" />
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">{node.tag_id}</span>
      </div>
      <div className="font-medium text-sm truncate mt-0.5">
        {node.name ?? <span className="text-muted-foreground italic">unnamed</span>}
      </div>
    </button>
  );
}

function SiblingPanel({ title, nodes, severity, onSelect }: { title: string; nodes: LineageNode[]; severity: "warn" | "muted"; onSelect: (id: string) => void }) {
  return (
    <div className={`rounded-xl border p-4 md:p-5 ${severity === "warn" && nodes.length > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-card-border bg-card"}`}>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {nodes.map((n) => <NodeChip key={n.id} node={n} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

function NodeChip({ node, onSelect }: { node: LineageNode; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="text-left rounded-md border border-card-border bg-background hover:border-primary/40 px-2 py-1.5 min-w-0 transition"
      data-testid={`chip-${node.tag_id}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <SexIcon sex={node.sex} size="xs" />
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">{node.tag_id}</span>
      </div>
      <div className="text-xs truncate font-medium mt-0.5">
        {node.name ?? <span className="text-muted-foreground italic">unnamed</span>}
      </div>
    </button>
  );
}
