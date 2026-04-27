import { useEffect, useState } from "react";
import {
  Wheat,
  Baby,
  Skull,
  Stethoscope,
  DollarSign,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  FeedLogForm,
  WeightLogForm,
  TreatmentLogForm,
  DeathLogForm,
  BirthLogForm,
  SaleLogForm,
} from "@/components/LogForms";

type Action = "feed" | "weight" | "treatment" | "death" | "birth" | "sale" | null;

const ACTION_TILES: { key: Exclude<Action, null>; label: string; icon: any; tone: string; desc: string }[] = [
  { key: "feed", label: "Log Feed", icon: Wheat, tone: "bg-[hsl(35_70%_92%)] text-[hsl(25_60%_30%)] dark:bg-[hsl(35_25%_22%)] dark:text-[hsl(35_60%_72%)]", desc: "Bags opened" },
  { key: "weight", label: "Weigh Pigs", icon: Scale, tone: "bg-[hsl(200_30%_90%)] text-[hsl(200_45%_30%)] dark:bg-[hsl(200_20%_22%)] dark:text-[hsl(200_40%_72%)]", desc: "Track growth" },
  { key: "treatment", label: "Log Treatment", icon: Stethoscope, tone: "bg-[hsl(140_25%_92%)] text-[hsl(140_25%_28%)] dark:bg-[hsl(140_20%_18%)] dark:text-[hsl(140_30%_70%)]", desc: "Vaccine, dose" },
  { key: "birth", label: "Log Birth", icon: Baby, tone: "bg-[hsl(35_70%_92%)] text-[hsl(35_70%_30%)] dark:bg-[hsl(35_25%_22%)] dark:text-[hsl(35_70%_72%)]", desc: "Sow farrowed" },
  { key: "death", label: "Log Death", icon: Skull, tone: "bg-[hsl(4_70%_94%)] text-[hsl(4_70%_35%)] dark:bg-[hsl(4_50%_22%)] dark:text-[hsl(4_70%_72%)]", desc: "Photo gated" },
  { key: "sale", label: "Log Sale", icon: DollarSign, tone: "bg-[hsl(140_25%_92%)] text-[hsl(140_25%_28%)] dark:bg-[hsl(140_20%_18%)] dark:text-[hsl(140_30%_70%)]", desc: "Buyer, price" },
];

const TITLE: Record<Exclude<Action, null>, string> = {
  feed: "Log feed usage",
  weight: "Weigh a pig",
  treatment: "Log treatment",
  death: "Log death",
  birth: "Log birth",
  sale: "Log sale",
};

export default function DailyLog() {
  const [action, setAction] = useState<Action>(null);

  // Read action from window for command-palette deep-link
  useEffect(() => {
    const a = (window as any).__pgyAction as string | undefined;
    if (a && ["feed","weight","treatment","death","birth","sale"].some((k) => a.includes(k))) {
      const m = a.match(/action=(\w+)/);
      if (m && ["feed","weight","treatment","death","birth","sale"].includes(m[1])) {
        setAction(m[1] as Action);
      }
      (window as any).__pgyAction = undefined;
    }
  }, []);

  const close = () => setAction(null);

  return (
    <>
      <PageHeader
        title="Daily Log"
        subtitle="Quick capture. Tap a tile to start."
      />
      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 max-w-[1200px] mx-auto w-full">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {ACTION_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setAction(t.key)}
                data-testid={`tile-${t.key}`}
                className="rounded-2xl border border-card-border bg-card p-5 md:p-6 text-left hover-elevate active-elevate-2 transition-all min-h-[140px] flex flex-col gap-3"
              >
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${t.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-card-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">Tips for the manager</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Births and deaths require a photo with GPS — used as proof-of-life.</li>
            <li>Submit Sunday Census every week before the owner's report.</li>
            <li>Offline entries are queued and sync automatically when signal returns.</li>
          </ul>
        </div>
      </div>

      <Sheet open={!!action} onOpenChange={(v) => !v && close()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
          data-testid="sheet-log-form"
        >
          <SheetHeader>
            <SheetTitle>{action ? TITLE[action] : ""}</SheetTitle>
            <SheetDescription>Fill the fields below. The form saves once you tap submit.</SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            {action === "feed" && <FeedLogForm onDone={close} />}
            {action === "weight" && <WeightLogForm onDone={close} />}
            {action === "treatment" && <TreatmentLogForm onDone={close} />}
            {action === "death" && <DeathLogForm onDone={close} />}
            {action === "birth" && <BirthLogForm onDone={close} />}
            {action === "sale" && <SaleLogForm onDone={close} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
