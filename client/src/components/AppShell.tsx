import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Wheat,
  Stethoscope,
  Skull,
  CalendarCheck,
  Settings as SettingsIcon,
  KanbanSquare,
  BarChart3,
  Bell,
  Search,
  Sun,
  Moon,
  WifiOff,
  Plus,
  Menu,
  X,
  ChevronRight,
  Layers,
  Check,
  AlertTriangle,
  GitBranch,
  Wallet,
} from "lucide-react";
import { Wordmark, Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { fmtRelative, fmtDateShort } from "@/lib/format";
import { CommandPalette } from "./CommandPalette";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Daily Log", icon: ClipboardList },
  { href: "/herd", label: "Herd", icon: Users },
  { href: "/pens", label: "Pens", icon: Layers },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/lineage", label: "Lineage", icon: GitBranch },
  { href: "/feed", label: "Feed", icon: Wheat },
  { href: "/medical", label: "Medical", icon: Stethoscope },
  { href: "/mortality", label: "Mortality", icon: Skull },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/census", label: "Census", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const MOBILE_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/herd", label: "Herd", icon: Users },
  { href: "/pens", label: "Pens", icon: Layers },
  { href: "/more", label: "More", icon: Menu },
];

const MORE_LINKS = NAV.filter((n) => !["/", "/log", "/herd", "/pens"].includes(n.href));

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme, isOnline, pendingMutations } = useApp();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/alerts"], refetchInterval: 60000 });
  const { data: reminders = [] } = useQuery<any[]>({ queryKey: ["/api/reminders", { status: "pending" }], queryFn: async () => {
    const r = await apiRequest("GET", "/api/reminders?status=pending");
    return r.json();
  }, refetchInterval: 60000 });
  const { toast } = useToast();

  // Critical reminders: overdue or due today, or marked critical
  const todayISO = new Date().toISOString().slice(0, 10);
  const criticalReminders = (reminders || []).filter((r: any) => {
    if (r.status !== "pending") return false;
    const isCritical = r.protocol?.is_critical === 1 || r.is_critical === 1 || r.is_critical === true;
    return r.due_date <= todayISO || isCritical;
  }).slice(0, 12);

  const completeMut = useMutation({
    mutationFn: async (id: string | number) => {
      const r = await apiRequest("POST", `/api/reminders/${id}/complete`, {});
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", { status: "pending" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      toast({ title: "Treatment logged", description: "Marked as done & logged to medical." });
    },
    onError: () => toast({ title: "Failed to mark done", variant: "destructive" as any }),
  });

  const totalNotifCount = alerts.length + criticalReminders.length;

  // ⌘K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentNav = NAV.find((n) => n.href === (location === "/" ? "/" : location));

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 border-r border-sidebar-border bg-sidebar shrink-0 sticky top-0 h-dvh">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/" className="block hover-elevate -m-1 p-1 rounded-md" data-testid="link-home-logo">
            <Wordmark />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto thin-scroll p-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`link-nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm hover-elevate active-elevate-2 ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-[11px] text-muted-foreground leading-tight">
            <div className="font-medium text-foreground/80">Makina Family Piggery</div>
            <div>7 pens · Zimbabwe</div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border"
          data-testid="topbar"
        >
          <div className="h-14 px-4 md:px-6 flex items-center gap-3">
            {/* Mobile logo */}
            <Link href="/" className="md:hidden flex items-center gap-2" data-testid="link-mobile-home">
              <span className="text-primary">
                <Logo size={26} />
              </span>
              <span className="font-semibold text-[15px]">PigOps</span>
            </Link>

            {/* Desktop title / breadcrumb */}
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{currentNav?.label ?? "PigOps"}</span>
            </div>

            {/* Search trigger - desktop */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              data-testid="button-cmdk"
              className="hidden md:flex flex-1 max-w-md mx-auto items-center gap-2 h-9 px-3 rounded-md border border-border bg-card hover-elevate text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search pigs, jump to module…</span>
              <kbd className="hidden lg:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-background">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1">
              {!isOnline && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] text-status-warn pill-warn px-2 py-1 rounded-md"
                  data-testid="indicator-offline"
                >
                  <WifiOff className="h-3 w-3" /> Offline
                </span>
              )}
              {pendingMutations.length > 0 && (
                <span
                  className="text-[11px] pill-warn px-2 py-1 rounded-md"
                  data-testid="indicator-queued"
                >
                  {pendingMutations.length} queued
                </span>
              )}

              {/* Mobile search */}
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden"
                onClick={() => setCmdOpen(true)}
                data-testid="button-mobile-search"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setNotifOpen(true)}
                aria-label="Notifications"
                data-testid="button-notifications"
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {totalNotifCount > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] text-[9px] font-mono font-semibold rounded-full bg-primary text-primary-foreground flex items-center justify-center px-1 tabular-nums"
                    data-testid="badge-notifications"
                  >
                    {totalNotifCount}
                  </span>
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
        data-testid="bottom-tabs"
      >
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isMore = tab.href === "/more";
            const active = !isMore && (location === tab.href || (tab.href !== "/" && location.startsWith(tab.href)));
            const onClick = isMore
              ? (e: React.MouseEvent) => {
                  e.preventDefault();
                  setMoreOpen(true);
                }
              : undefined;
            return (
              <Link
                key={tab.href}
                href={isMore ? location : tab.href}
                onClick={onClick}
                data-testid={`tab-${tab.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More sheet (mobile) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {MORE_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover-elevate"
                  data-testid={`more-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Notifications drawer */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Alerts & Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4 thin-scroll space-y-5">
            {/* Critical pen reminders */}
            {criticalReminders.length > 0 && (
              <section>
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Pen reminders ({criticalReminders.length})
                </h3>
                <ul className="space-y-2">
                  {criticalReminders.map((r: any) => {
                    const overdue = r.due_date < todayISO;
                    const isToday = r.due_date === todayISO;
                    const productName = r.protocol?.product_name ?? r.product_name ?? "Treatment";
                    const protocolName = r.protocol?.name ?? "";
                    const isCritical = r.protocol?.is_critical === 1 || r.is_critical === 1 || r.is_critical === true;
                    const rationale = r.protocol?.rationale ?? r.rationale;
                    const penNo = r.pen ?? r.pen_id;
                    return (
                      <li
                        key={r.id}
                        className={`p-3 rounded-lg border ${
                          overdue ? "pill-alert border-transparent" :
                          isToday ? "pill-warn border-transparent" : "border-border bg-card"
                        }`}
                        data-testid={`notif-reminder-${r.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/pens/${penNo}`}
                            onClick={() => setNotifOpen(false)}
                            className="min-w-0 flex-1 hover:opacity-80"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm truncate">{productName}</span>
                              {isCritical ? (
                                <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-status-alert/15 text-status-alert">Critical</span>
                              ) : null}
                            </div>
                            <div className="text-xs mt-0.5 opacity-90 tabular-nums">
                              Pen {penNo} · {protocolName ? `${protocolName} · ` : ""}{overdue ? `Overdue ${fmtDateShort(r.due_date)}` : isToday ? "Due today" : `Due ${fmtDateShort(r.due_date)}`}
                            </div>
                            {rationale ? (
                              <div className="text-[10px] opacity-60 mt-1 line-clamp-1">{rationale}</div>
                            ) : null}
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 shrink-0 gap-1"
                            onClick={() => completeMut.mutate(r.id)}
                            disabled={completeMut.isPending}
                            data-testid={`button-complete-reminder-${r.id}`}
                          >
                            <Check className="h-3 w-3" />
                            <span className="text-[11px]">Done</span>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* General alerts */}
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Alerts ({alerts.length})
              </h3>
              {alerts.length === 0 && criticalReminders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <div className="text-sm">All clear. No active alerts.</div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-xs text-muted-foreground py-3">No general alerts.</div>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a: any) => (
                    <li
                      key={a.id}
                      className={`p-3 rounded-lg border ${
                        a.severity === "alert" ? "pill-alert border-transparent" :
                        a.severity === "warn" ? "pill-warn border-transparent" : "border-border bg-card"
                      }`}
                    >
                      <Link
                        href={a.route}
                        onClick={() => setNotifOpen(false)}
                        className="block hover:opacity-80"
                        data-testid={`alert-${a.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm">{a.title}</div>
                          <span className="text-[10px] uppercase tracking-wide opacity-70 shrink-0">{a.severity}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-90">{a.description}</div>
                        <div className="text-[10px] opacity-60 mt-1.5">{fmtRelative(a.timestamp)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="px-4 md:px-6 lg:px-8 pt-5 md:pt-7 pb-4 border-b border-border bg-background">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="page-title">{title}</h1>
          {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
