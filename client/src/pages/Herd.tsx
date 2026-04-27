import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  Plus,
  Search,
  Tag,
  Users,
  ChevronRight,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { CategoryBadge, StatusBadge, EmptyState, ListSkeleton } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ageString, fmtKg, fmtNum } from "@/lib/format";
import { PIG_CATEGORIES, PIG_STATUSES } from "@shared/schema";
import type { Pig, WeightLog } from "@shared/schema";
import { PigDetail } from "@/components/PigDetail";

export default function Herd() {
  const [location, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const detailId = params.id;

  const { data: pigs, isLoading } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const { data: weights = [] } = useQuery<WeightLog[]>({ queryKey: ["/api/weights"] });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("Active");
  const [pen, setPen] = useState<string>("all");

  // Latest weight per pig
  const latestWeight = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of weights) {
      if (!w.pig_id) continue;
      const cur = m.get(w.pig_id);
      if (!cur) m.set(w.pig_id, w.weight_kg);
      // weights are returned already desc by date, so first wins — but be safe:
    }
    // Re-derive properly with date order
    const byPig = new Map<string, WeightLog>();
    for (const w of weights) {
      if (!w.pig_id) continue;
      const cur = byPig.get(w.pig_id);
      if (!cur || w.date_logged > cur.date_logged) byPig.set(w.pig_id, w);
    }
    const out = new Map<string, number>();
    byPig.forEach((w, id) => out.set(id, w.weight_kg));
    return out;
  }, [weights]);

  const allPens = useMemo(() => {
    const set = new Set<number>();
    pigs?.forEach((p) => p.current_pen && set.add(p.current_pen));
    return Array.from(set).sort((a, b) => a - b);
  }, [pigs]);

  const filtered = useMemo(() => {
    return (pigs ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && p.category !== category) return false;
      if (pen !== "all" && String(p.current_pen) !== pen) return false;
      if (search && !p.tag_id.toLowerCase().includes(search.toLowerCase()) && !(p.breed ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [pigs, status, category, pen, search]);

  return (
    <>
      <PageHeader
        title="Herd Inventory"
        subtitle={`${pigs?.length ?? 0} total · ${pigs?.filter((p) => p.status === "Active").length ?? 0} active`}
        actions={
          <Button data-testid="button-add-pig">
            <Plus className="h-4 w-4 mr-1.5" /> Add pig
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1400px] mx-auto w-full">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag or breed…"
              className="pl-8"
              data-testid="input-herd-search"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]" data-testid="select-herd-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {PIG_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px]" data-testid="select-herd-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {PIG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pen} onValueChange={setPen}>
            <SelectTrigger className="w-[120px]" data-testid="select-herd-pen"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pens</SelectItem>
              {allPens.map((p) => <SelectItem key={p} value={String(p)}>Pen {p}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || category !== "all" || status !== "Active" || pen !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategory("all"); setStatus("Active"); setPen("all"); }} data-testid="button-clear-filters">
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Table-like list */}
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_100px_100px_40px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border bg-card-foreground/[0.02]">
            <div>Tag · Breed</div>
            <div>Category</div>
            <div>Status</div>
            <div>Latest weight</div>
            <div>Age</div>
            <div>Pen</div>
            <div></div>
          </div>
          {isLoading ? (
            <div className="p-4"><ListSkeleton rows={8} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No pigs match"
              description="Try clearing filters or adding a new pig."
              action={<Button onClick={() => { setSearch(""); setCategory("all"); setStatus("Active"); setPen("all"); }}>Clear filters</Button>}
            />
          ) : (
            <ul className="divide-y divide-card-border">
              {filtered.map((p) => {
                const lw = latestWeight.get(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setLocation(`/herd/${p.id}`)}
                      className="w-full text-left hover-elevate active-elevate-2 px-5 py-3 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_120px_120px_100px_100px_40px] gap-3 items-center"
                      data-testid={`row-pig-${p.tag_id}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm font-semibold tabular-nums">{p.tag_id}</span>
                          <span className="md:hidden ml-1"><CategoryBadge category={p.category} /></span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.breed ?? "—"}
                          <span className="md:hidden"> · {ageString(p.birth_date)} · pen {p.current_pen ?? "—"}</span>
                        </div>
                      </div>
                      <div className="hidden md:block"><CategoryBadge category={p.category} /></div>
                      <div className="hidden md:block"><StatusBadge status={p.status} /></div>
                      <div className="hidden md:block font-mono tabular-nums text-sm">
                        {lw ? fmtKg(lw) : <span className="text-muted-foreground">—</span>}
                      </div>
                      <div className="hidden md:block font-mono tabular-nums text-sm text-muted-foreground">{ageString(p.birth_date)}</div>
                      <div className="hidden md:block font-mono tabular-nums text-sm text-muted-foreground">{p.current_pen ?? "—"}</div>
                      <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                      {/* Mobile right column */}
                      <div className="md:hidden text-right">
                        <div className="font-mono tabular-nums text-sm font-medium">
                          {lw ? fmtKg(lw) : "—"}
                        </div>
                        <div className="mt-0.5"><StatusBadge status={p.status} /></div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">{fmtNum(filtered.length)} pigs shown</div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={(v) => !v && setLocation("/herd")}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto" data-testid="sheet-pig-detail">
          {detailId && <PigDetail id={detailId} onClose={() => setLocation("/herd")} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
