import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, DollarSign, TrendingUp, Wifi, Sun, Moon, Stethoscope, AlertTriangle, RefreshCw, Pencil, Check, X as XIcon, Users as UsersIcon, Plus, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import type { Settings, MedicationProtocol, Employee } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useApp();
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const [zwlRate, setZwlRate] = useState("27");
  const [lowBw, setLowBw] = useState(false);
  const [weanerKg, setWeanerKg] = useState("20");
  const [finisherKg, setFinisherKg] = useState("100");
  const [targetFcr, setTargetFcr] = useState("2.8");

  useEffect(() => {
    if (!settings) return;
    setZwlRate(String(settings.zwl_per_usd ?? 27));
    setLowBw(!!settings.low_bandwidth_mode);
    try {
      const curves = JSON.parse(settings.breed_standard_curves);
      if (curves.weaner_target_kg_at_8w) setWeanerKg(String(curves.weaner_target_kg_at_8w));
      if (curves.finisher_target_kg_at_24w) setFinisherKg(String(curves.finisher_target_kg_at_24w));
      if (curves.target_fcr) setTargetFcr(String(curves.target_fcr));
    } catch {}
  }, [settings]);

  const save = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", "/api/settings", {
        zwl_per_usd: Number(zwlRate),
        low_bandwidth_mode: lowBw,
        breed_standard_curves: JSON.stringify({
          weaner_target_kg_at_8w: Number(weanerKg),
          finisher_target_kg_at_24w: Number(finisherKg),
          target_fcr: Number(targetFcr),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Settings saved" });
    },
  });

  return (
    <>
      <PageHeader title="Settings" subtitle="Currency, growth targets, and app preferences" />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-[820px] mx-auto w-full space-y-5">
        {/* Currency */}
        <section className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Currency</h2>
              <p className="text-xs text-muted-foreground">USD is primary. ZWL is shown alongside in financial views.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ZWL per USD</Label>
              <Input
                type="number"
                step="0.01"
                value={zwlRate}
                onChange={(e) => setZwlRate(e.target.value)}
                className="font-mono tabular-nums"
                data-testid="input-zwl-rate"
              />
            </div>
          </div>
        </section>

        {/* Growth targets */}
        <section className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-[hsl(var(--accent))]/10 grid place-items-center text-[hsl(var(--accent))] shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Breed standard curves</h2>
              <p className="text-xs text-muted-foreground">Used by the weight chart target overlay and the FCR badge.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Weaner target @ 8w (kg)</Label>
              <Input type="number" value={weanerKg} onChange={(e) => setWeanerKg(e.target.value)} className="font-mono tabular-nums" data-testid="input-weaner-kg" />
            </div>
            <div className="space-y-1.5">
              <Label>Finisher target @ 24w (kg)</Label>
              <Input type="number" value={finisherKg} onChange={(e) => setFinisherKg(e.target.value)} className="font-mono tabular-nums" data-testid="input-finisher-kg" />
            </div>
            <div className="space-y-1.5">
              <Label>Target FCR</Label>
              <Input type="number" step="0.01" value={targetFcr} onChange={(e) => setTargetFcr(e.target.value)} className="font-mono tabular-nums" data-testid="input-target-fcr" />
            </div>
          </div>
        </section>

        {/* App preferences */}
        <section className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0">
              <SettingsIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">App preferences</h2>
              <p className="text-xs text-muted-foreground">Settings tuned for the Manager phone in the field.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Low-bandwidth mode</div>
                  <div className="text-[11px] text-muted-foreground">Disables the photo-gate watermark preview to save data.</div>
                </div>
              </div>
              <Switch checked={lowBw} onCheckedChange={setLowBw} data-testid="switch-low-bandwidth" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <div className="text-sm font-medium">Theme</div>
                  <div className="text-[11px] text-muted-foreground">Currently {theme}. Tap to toggle.</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme} data-testid="button-toggle-theme">
                {theme === "dark" ? "Switch to light" : "Switch to dark"}
              </Button>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" data-testid="button-save-settings">
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>

        {/* Employees */}
        <EmployeesSection />

        {/* Medication Protocols */}
        <MedicationProtocolsSection />
      </div>
    </>
  );
}

function EmployeesSection() {
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Hand");
  const [wage, setWage] = useState("100");

  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/employees", {
      name, role, monthly_wage_usd: Number(wage),
      start_date: new Date().toISOString().slice(0, 10), active: 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee added" });
      setAdding(false);
      setName(""); setRole("Hand"); setWage("100");
    },
  });

  const toggle = useMutation({
    mutationFn: (e: Employee) => apiRequest("PATCH", `/api/employees/${e.id}`, { active: e.active ? 0 : 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] }),
  });

  return (
    <section className="rounded-xl border border-card-border bg-card p-5" data-testid="section-employees">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          <UsersIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold tracking-tight">Employees</h2>
          <p className="text-xs text-muted-foreground">Names and monthly wages used for payroll.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} data-testid="button-add-employee">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {adding && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-new-employee-name" />
          <Input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} data-testid="input-new-employee-role" />
          <Input type="number" placeholder="Wage USD/mo" value={wage} onChange={(e) => setWage(e.target.value)} data-testid="input-new-employee-wage" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => create.mutate()} disabled={!name || create.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="text-sm text-muted-foreground italic text-center py-6">No employees yet.</div>
      ) : (
        <ul className="divide-y divide-card-border">
          {employees.map((e) => (
            <li key={e.id} className="py-2.5 flex items-center gap-3 text-sm" data-testid={`row-employee-${e.id}`}>
              <div className="h-7 w-7 rounded-full bg-muted grid place-items-center text-xs font-semibold uppercase shrink-0">
                {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-[11px] text-muted-foreground">{e.role} · since {e.start_date}</div>
              </div>
              <div className="font-mono tabular-nums shrink-0 text-right">
                <div>${e.monthly_wage_usd}/mo</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle.mutate(e)} className="shrink-0" data-testid={`button-toggle-employee-${e.id}`}>
                {e.active ? <UserCheck className="h-3.5 w-3.5 text-emerald-500" /> : <UserX className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const CATEGORY_TONES: Record<string, string> = {
  Piglet: "bg-[hsl(14_60%_45%)]/12 text-[hsl(14_60%_45%)]",
  Weaner: "bg-[hsl(28_70%_45%)]/12 text-[hsl(28_70%_45%)]",
  Grower: "bg-[hsl(155_55%_38%)]/12 text-[hsl(155_55%_38%)]",
  Finisher: "bg-[hsl(220_55%_45%)]/12 text-[hsl(220_55%_45%)]",
  Sow: "bg-[hsl(330_50%_50%)]/12 text-[hsl(330_50%_50%)]",
  Boar: "bg-[hsl(265_50%_50%)]/12 text-[hsl(265_50%_50%)]",
  All: "bg-muted text-muted-foreground",
};

function triggerLabel(p: MedicationProtocol): string {
  switch (p.trigger_type) {
    case "age_days": return `Age · day ${p.trigger_value}`;
    case "pre_farrow_days": return `${p.trigger_value}d pre-farrow`;
    case "post_weaning_days": return `${p.trigger_value}d post-weaning`;
    case "recurring_days": return `Every ${p.trigger_value} days`;
    case "event_birth": return `On birth`;
    case "event_weaning": return `On weaning`;
    default: return p.trigger_type;
  }
}

function MedicationProtocolsSection() {
  const { toast } = useToast();
  const { data: protocols = [], isLoading } = useQuery<MedicationProtocol[]>({ queryKey: ["/api/medication-protocols"] });
  const [editing, setEditing] = useState<string | null>(null);
  const [draftCost, setDraftCost] = useState("");
  const [draftDose, setDraftDose] = useState("");
  const [draftRationale, setDraftRationale] = useState("");

  const patchMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const r = await apiRequest("PATCH", `/api/medication-protocols/${id}`, body);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-protocols"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", { status: "pending" }] });
      toast({ title: "Protocol updated" });
      setEditing(null);
    },
    onError: () => toast({ title: "Failed to update protocol", variant: "destructive" as any }),
  });

  const regenMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/pens/regenerate-reminders", {});
      return r.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders", { status: "pending" }] });
      toast({ title: "Reminders regenerated", description: `${data?.count ?? ""} upcoming reminders queued.` });
    },
  });

  function startEdit(p: MedicationProtocol) {
    setEditing(p.id);
    setDraftCost(String(p.estimated_cost_usd ?? 0));
    setDraftDose(p.dose ?? "");
    setDraftRationale(p.rationale ?? "");
  }

  function saveEdit(p: MedicationProtocol) {
    const cost = Number(draftCost);
    if (Number.isNaN(cost) || cost < 0) {
      toast({ title: "Invalid cost", description: "Enter a non-negative number.", variant: "destructive" as any });
      return;
    }
    patchMut.mutate({
      id: p.id,
      body: {
        estimated_cost_usd: cost,
        dose: draftDose,
        rationale: draftRationale,
      },
    });
  }

  return (
    <section className="rounded-xl border border-card-border bg-card p-5" data-testid="section-medication-protocols">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-status-good/15 grid place-items-center text-status-good shrink-0">
          <Stethoscope className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Medication protocols</h2>
          <p className="text-xs text-muted-foreground">
            Standing schedules drive Pen reminders. Costs are <span className="italic">estimated retail</span> for Zimbabwe smallholders.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => regenMut.mutate()}
          disabled={regenMut.isPending}
          data-testid="button-regen-reminders"
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenMut.isPending ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-6 text-center">Loading protocols…</div>
      ) : protocols.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">No protocols configured.</div>
      ) : (
        <ul className="divide-y divide-card-border -mx-5">
          {protocols.map((p) => {
            const isEditing = editing === p.id;
            const enabled = p.enabled === 1;
            return (
              <li
                key={p.id}
                className="px-5 py-4"
                data-testid={`protocol-row-${p.id}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium ${CATEGORY_TONES[p.category] ?? CATEGORY_TONES.All}`}>
                        {p.category}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                      {p.is_critical === 1 && (
                        <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-status-alert/15 text-status-alert flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Critical
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                      {p.product_name} · {p.route} · {triggerLabel(p)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enable-${p.id}`} className="text-[11px] text-muted-foreground">
                        {enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`enable-${p.id}`}
                        checked={enabled}
                        onCheckedChange={(v) => patchMut.mutate({ id: p.id, body: { enabled: v ? 1 : 0 } })}
                        data-testid={`switch-protocol-${p.id}`}
                      />
                    </div>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(p)}
                        data-testid={`button-edit-protocol-${p.id}`}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <ReadField label="Dose" value={p.dose} mono />
                    <ReadField label="Cost (USD)" value={`$${(p.estimated_cost_usd ?? 0).toFixed(2)}`} mono accent />
                    <ReadField label="Notes" value={p.rationale ?? "—"} />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Dose</Label>
                      <Input
                        value={draftDose}
                        onChange={(e) => setDraftDose(e.target.value)}
                        className="font-mono text-sm"
                        data-testid={`input-dose-${p.id}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Estimated cost (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draftCost}
                        onChange={(e) => setDraftCost(e.target.value)}
                        className="font-mono tabular-nums text-sm"
                        data-testid={`input-cost-${p.id}`}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label className="text-[11px]">Notes / rationale</Label>
                      <Textarea
                        value={draftRationale}
                        onChange={(e) => setDraftRationale(e.target.value)}
                        rows={2}
                        className="text-sm"
                        data-testid={`input-rationale-${p.id}`}
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(null)}
                        data-testid={`button-cancel-protocol-${p.id}`}
                        className="gap-1.5"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(p)}
                        disabled={patchMut.isPending}
                        data-testid={`button-save-protocol-${p.id}`}
                        className="gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Save changes
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ReadField({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm mt-0.5 ${mono ? "font-mono tabular-nums" : ""} ${accent ? "text-foreground font-semibold" : ""}`}>
        {value}
      </div>
    </div>
  );
}
