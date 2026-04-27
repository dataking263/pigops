import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Wheat,
  Stethoscope,
  Skull,
  CalendarCheck,
  Settings,
  KanbanSquare,
  BarChart3,
  Plus,
  Tag,
} from "lucide-react";
import type { Pig } from "@shared/schema";

const PAGES = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Daily Log", icon: ClipboardList },
  { href: "/herd", label: "Herd", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/feed", label: "Feed", icon: Wheat },
  { href: "/medical", label: "Medical", icon: Stethoscope },
  { href: "/mortality", label: "Mortality", icon: Skull },
  { href: "/census", label: "Sunday Census", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ACTIONS = [
  { href: "/log?action=feed", label: "Log feed", icon: Wheat },
  { href: "/log?action=birth", label: "Log birth", icon: Plus },
  { href: "/log?action=death", label: "Log death", icon: Skull },
  { href: "/log?action=treatment", label: "Log treatment", icon: Stethoscope },
  { href: "/log?action=weight", label: "Weigh pigs", icon: Plus },
  { href: "/log?action=sale", label: "Log sale", icon: Plus },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"], enabled: open });

  const go = (href: string) => {
    onOpenChange(false);
    // route portion before any '?'
    const [path, query] = href.split("?");
    if (query) {
      // store in sessionStorage? Sandbox forbids. Use a global window var.
      (window as any).__pgyAction = query;
    }
    setLocation(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pigs by tag, jump to module, run an action…" data-testid="cmdk-input" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem key={a.href} value={a.label} onSelect={() => go(a.href)} data-testid={`cmd-action-${a.label.toLowerCase().replace(/\s/g, '-')}`}>
                <Icon className="h-4 w-4 mr-2 opacity-70" />
                {a.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {PAGES.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.href} value={`go ${p.label}`} onSelect={() => go(p.href)} data-testid={`cmd-nav-${p.label.toLowerCase().replace(/\s/g, '-')}`}>
                <Icon className="h-4 w-4 mr-2 opacity-70" />
                {p.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {pigs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Pigs (${pigs.length})`}>
              {pigs.slice(0, 50).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.tag_id} ${p.category} ${p.breed ?? ""}`}
                  onSelect={() => go(`/herd/${p.id}`)}
                  data-testid={`cmd-pig-${p.tag_id}`}
                >
                  <Tag className="h-4 w-4 mr-2 opacity-70" />
                  <span className="font-mono text-xs mr-2">{p.tag_id}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.category} · {p.breed ?? "—"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
