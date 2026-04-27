import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  DollarSign,
  Minus,
  Stethoscope,
  Wheat,
  Skull,
  Users,
  Scale,
  Baby,
  ClipboardList,
  Receipt,
  Package,
  Layers,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { MetricCard, StatusPill, KpiSkeleton } from "@/components/ui-bits";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ExpenseLogForm } from "@/components/LogForms";
import {
  fmtKg,
  fmtNum,
  fmtUsdZwl,
  fmtRelative,
  fmtUSD,
  fmtDateShort,
} from "@/lib/format";
import type { DashboardKpis, PigCategory } from "@shared/schema";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const ACTIVITY_ICONS: Record<string, JSX.Element> = {
  weight: <Scale className="h-3.5 w-3.5" />,
  treatment: <Stethoscope className="h-3.5 w-3.5" />,
  mortality: <Skull className="h-3.5 w-3.5" />,
  birth: <Baby className="h-3.5 w-3.5" />,
  sale: <DollarSign className="h-3.5 w-3.5" />,
  feed: <Wheat className="h-3.5 w-3.5" />,
};

export default function Dashboard() {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const { data: dash, isLoading } = useQuery<DashboardKpis>({ queryKey: ["/api/dashboard"] });
  const { data: activity = [] } = useQuery<any[]>({ queryKey: ["/api/activity"] });

  return (
    <>
      <PageHeader
        title={`${greeting()}, Samson`}
        subtitle={
          <span>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · Makina Family Piggery"}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-log-expense">
                  <Receipt className="h-4 w-4 mr-1.5" /> Log expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Log expense</DialogTitle>
                  <DialogDescription>Capture feed, meds, equipment, wages, or other costs.</DialogDescription>
                </DialogHeader>
                <ExpenseLogForm onDone={() => setExpenseOpen(false)} />
              </DialogContent>
            </Dialog>
            <Button asChild data-testid="button-quick-log">
              <Link href="/log">
                <ClipboardList className="h-4 w-4 mr-1.5" /> Quick log
              </Link>
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-5 md:space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Census banner if overdue */}
        {dash?.census_status === "overdue" && (
          <div
            className="rounded-xl border border-transparent pill-warn p-4 flex items-start gap-3"
            data-testid="banner-census-overdue"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Sunday Census overdue</div>
              <div className="text-xs mt-0.5 opacity-90">
                Manager must submit before next weekly report.
                {dash.last_census_date && ` Last submitted ${fmtRelative(dash.last_census_date)}.`}
              </div>
            </div>
            <Button asChild size="sm" variant="default" className="shrink-0" data-testid="button-census-link">
              <Link href="/census">
                Submit now <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* Pending payroll banner */}
        {dash?.pending_payroll && (
          <PendingPayrollBanner pending={dash.pending_payroll} zwlPerUsd={dash.zwl_per_usd} />
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
          {isLoading || !dash ? (
            <>
              <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
            </>
          ) : (
            <>
              <HeadcountCard data={dash} />
              <FeedCard data={dash} />
              <FcrCard data={dash} />
              <CashCard data={dash} />
              <MortalityCard data={dash} />
            </>
          )}
        </div>

        {/* Pen Health strip */}
        {dash && dash.pens_strip && dash.pens_strip.length > 0 && (
          <PenHealthStrip data={dash} />
        )}

        {/* Two-column layout: activity + side panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* Activity feed */}
          <section className="lg:col-span-2 rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Recent Activity</h2>
                <div className="text-xs text-muted-foreground mt-0.5">Last events across the farm</div>
              </div>
              <Button asChild variant="ghost" size="sm" data-testid="link-activity-all">
                <Link href="/herd">
                  View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <ul className="divide-y divide-card-border">
              {activity.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet.</li>
              )}
              {activity.slice(0, 14).map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-start gap-3 hover-elevate" data-testid={`activity-${a.id}`}>
                  <div
                    className={`mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center ${
                      a.type === "mortality" ? "pill-alert" :
                      a.type === "sale" ? "pill-good" :
                      a.type === "birth" ? "pill-good" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ACTIVITY_ICONS[a.type] ?? <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums shrink-0 mt-1">
                    {fmtRelative(a.timestamp)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right column */}
          <div className="space-y-4 md:space-y-5 min-w-0">
            <UpcomingTreatments data={dash} />
            <CensusStatusCard data={dash} />
          </div>
        </div>
      </div>
    </>
  );
}

function HeadcountCard({ data }: { data: DashboardKpis }) {
  const cats: PigCategory[] = ["Sow", "Boar", "Weaner", "Grower", "Finisher", "Piglet"];
  return (
    <MetricCard
      label="Total Headcount"
      value={fmtNum(data.headcount.total)}
      unit="head"
      icon={<Users className="h-4 w-4" />}
      sub={
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {cats.map((c) => {
            const n = data.headcount.by_category[c];
            return (
              <div
                key={c}
                className="rounded-md bg-muted/40 px-2 py-1.5 text-center"
                data-testid={`headcount-${c.toLowerCase()}`}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{c}</div>
                <div className="font-mono font-semibold text-sm tabular-nums">{n}</div>
              </div>
            );
          })}
        </div>
      }
      testId="card-headcount"
    />
  );
}

function FeedCard({ data }: { data: DashboardKpis }) {
  const days = data.feed.days_of_feed_left;
  const status: "good" | "warn" | "alert" = days <= 3 ? "alert" : days <= 7 ? "warn" : "good";
  const pct = Math.min(100, (days / 21) * 100);
  return (
    <MetricCard
      label="Feed Burn Rate"
      value={fmtNum(days)}
      unit={`day${days === 1 ? "" : "s"} left`}
      status={status}
      icon={<Wheat className="h-4 w-4" />}
      sub={
        <>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 mt-2">
            <span>{fmtKg(data.feed.stock_remaining_kg)} stock</span>
            <span>{fmtKg(data.feed.avg_daily_kg_7d)} / day</span>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className="text-[11px] text-muted-foreground mt-2">
            <span className="font-medium text-foreground">Refill: </span>
            {fmtUsdZwl(data.feed.refill_cost_usd, data.zwl_per_usd)}
          </div>
        </>
      }
      testId="card-feed"
    />
  );
}

function FcrCard({ data }: { data: DashboardKpis }) {
  const { current, target, score, sparkline } = data.fcr;
  return (
    <MetricCard
      label="Efficiency · FCR"
      value={current.toFixed(2)}
      unit={`vs ${target.toFixed(2)} target`}
      status={score === "green" ? "good" : score === "amber" ? "warn" : "alert"}
      icon={<Scale className="h-4 w-4" />}
      testId="card-fcr"
      sub={
        <div className="-mx-1 mt-2 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fcrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <ReferenceLine y={target} stroke="hsl(var(--accent))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="fcr"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#fcrFill)"
                isAnimationActive={false}
                dot={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "6px 8px",
                }}
                formatter={(v: number) => [v.toFixed(2), "FCR"]}
                labelFormatter={(l) => fmtDateShort(l as string)}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      }
    />
  );
}

function CashCard({ data }: { data: DashboardKpis }) {
  const cash = data.cash_position_30d;
  const status: "good" | "warn" | "alert" = cash > 0 ? "good" : cash > -200 ? "warn" : "alert";
  const icon = cash >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />;
  return (
    <MetricCard
      label="Cash · 30d"
      value={fmtUSD(cash)}
      unit="net"
      status={status}
      icon={<Wallet className="h-4 w-4" />}
      testId="card-cash"
      trend={
        <StatusPill status={status === "good" ? "good" : status === "warn" ? "warn" : "alert"}>
          {icon} <span className="ml-0.5">{cash >= 0 ? "surplus" : "deficit"}</span>
        </StatusPill>
      }
      sub={
        <div className="text-[11px] text-muted-foreground mt-2">
          <div className="tabular-nums">
            {fmtUsdZwl(cash, data.zwl_per_usd)}
          </div>
          <div className="mt-1">
            See <Link href="/budget" className="text-primary hover:underline">Budget</Link> for full breakdown.
          </div>
        </div>
      }
    />
  );
}

function PendingPayrollBanner({
  pending,
  zwlPerUsd,
}: {
  pending: { month: string; total_usd: number; employee_count: number };
  zwlPerUsd: number;
}) {
  const { toast } = useToast();
  const runMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/payroll/run", { month: pending.month });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Payroll paid", description: `${pending.month} · ${fmtUSD(pending.total_usd)}` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to run payroll", description: err?.message ?? "Try again", variant: "destructive" });
    },
  });
  // Format month label, e.g. "2026-04" -> "April 2026"
  const [y, m] = pending.month.split("-");
  const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <div
      className="rounded-xl border border-transparent pill-warn p-4 flex items-start gap-3"
      data-testid="banner-pending-payroll"
    >
      <Wallet className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">Payroll pending · {monthLabel}</div>
        <div className="text-xs mt-0.5 opacity-90 tabular-nums">
          {pending.employee_count} employee{pending.employee_count === 1 ? "" : "s"} ·{" "}
          {fmtUsdZwl(pending.total_usd, zwlPerUsd)} due
        </div>
      </div>
      <Button
        size="sm"
        variant="default"
        className="shrink-0"
        disabled={runMutation.isPending}
        onClick={() => runMutation.mutate()}
        data-testid="button-run-payroll"
      >
        {runMutation.isPending ? "Running…" : "Run now"}
        {!runMutation.isPending && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
      </Button>
    </div>
  );
}

function MortalityCard({ data }: { data: DashboardKpis }) {
  const trendIcon =
    data.mortality_trend_arrow === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> :
    data.mortality_trend_arrow === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> :
    <Minus className="h-3.5 w-3.5" />;
  const trendStatus =
    data.mortality_trend_arrow === "up" ? "alert" :
    data.mortality_trend_arrow === "down" ? "good" : "neutral";
  const status: "good" | "warn" | "alert" =
    data.mortality_rate_30d > 5 ? "alert" : data.mortality_rate_30d > 2 ? "warn" : "good";
  return (
    <MetricCard
      label="Mortality 30d"
      value={data.mortality_rate_30d.toFixed(2)}
      unit="%"
      status={status}
      icon={<Skull className="h-4 w-4" />}
      testId="card-mortality"
      trend={
        <StatusPill status={trendStatus as any}>
          {trendIcon} <span className="ml-0.5">{data.mortality_trend_arrow}</span>
        </StatusPill>
      }
      sub={
        <span>
          Industry healthy band: ≤ 3%. Click <Link href="/mortality" className="text-primary hover:underline">Mortality</Link> for breakdown.
        </span>
      }
    />
  );
}

function UpcomingTreatments({ data }: { data?: DashboardKpis }) {
  const items = data?.upcoming_treatments ?? [];
  const todayISO = new Date().toISOString().slice(0, 10);
  return (
    <section className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Upcoming Treatments</h2>
          <div className="text-xs text-muted-foreground mt-0.5">Next 7 days</div>
        </div>
        <Stethoscope className="h-4 w-4 text-muted-foreground" />
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Nothing scheduled.</div>
      ) : (
        <ul className="divide-y divide-card-border">
          {items.slice(0, 5).map((t) => {
            const overdue = t.next_due_date < todayISO;
            const isToday = t.next_due_date === todayISO;
            const dest = t.pen ? `/pens/${t.pen}` : "/medical";
            return (
              <li key={t.id} className="hover-elevate" data-testid={`upcoming-${t.id}`}>
                <Link href={dest} className="block px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.pen ? (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] rounded-md bg-primary/10 text-primary text-[10px] font-mono font-semibold tabular-nums px-1">
                            P{t.pen}
                          </span>
                        ) : null}
                        <span className="text-sm font-medium truncate">{t.product_name}</span>
                        {t.is_critical ? (
                          <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-status-alert/15 text-status-alert">!</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {t.treatment_type} · {t.target}
                      </div>
                    </div>
                    <div
                      className={`text-[11px] font-mono tabular-nums shrink-0 mt-0.5 ${
                        overdue ? "text-status-alert font-semibold" :
                        isToday ? "text-status-warn font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {overdue ? "Overdue" : isToday ? "Today" : fmtDateShort(t.next_due_date)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const HEALTH_FILL: Record<"green" | "amber" | "red", string> = {
  green: "bg-status-good text-white",
  amber: "bg-status-warn text-white",
  red: "bg-status-alert text-white",
};
const HEALTH_RING: Record<"green" | "amber" | "red", string> = {
  green: "ring-status-good/40",
  amber: "ring-status-warn/40",
  red: "ring-status-alert/40",
};

function PenHealthStrip({ data }: { data: DashboardKpis }) {
  const summary = data.pens_health_summary;
  const total = summary.green + summary.amber + summary.red;
  return (
    <section className="rounded-xl border border-card-border bg-card overflow-hidden" data-testid="section-pen-health">
      <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Pen Health
          </h2>
          <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            <span className="text-status-good font-medium">{summary.green} healthy</span>
            {summary.amber > 0 && <> · <span className="text-status-warn font-medium">{summary.amber} attention</span></>}
            {summary.red > 0 && <> · <span className="text-status-alert font-medium">{summary.red} critical</span></>}
            <> · {total} pens</>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" data-testid="link-pens-all">
          <Link href="/pens">
            All pens <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
      <ul className="px-5 py-4 grid grid-cols-7 gap-2 sm:gap-3">
        {data.pens_strip.map((p) => (
          <li key={p.id} className="min-w-0">
            <Link
              href={`/pens/${p.id}`}
              data-testid={`strip-pen-${p.id}`}
              aria-label={`Pen ${p.id} · ${p.role} · status ${p.health_status}`}
              className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover-elevate"
            >
              <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full grid place-items-center ring-4 ring-offset-1 ring-offset-card ${HEALTH_RING[p.health_status]} ${HEALTH_FILL[p.health_status]} transition-transform group-hover:scale-105`}>
                <span className="font-mono font-semibold text-sm tabular-nums">
                  {p.id}
                </span>
                {p.pending > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-foreground text-background text-[10px] font-mono font-semibold tabular-nums grid place-items-center px-1 ring-2 ring-card">
                    {p.pending}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground text-center truncate w-full">
                {p.role.split(" ")[0]}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CensusStatusCard({ data }: { data?: DashboardKpis }) {
  if (!data) return null;
  return (
    <section
      className={`rounded-xl border p-5 ${
        data.census_status === "overdue"
          ? "border-transparent pill-warn"
          : "border-card-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <CalendarCheck className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Sunday Census</div>
          <div className="text-xs mt-1 opacity-90">
            {data.census_status === "overdue" ? "Overdue" : "On schedule"}
            {data.last_census_date && ` · last ${fmtRelative(data.last_census_date)}`}
          </div>
          <Button asChild size="sm" variant={data.census_status === "overdue" ? "default" : "outline"} className="mt-3">
            <Link href="/census">
              {data.census_status === "overdue" ? "Submit now" : "View census"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
