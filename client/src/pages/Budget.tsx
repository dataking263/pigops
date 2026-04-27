import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Users as UsersIcon,
  Plus,
  Trash2,
  Play,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { MetricCard, EmptyState, StatusPill } from "@/components/ui-bits";
import { fmtUSD, fmtZWL, fmtDate } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Expense, Income, PayrollRun, Settings } from "@shared/schema";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@shared/schema";

interface BudgetSummary {
  month: string;
  income_this_month: number;
  expenses_this_month: number;
  net_this_month: number;
  income_prev_month: number;
  expenses_prev_month: number;
  net_prev_month: number;
  ytd_income: number;
  ytd_expenses: number;
  ytd_net: number;
  expense_breakdown: Record<string, number>;
  top_expenses: Expense[];
}

interface BudgetTrendPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface CostPerKg {
  total_expenses_usd: number;
  total_kg_lw: number;
  cost_per_kg_usd: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Feed: "hsl(150 50% 45%)",
  Medication: "hsl(190 60% 45%)",
  Equipment: "hsl(38 80% 55%)",
  "Pig Purchase": "hsl(280 50% 55%)",
  Wages: "hsl(220 60% 55%)",
  Utilities: "hsl(20 50% 50%)",
  Veterinary: "hsl(0 60% 55%)",
  Transport: "hsl(50 70% 50%)",
  Other: "hsl(220 5% 50%)",
};

export default function Budget() {
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const rate = settings?.zwl_per_usd ?? 27;

  const { data: summary, isLoading: sumLoad } = useQuery<BudgetSummary>({
    queryKey: ["/api/budget/summary"],
  });
  const { data: trend = [], isLoading: trendLoad } = useQuery<BudgetTrendPoint[]>({
    queryKey: ["/api/budget/trend", { months: 12 }],
    queryFn: async () => (await apiRequest("GET", "/api/budget/trend?months=12")).json(),
  });
  const { data: cpk } = useQuery<CostPerKg>({ queryKey: ["/api/budget/cost-per-kg"] });

  return (
    <>
      <PageHeader title="Budget" subtitle="Income, expenses, payroll & cost analysis" />
      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 max-w-[1400px] mx-auto w-full space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            label="Income · this month"
            value={sumLoad ? "—" : fmtUSD(summary?.income_this_month ?? 0)}
            sub={summary && (
              <span className="text-muted-foreground text-[10px]">{fmtZWL((summary.income_this_month ?? 0) * rate)}</span>
            )}
            icon={<TrendingUp className="h-4 w-4" />}
            testId="kpi-income-month"
          />
          <MetricCard
            label="Expenses · this month"
            value={sumLoad ? "—" : fmtUSD(summary?.expenses_this_month ?? 0)}
            sub={summary && (
              <span className="text-muted-foreground text-[10px]">{fmtZWL((summary.expenses_this_month ?? 0) * rate)}</span>
            )}
            icon={<TrendingDown className="h-4 w-4" />}
            testId="kpi-expenses-month"
          />
          <MetricCard
            label="Net · this month"
            value={sumLoad ? "—" : fmtUSD(summary?.net_this_month ?? 0)}
            status={(summary?.net_this_month ?? 0) >= 0 ? "good" : "alert"}
            testId="kpi-net-month"
          />
          <MetricCard
            label="YTD net"
            value={sumLoad ? "—" : fmtUSD(summary?.ytd_net ?? 0)}
            sub={summary && (
              <span className="text-muted-foreground text-[10px] tabular-nums">
                Inc {fmtUSD(summary.ytd_income)} · Exp {fmtUSD(summary.ytd_expenses)}
              </span>
            )}
            testId="kpi-ytd-net"
          />
        </div>

        {/* Cost per kg */}
        {cpk && (
          <div className="rounded-xl border border-card-border bg-card p-4 md:p-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost per kg liveweight (90d)</div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                ${cpk.cost_per_kg_usd.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">/ kg LW</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Based on {fmtUSD(cpk.total_expenses_usd)} expenses ÷ {cpk.total_kg_lw.toFixed(0)} kg gained or sold.
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-flex">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income" data-testid="tab-income">Income</TabsTrigger>
            <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-5">
            <TrendChart points={trend} loading={trendLoad} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ExpenseDonut breakdown={summary?.expense_breakdown ?? {}} loading={sumLoad} />
              <TopExpenses items={summary?.top_expenses ?? []} loading={sumLoad} />
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ExpensesTab rate={rate} />
          </TabsContent>

          <TabsContent value="income" className="mt-4">
            <IncomeTab rate={rate} />
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <PayrollTab rate={rate} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function TrendChart({ points, loading }: { points: BudgetTrendPoint[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-56 w-full rounded-xl" />;
  if (points.length === 0) {
    return (
      <EmptyState icon={<Wallet className="h-5 w-5" />} title="No trend data" description="Add income or expenses to see the 12-month trend." />
    );
  }
  const max = Math.max(...points.map((p) => Math.max(p.income, p.expenses)), 1);
  return (
    <div className="rounded-xl border border-card-border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Income vs expenses · 12 months</h3>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Income</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-400/80" /> Expenses</span>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-1.5 h-44" data-testid="trend-chart">
        {points.map((p) => {
          const incH = (p.income / max) * 100;
          const expH = (p.expenses / max) * 100;
          return (
            <div key={p.month} className="h-full flex flex-col items-center gap-1 min-w-0">
              <div className="flex-1 w-full flex items-end gap-0.5 min-h-0">
                <div
                  className="flex-1 bg-emerald-500/80 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(2, incH)}%` }}
                  title={`Income ${fmtUSD(p.income)}`}
                />
                <div
                  className="flex-1 bg-red-400/80 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(2, expH)}%` }}
                  title={`Expenses ${fmtUSD(p.expenses)}`}
                />
              </div>
              <div className="text-[9px] uppercase tabular-nums text-muted-foreground/70 leading-none">
                {p.month.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpenseDonut({ breakdown, loading }: { breakdown: Record<string, number>; loading: boolean }) {
  if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Expense breakdown</h3>
        <p className="text-sm text-muted-foreground italic">No expenses logged this month.</p>
      </div>
    );
  }
  let startAngle = 0;
  const arcs = entries.map(([cat, v]) => {
    const angle = (v / total) * 360;
    const segment = { cat, angle, start: startAngle, color: CATEGORY_COLORS[cat] ?? "hsl(220 5% 50%)", value: v };
    startAngle += angle;
    return segment;
  });
  // Build conic-gradient
  let cum = 0;
  const stops = arcs.map((a) => {
    const from = cum;
    cum += a.angle;
    return `${a.color} ${from}deg ${cum}deg`;
  }).join(", ");

  return (
    <div className="rounded-xl border border-card-border bg-card p-5" data-testid="expense-donut">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Expense breakdown · this month</h3>
      <div className="flex items-center gap-5 flex-wrap">
        <div
          className="h-36 w-36 rounded-full shrink-0 grid place-items-center"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="h-20 w-20 rounded-full bg-card grid place-items-center">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              <div className="font-mono font-semibold tabular-nums">{fmtUSD(total)}</div>
            </div>
          </div>
        </div>
        <ul className="space-y-1 flex-1 min-w-0">
          {arcs.map((a) => (
            <li key={a.cat} className="flex items-center gap-2 text-xs min-w-0">
              <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: a.color }} />
              <span className="flex-1 truncate">{a.cat}</span>
              <span className="font-mono tabular-nums shrink-0">{fmtUSD(a.value)}</span>
              <span className="text-muted-foreground tabular-nums w-10 text-right shrink-0">{((a.value / total) * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TopExpenses({ items, loading }: { items: Expense[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;
  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Top expenses · this month</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No expenses logged this month.</p>
      ) : (
        <ul className="divide-y divide-card-border">
          {items.map((e) => (
            <li key={e.id} className="py-2 flex items-start gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.description}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {fmtDate(e.date)} · {e.category}{e.vendor ? ` · ${e.vendor}` : ""}
                </div>
              </div>
              <div className="font-mono tabular-nums shrink-0">{fmtUSD(e.amount_usd)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpensesTab({ rate }: { rate: number }) {
  const { toast } = useToast();
  const { data: list = [], isLoading } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Feed", description: "", amount_usd: "", vendor: "" });

  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/expenses", { ...form, amount_usd: Number(form.amount_usd) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/trend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Expense logged" });
      setOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Feed", description: "", amount_usd: "", vendor: "" });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/trend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const sorted = useMemo(() => [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100), [list]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground tabular-nums">{list.length} entries</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-expense">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-expense-date" />
              </div>
              <div>
                <Label>Category</Label>
                <select className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm"
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="select-expense-category">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-expense-description" />
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" value={form.amount_usd} onChange={(e) => setForm({ ...form, amount_usd: e.target.value })} data-testid="input-expense-amount" />
              </div>
              <div>
                <Label>Vendor (optional)</Label>
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} data-testid="input-expense-vendor" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!form.description || !form.amount_usd || create.isPending} data-testid="button-save-expense">
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No expenses yet.</div>
        ) : (
          <ul className="divide-y divide-card-border">
            {sorted.map((e) => (
              <li key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-sm" data-testid={`row-expense-${e.id}`}>
                <span className="text-[10px] tabular-nums text-muted-foreground w-20 shrink-0">{e.date}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 w-24 text-center">{e.category}</span>
                <span className="flex-1 min-w-0 truncate">{e.description}</span>
                <span className="font-mono tabular-nums shrink-0 text-right w-24">
                  <div>{fmtUSD(e.amount_usd)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtZWL(e.amount_usd * rate)}</div>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => del.mutate(e.id)} data-testid={`button-delete-expense-${e.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function IncomeTab({ rate }: { rate: number }) {
  const { toast } = useToast();
  const { data: list = [], isLoading } = useQuery<Income[]>({ queryKey: ["/api/income"] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Pig Sale", description: "", amount_usd: "" });
  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income", { ...form, amount_usd: Number(form.amount_usd) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/trend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Income logged" });
      setOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Pig Sale", description: "", amount_usd: "" });
    },
  });
  const sorted = useMemo(() => [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100), [list]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground tabular-nums">{list.length} entries</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-income">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log income</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <select className="w-full mt-1 rounded-md bg-background border border-input px-2 py-1.5 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" value={form.amount_usd} onChange={(e) => setForm({ ...form, amount_usd: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!form.description || !form.amount_usd || create.isPending}>
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-3 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No income recorded.</div>
        ) : (
          <ul className="divide-y divide-card-border">
            {sorted.map((e) => (
              <li key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-[10px] tabular-nums text-muted-foreground w-20 shrink-0">{e.date}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0 w-24 text-center">{e.category}</span>
                <span className="flex-1 min-w-0 truncate">{e.description}</span>
                <span className="font-mono tabular-nums shrink-0 text-right w-24">
                  <div className="text-emerald-600 dark:text-emerald-400">+{fmtUSD(e.amount_usd)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtZWL(e.amount_usd * rate)}</div>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PayrollTab({ rate }: { rate: number }) {
  const { toast } = useToast();
  const { data: runs = [], isLoading } = useQuery<PayrollRun[]>({ queryKey: ["/api/payroll"] });
  const sorted = useMemo(() => [...runs].sort((a, b) => b.month.localeCompare(a.month)), [runs]);

  const run = useMutation({
    mutationFn: (month: string) => apiRequest("POST", "/api/payroll/run", { month }),
    onSuccess: async (res) => {
      const json = await res.json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget/trend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: json.alreadyDone ? "Payroll already run" : "Payroll posted",
        description: json.alreadyDone
          ? "This month was already paid; nothing changed."
          : `${json.expenses?.length ?? 0} wage expenses created.`,
      });
    },
  });

  const pendingMonth = sorted.find((r) => r.status === "pending")?.month;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground tabular-nums">{runs.length} payroll runs</div>
        {pendingMonth && (
          <Button size="sm" onClick={() => run.mutate(pendingMonth)} disabled={run.isPending} data-testid="button-run-payroll">
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {run.isPending ? "Posting…" : `Run payroll for ${pendingMonth}`}
          </Button>
        )}
      </div>
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No payroll runs yet.</div>
        ) : (
          <ul className="divide-y divide-card-border">
            {sorted.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm" data-testid={`row-payroll-${r.month}`}>
                <UsersIcon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                <span className="font-medium tabular-nums w-20 shrink-0">{r.month}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">Run: {r.run_date}</span>
                <span className="flex-1" />
                <span className="font-mono tabular-nums shrink-0 text-right w-28">
                  <div>{fmtUSD(r.total_usd)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtZWL(r.total_usd * rate)}</div>
                </span>
                <StatusPill status={r.status === "paid" ? "good" : "warn"}>{r.status}</StatusPill>
                {r.status === "pending" && (
                  <Button variant="outline" size="sm" onClick={() => run.mutate(r.month)} disabled={run.isPending} data-testid={`button-run-payroll-${r.month}`}>
                    <Play className="h-3 w-3 mr-1" /> Run
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
