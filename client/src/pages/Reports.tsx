import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, DollarSign, TrendingDown, Activity, Baby } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv } from "@/lib/csv";
import { apiRequest } from "@/lib/queryClient";
import { fmtUSD, fmtKg } from "@/lib/format";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine, Legend } from "recharts";

interface ReportData {
  range_days: number;
  fcr_trend: { month: string; fcr: number; feed_kg: number; gain_kg: number }[];
  mortality_by_cause: Record<string, number>;
  mortality_by_pen: Record<string, number>;
  sales_trend: { month: string; revenue: number; count: number; kg: number }[];
  cost_per_kg_lw_usd: number;
  psy: number;
  total_revenue: number;
  total_sold_kg: number;
}

const CAUSE_COLORS: Record<string, string> = {
  Disease: "hsl(var(--status-alert))",
  Crushing: "hsl(var(--status-warn))",
  Stillborn: "hsl(14 50% 60%)",
  Unknown: "hsl(var(--muted-foreground))",
  Predator: "hsl(25 60% 45%)",
  Other: "hsl(200 30% 50%)",
};

export default function Reports() {
  const [range, setRange] = useState("90");
  const [tab, setTab] = useState("fcr");

  const { data: report } = useQuery<ReportData>({
    queryKey: ["/api/reports", range],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports?range_days=${range}`);
      return res.json();
    },
  });

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Operational and financial performance · CSV export per report"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]" data-testid="select-report-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[1400px] mx-auto w-full">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiBlock
            icon={<DollarSign className="h-4 w-4" />}
            label="Revenue"
            value={report ? fmtUSD(report.total_revenue) : "—"}
            sub={report ? `${report.sales_trend.reduce((a, s) => a + s.count, 0)} pigs sold` : ""}
            testId="kpi-revenue"
          />
          <KpiBlock
            icon={<TrendingDown className="h-4 w-4" />}
            label="Cost / kg LW"
            value={report ? fmtUSD(report.cost_per_kg_lw_usd) : "—"}
            sub="Feed cost ÷ live-weight gain"
            testId="kpi-cost-per-kg"
          />
          <KpiBlock
            icon={<Baby className="h-4 w-4" />}
            label="PSY (annualised)"
            value={report ? report.psy.toFixed(2) : "—"}
            sub="Piglets / sow / year"
            testId="kpi-psy"
          />
          <KpiBlock
            icon={<Activity className="h-4 w-4" />}
            label="Total liveweight sold"
            value={report ? fmtKg(report.total_sold_kg) : "—"}
            sub={`Past ${range} days`}
            testId="kpi-total-lw"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="fcr" data-testid="tab-fcr">FCR trend</TabsTrigger>
            <TabsTrigger value="mortality" data-testid="tab-mortality">Mortality</TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="fcr">
            <ReportCard
              title="Feed Conversion Ratio · monthly"
              description="Feed used ÷ liveweight gained. Lower is better. Target line at 2.8."
              onExport={() => report && downloadCsv("fcr-trend", report.fcr_trend.map((r) => ({
                month: r.month, feed_kg: r.feed_kg, gain_kg: r.gain_kg, fcr: r.fcr.toFixed(3),
              })))}
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report?.fcr_trend ?? []} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--card-border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 6]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }} />
                    <ReferenceLine y={2.8} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: "Target 2.8", fontSize: 10, fill: "hsl(var(--accent))" }} />
                    <Line type="monotone" dataKey="fcr" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>
          </TabsContent>

          <TabsContent value="mortality">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportCard
                title="By cause"
                description="Distribution of confirmed causes of death."
                onExport={() => report && downloadCsv("mortality-by-cause", Object.entries(report.mortality_by_cause).map(([cause, count]) => ({ cause, count })))}
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(report?.mortality_by_cause ?? {}).map(([cause, count]) => ({ cause, count }))}
                        dataKey="count" nameKey="cause" innerRadius={55} outerRadius={90} paddingAngle={2}
                      >
                        {Object.entries(report?.mortality_by_cause ?? {}).map(([cause], idx) => (
                          <Cell key={idx} fill={CAUSE_COLORS[cause] ?? "hsl(var(--primary))"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ReportCard>
              <ReportCard
                title="By pen"
                description="Pens with elevated mortality may indicate biosecurity issues."
                onExport={() => report && downloadCsv("mortality-by-pen", Object.entries(report.mortality_by_pen).map(([pen, count]) => ({ pen, count })))}
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(report?.mortality_by_pen ?? {}).map(([pen, count]) => ({ pen: `Pen ${pen}`, count }))}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--card-border))" vertical={false} />
                      <XAxis dataKey="pen" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(var(--status-alert))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ReportCard>
            </div>
          </TabsContent>

          <TabsContent value="sales">
            <ReportCard
              title="Sales revenue · monthly"
              description="Revenue, count and total liveweight sold by month."
              onExport={() => report && downloadCsv("sales-trend", report.sales_trend.map((s) => ({
                month: s.month, count: s.count, kg: s.kg, revenue_usd: s.revenue,
              })))}
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.sales_trend ?? []} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--card-border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue (USD)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function KpiBlock({
  icon,
  label,
  value,
  sub,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  testId?: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4" data-testid={testId}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <span className="text-muted-foreground/70">{icon}</span>
      </div>
      <div className="font-mono tabular-nums font-semibold text-2xl tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ReportCard({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {title}
          </h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} data-testid={`button-export-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
