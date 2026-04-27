import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wheat, Plus, TrendingDown, Package } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { MetricCard, EmptyState, ListSkeleton } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtKg, fmtUSD, fmtUsdZwl, fmtDate } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FeedLot, FeedLog, DashboardKpis } from "@shared/schema";
import { FEED_TYPES } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Feed() {
  const [tab, setTab] = useState("stock");
  const [stockOpen, setStockOpen] = useState(false);
  const { toast } = useToast();

  const { data: kpis } = useQuery<DashboardKpis>({ queryKey: ["/api/dashboard"] });
  const { data: lots = [], isLoading: lotsLoading } = useQuery<FeedLot[]>({ queryKey: ["/api/feed/lots"] });
  const { data: logs = [], isLoading: logsLoading } = useQuery<FeedLog[]>({ queryKey: ["/api/feed/logs"] });

  // Group lots by feed_type to compute stock
  const stockByType = useMemo(() => {
    const m: Record<string, { received_kg: number; cost_usd: number }> = {};
    for (const l of lots) {
      const kg = l.bags_received * (l.kg_per_bag ?? 50);
      m[l.feed_type] = m[l.feed_type] ?? { received_kg: 0, cost_usd: 0 };
      m[l.feed_type].received_kg += kg;
      m[l.feed_type].cost_usd += l.bags_received * l.cost_per_bag_usd;
    }
    const used: Record<string, number> = {};
    for (const log of logs) {
      used[log.feed_type] = (used[log.feed_type] ?? 0) + log.kg_used;
    }
    return FEED_TYPES.map((t) => ({
      type: t,
      received: m[t]?.received_kg ?? 0,
      used: used[t] ?? 0,
      remaining: (m[t]?.received_kg ?? 0) - (used[t] ?? 0),
      cost_usd: m[t]?.cost_usd ?? 0,
    }));
  }, [lots, logs]);

  // Daily consumption chart (last 14 days)
  const consumptionByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const log of logs) {
      const d = log.date_logged.slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + log.kg_used);
    }
    const out: { date: string; kg: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ date: iso.slice(5), kg: m.get(iso) ?? 0 });
    }
    return out;
  }, [logs]);

  return (
    <>
      <PageHeader
        title="Feed"
        subtitle={kpis ? `${fmtKg(kpis.feed.stock_remaining_kg)} on hand · ${kpis.feed.days_of_feed_left}d left` : "Loading…"}
        actions={
          <Button onClick={() => setStockOpen(true)} data-testid="button-receive-stock">
            <Plus className="h-4 w-4 mr-1.5" /> Receive stock
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1400px] mx-auto w-full">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <MetricCard
            label="Stock on hand"
            value={kpis ? Math.round(kpis.feed.stock_remaining_kg).toLocaleString() : "—"}
            unit="kg"
            sub={kpis ? `${kpis.feed.days_of_feed_left} days left at current rate` : undefined}
            status={kpis ? (kpis.feed.days_of_feed_left < 7 ? "warn" : kpis.feed.days_of_feed_left < 14 ? null : "good") : null}
            icon={<Package className="h-4 w-4" />}
            testId="metric-stock-on-hand"
          />
          <MetricCard
            label="Avg daily use"
            value={kpis ? Math.round(kpis.feed.avg_daily_kg_7d).toLocaleString() : "—"}
            unit="kg/day"
            sub="7-day average"
            icon={<TrendingDown className="h-4 w-4" />}
            testId="metric-avg-daily"
          />
          <MetricCard
            label="FCR (current)"
            value={kpis?.fcr.current ? kpis.fcr.current.toFixed(2) : "—"}
            sub={`Target ${kpis?.fcr.target.toFixed(2) ?? "—"}`}
            status={kpis?.fcr.score === "green" ? "good" : kpis?.fcr.score === "amber" ? "warn" : "alert"}
            icon={<Wheat className="h-4 w-4" />}
            testId="metric-fcr"
          />
          <MetricCard
            label="Refill cost"
            value={kpis ? fmtUSD(kpis.feed.refill_cost_usd) : "—"}
            sub={kpis ? `${fmtUSD(kpis.feed.refill_cost_usd)} · ZWL ${(kpis.feed.refill_cost_usd * (kpis.zwl_per_usd ?? 27)).toLocaleString()}` : undefined}
            icon={<Package className="h-4 w-4" />}
            testId="metric-refill"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="stock" data-testid="tab-stock">Stock by type</TabsTrigger>
            <TabsTrigger value="consumption" data-testid="tab-consumption">Consumption</TabsTrigger>
            <TabsTrigger value="lots" data-testid="tab-lots">Lots received</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stockByType.map((s) => {
                const pct = s.received > 0 ? Math.max(0, Math.min(100, (s.remaining / s.received) * 100)) : 0;
                return (
                  <div key={s.type} className="rounded-xl border border-card-border bg-card p-4" data-testid={`card-feed-${s.type.toLowerCase()}`}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="text-sm font-semibold">{s.type}</div>
                      <div className="font-mono tabular-nums text-sm">{fmtKg(Math.max(0, s.remaining))}</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${pct < 20 ? "bg-[hsl(var(--status-alert))]" : pct < 40 ? "bg-[hsl(var(--status-warn))]" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                      <span>Received {fmtKg(s.received)}</span>
                      <span>Used {fmtKg(s.used)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="consumption">
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="text-sm font-semibold mb-3">Daily consumption · last 14 days</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--card-border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-card-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border bg-card-foreground/[0.02]">Recent feed logs</div>
              {logsLoading ? <div className="p-4"><ListSkeleton /></div> :
                logs.length === 0 ? <EmptyState icon={<Wheat className="h-6 w-6" />} title="No feed logs yet" /> :
                <ul className="divide-y divide-card-border">
                  {logs.slice(0, 12).map((l) => (
                    <li key={l.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{l.feed_type} · {l.bags_opened} bag{l.bags_opened !== 1 && "s"}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtDate(l.date_logged)} {l.pen_or_category ? `· ${l.pen_or_category}` : ""}</div>
                      </div>
                      <div className="font-mono tabular-nums text-sm">{fmtKg(l.kg_used)}</div>
                    </li>
                  ))}
                </ul>
              }
            </div>
          </TabsContent>

          <TabsContent value="lots">
            <div className="rounded-xl border border-card-border bg-card overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_140px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-card-border bg-card-foreground/[0.02]">
                <div>Supplier · Date</div>
                <div>Type</div>
                <div>Bags</div>
                <div>Cost / bag</div>
                <div>Total cost</div>
              </div>
              {lotsLoading ? <div className="p-4"><ListSkeleton /></div> :
                lots.length === 0 ? <EmptyState icon={<Package className="h-6 w-6" />} title="No lots received" description="Click 'Receive stock' to record a delivery." /> :
                <ul className="divide-y divide-card-border">
                  {lots.map((l) => (
                    <li key={l.id} className="px-5 py-3 grid grid-cols-2 md:grid-cols-[1fr_120px_120px_120px_140px] gap-3 items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{l.supplier ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtDate(l.date_received)}</div>
                      </div>
                      <div className="text-sm">{l.feed_type}</div>
                      <div className="font-mono tabular-nums text-sm">{l.bags_received}</div>
                      <div className="font-mono tabular-nums text-sm text-muted-foreground">{fmtUSD(l.cost_per_bag_usd)}</div>
                      <div className="font-mono tabular-nums text-sm">{fmtUSD(l.bags_received * l.cost_per_bag_usd)}</div>
                    </li>
                  ))}
                </ul>
              }
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ReceiveStockSheet open={stockOpen} onOpenChange={setStockOpen} onSuccess={() => toast({ title: "Stock received" })} />
    </>
  );
}

function ReceiveStockSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [feedType, setFeedType] = useState<string>("Grower");
  const [bags, setBags] = useState("10");
  const [costPerBag, setCostPerBag] = useState("18.50");
  const [supplier, setSupplier] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/feed/lots", {
        feed_type: feedType,
        bags_received: Number(bags),
        kg_per_bag: 50,
        cost_per_bag_usd: Number(costPerBag),
        supplier: supplier || null,
        date_received: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      onSuccess();
      onOpenChange(false);
      setBags("10");
      setSupplier("");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" data-testid="sheet-receive-stock">
        <SheetHeader>
          <SheetTitle>Receive feed stock</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 mt-5"
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label>Feed type</Label>
            <Select value={feedType} onValueChange={setFeedType}>
              <SelectTrigger data-testid="select-feed-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEED_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bags (50kg)</Label>
              <Input type="number" min={1} value={bags} onChange={(e) => setBags(e.target.value)} data-testid="input-bags" />
            </div>
            <div className="space-y-1.5">
              <Label>Cost / bag (USD)</Label>
              <Input type="number" step="0.01" min={0} value={costPerBag} onChange={(e) => setCostPerBag(e.target.value)} data-testid="input-cost-per-bag" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="National Foods, etc." data-testid="input-supplier" />
          </div>
          <div className="flex items-baseline justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums font-semibold">{fmtUSD(Number(bags || 0) * Number(costPerBag || 0))}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} data-testid="button-submit-stock">
              {create.isPending ? "Saving…" : "Receive stock"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
