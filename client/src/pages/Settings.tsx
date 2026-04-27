import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, DollarSign, TrendingUp, Wifi, Sun, Moon } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import type { Settings } from "@shared/schema";

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
      </div>
    </>
  );
}
