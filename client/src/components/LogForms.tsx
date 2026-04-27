import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useApp } from "@/contexts/AppContext";
import { PhotoGate } from "./PhotoGate";
import {
  FEED_TYPES,
  TREATMENT_TYPES,
  DEATH_CAUSES,
  PIG_CATEGORIES,
} from "@shared/schema";
import type { PhotoGateResult } from "@/lib/photoGate";
import type { Pig } from "@shared/schema";

const today = () => new Date().toISOString().slice(0, 10);

// ---------- FEED ----------
const feedSchema = z.object({
  feed_type: z.enum(FEED_TYPES),
  bags_opened: z.coerce.number().min(1, "At least 1 bag"),
  pen_or_category: z.string().optional(),
  date_logged: z.string().min(1),
  recorded_by: z.string().optional(),
});

export function FeedLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const form = useForm<z.infer<typeof feedSchema>>({
    resolver: zodResolver(feedSchema),
    defaultValues: {
      feed_type: "Grower",
      bags_opened: 1,
      pen_or_category: "",
      date_logged: today(),
      recorded_by: "Tendai (Manager)",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const body = { ...values, kg_used: values.bags_opened * 50 };
    await enqueueMutation({ method: "POST", url: "/api/feed/logs", body, label: "Feed log" });
    queryClient.invalidateQueries({ queryKey: ["/api/feed/logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    toast({ title: "Feed logged", description: `${values.bags_opened} bag(s) of ${values.feed_type}.` });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FormField control={form.control} name="feed_type" render={({ field }) => (
          <FormItem>
            <FormLabel>Feed type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-feed-type"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{FEED_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="bags_opened" render={({ field }) => (
          <FormItem>
            <FormLabel>Bags opened</FormLabel>
            <FormControl><Input type="number" min={1} step={1} {...field} data-testid="input-feed-bags" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="pen_or_category" render={({ field }) => (
          <FormItem>
            <FormLabel>Pen / category</FormLabel>
            <FormControl><Input placeholder="e.g. Pen 6 or Growers" {...field} data-testid="input-feed-pen" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="date_logged" render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-feed-date" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-feed-submit">
          {form.formState.isSubmitting ? "Saving…" : "Save feed log"}
        </Button>
      </form>
    </Form>
  );
}

// ---------- WEIGHT ----------
const weightSchema = z.object({
  pig_id: z.string().min(1, "Select a pig"),
  weight_kg: z.coerce.number().positive(),
  date_logged: z.string().min(1),
});
export function WeightLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const active = pigs.filter((p) => p.status === "Active");
  const form = useForm<z.infer<typeof weightSchema>>({
    resolver: zodResolver(weightSchema),
    defaultValues: { pig_id: "", weight_kg: 0, date_logged: today() },
  });
  const submit = form.handleSubmit(async (values) => {
    await enqueueMutation({ method: "POST", url: "/api/weights", body: values, label: "Weight log" });
    queryClient.invalidateQueries({ queryKey: ["/api/weights"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    toast({ title: "Weight logged", description: `${values.weight_kg} kg recorded.` });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FormField control={form.control} name="pig_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Pig</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-weight-pig"><SelectValue placeholder="Select tag" /></SelectTrigger></FormControl>
              <SelectContent className="max-h-72">
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs mr-2">{p.tag_id}</span> {p.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="weight_kg" render={({ field }) => (
          <FormItem>
            <FormLabel>Weight (kg)</FormLabel>
            <FormControl><Input type="number" step="0.1" {...field} data-testid="input-weight-kg" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="date_logged" render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-weight-date" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-weight-submit">
          {form.formState.isSubmitting ? "Saving…" : "Save weight"}
        </Button>
      </form>
    </Form>
  );
}

// ---------- TREATMENT ----------
const treatSchema = z.object({
  pig_id: z.string().optional(),
  pen: z.string().optional(),
  treatment_type: z.enum(TREATMENT_TYPES),
  product_name: z.string().min(1),
  dose: z.string().optional(),
  date_logged: z.string().min(1),
  next_due_date: z.string().optional(),
  notes: z.string().optional(),
});

export function TreatmentLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const form = useForm<z.infer<typeof treatSchema>>({
    resolver: zodResolver(treatSchema),
    defaultValues: {
      pig_id: undefined,
      pen: "",
      treatment_type: "Vaccination",
      product_name: "",
      dose: "",
      date_logged: today(),
      next_due_date: "",
      notes: "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const body = {
      ...values,
      pig_id: values.pig_id || null,
      next_due_date: values.next_due_date || null,
    };
    await enqueueMutation({ method: "POST", url: "/api/medical", body, label: "Treatment" });
    queryClient.invalidateQueries({ queryKey: ["/api/medical"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    toast({ title: "Treatment logged", description: values.product_name });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FormField control={form.control} name="treatment_type" render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-treatment-type"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{TREATMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="product_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Product</FormLabel>
            <FormControl><Input placeholder="e.g. Penstrep" {...field} data-testid="input-treatment-product" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="dose" render={({ field }) => (
          <FormItem>
            <FormLabel>Dose</FormLabel>
            <FormControl><Input placeholder="e.g. 5 ml IM" {...field} data-testid="input-treatment-dose" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="pen" render={({ field }) => (
            <FormItem>
              <FormLabel>Pen</FormLabel>
              <FormControl><Input placeholder="—" {...field} data-testid="input-treatment-pen" /></FormControl>
            </FormItem>
          )}/>
          <FormField control={form.control} name="pig_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Or specific pig</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger data-testid="select-treatment-pig"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-60">
                  {pigs.filter((p) => p.status === "Active").slice(0, 80).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono text-xs">{p.tag_id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="date_logged" render={({ field }) => (
            <FormItem>
              <FormLabel>Date given</FormLabel>
              <FormControl><Input type="date" {...field} data-testid="input-treatment-date" /></FormControl>
            </FormItem>
          )}/>
          <FormField control={form.control} name="next_due_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Next due</FormLabel>
              <FormControl><Input type="date" {...field} data-testid="input-treatment-next" /></FormControl>
            </FormItem>
          )}/>
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea rows={2} {...field} data-testid="input-treatment-notes" /></FormControl>
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" data-testid="button-treatment-submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save treatment"}
        </Button>
      </form>
    </Form>
  );
}

// ---------- DEATH ----------
const deathSchema = z.object({
  pig_id: z.string().optional(),
  pen: z.string().min(1, "Pen required"),
  category: z.enum(PIG_CATEGORIES).optional(),
  cause_of_death: z.enum(DEATH_CAUSES),
  notes: z.string().optional(),
  date_logged: z.string().min(1),
});

export function DeathLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const [photo, setPhoto] = useState<PhotoGateResult | null>(null);
  const form = useForm<z.infer<typeof deathSchema>>({
    resolver: zodResolver(deathSchema),
    defaultValues: {
      pig_id: undefined,
      pen: "",
      category: undefined,
      cause_of_death: "Disease",
      notes: "",
      date_logged: today(),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    if (!photo) {
      toast({ title: "Photo required", description: "Take a proof-of-life photo before submitting.", variant: "destructive" });
      return;
    }
    const body: any = {
      ...values,
      pig_id: values.pig_id || null,
      photo_data_url: photo.data_url,
      photo_lat: photo.lat,
      photo_lng: photo.lng,
      photo_timestamp: photo.timestamp,
    };
    await enqueueMutation({ method: "POST", url: "/api/mortality", body, label: "Death log" });
    queryClient.invalidateQueries({ queryKey: ["/api/mortality"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pigs"] });
    toast({ title: "Death recorded", description: `${values.cause_of_death}` });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <PhotoGate value={photo} onChange={setPhoto} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="pen" render={({ field }) => (
            <FormItem>
              <FormLabel>Pen</FormLabel>
              <FormControl><Input placeholder="e.g. 6" {...field} data-testid="input-death-pen" /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger data-testid="select-death-category"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                <SelectContent>{PIG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )}/>
        </div>
        <FormField control={form.control} name="cause_of_death" render={({ field }) => (
          <FormItem>
            <FormLabel>Cause</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-death-cause"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{DEATH_CAUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="pig_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Specific pig (optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger data-testid="select-death-pig"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
              <SelectContent className="max-h-60">
                {pigs.filter((p) => p.status === "Active").slice(0, 80).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs">{p.tag_id}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}/>
        <FormField control={form.control} name="date_logged" render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-death-date" /></FormControl>
          </FormItem>
        )}/>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea rows={2} {...field} data-testid="input-death-notes" /></FormControl>
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-death-submit">
          {form.formState.isSubmitting ? "Saving…" : "Record death"}
        </Button>
      </form>
    </Form>
  );
}

// ---------- BIRTH ----------
const birthSchema = z.object({
  sow_pig_id: z.string().min(1, "Select sow"),
  piglets_born_alive: z.coerce.number().min(0),
  piglets_stillborn: z.coerce.number().min(0).default(0),
  date_logged: z.string().min(1),
});
export function BirthLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const sows = pigs.filter((p) => p.category === "Sow" && p.status === "Active");
  const [photo, setPhoto] = useState<PhotoGateResult | null>(null);
  const form = useForm<z.infer<typeof birthSchema>>({
    resolver: zodResolver(birthSchema),
    defaultValues: { sow_pig_id: "", piglets_born_alive: 0, piglets_stillborn: 0, date_logged: today() },
  });
  const submit = form.handleSubmit(async (values) => {
    if (!photo) {
      toast({ title: "Photo required", description: "Take a litter photo to verify birth.", variant: "destructive" });
      return;
    }
    const body: any = {
      ...values,
      photo_data_url: photo.data_url,
      photo_lat: photo.lat,
      photo_lng: photo.lng,
      photo_timestamp: photo.timestamp,
    };
    await enqueueMutation({ method: "POST", url: "/api/births", body, label: "Birth" });
    queryClient.invalidateQueries({ queryKey: ["/api/births"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    toast({ title: "Birth recorded", description: `${values.piglets_born_alive} alive` });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <PhotoGate value={photo} onChange={setPhoto} />
        <FormField control={form.control} name="sow_pig_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Sow</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-birth-sow"><SelectValue placeholder="Select sow" /></SelectTrigger></FormControl>
              <SelectContent>
                {sows.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs mr-2">{p.tag_id}</span> {p.breed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="piglets_born_alive" render={({ field }) => (
            <FormItem>
              <FormLabel>Born alive</FormLabel>
              <FormControl><Input type="number" min={0} {...field} data-testid="input-birth-alive" /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="piglets_stillborn" render={({ field }) => (
            <FormItem>
              <FormLabel>Stillborn</FormLabel>
              <FormControl><Input type="number" min={0} {...field} data-testid="input-birth-stillborn" /></FormControl>
            </FormItem>
          )}/>
        </div>
        <FormField control={form.control} name="date_logged" render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-birth-date" /></FormControl>
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-birth-submit">
          {form.formState.isSubmitting ? "Saving…" : "Record birth"}
        </Button>
      </form>
    </Form>
  );
}

// ---------- SALE ----------
const saleSchema = z.object({
  pig_id: z.string().min(1, "Select pig"),
  buyer: z.string().min(1),
  weight_kg: z.coerce.number().positive(),
  price_usd: z.coerce.number().positive(),
  date_logged: z.string().min(1),
});
export function SaleLogForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { enqueueMutation } = useApp();
  const { data: pigs = [] } = useQuery<Pig[]>({ queryKey: ["/api/pigs"] });
  const eligible = pigs.filter((p) => p.status === "Active" && (p.category === "Finisher" || p.category === "Grower"));
  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: { pig_id: "", buyer: "", weight_kg: 0, price_usd: 0, date_logged: today() },
  });
  const submit = form.handleSubmit(async (values) => {
    await enqueueMutation({ method: "POST", url: "/api/sales", body: values, label: "Sale" });
    queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pigs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    toast({ title: "Sale recorded", description: `${values.buyer} · $${values.price_usd}` });
    onDone();
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FormField control={form.control} name="pig_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Pig</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-sale-pig"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
              <SelectContent className="max-h-60">
                {eligible.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs mr-2">{p.tag_id}</span> {p.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="buyer" render={({ field }) => (
          <FormItem>
            <FormLabel>Buyer</FormLabel>
            <FormControl><Input {...field} data-testid="input-sale-buyer" placeholder="e.g. Surrey Abattoir" /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="weight_kg" render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl><Input type="number" step="0.5" {...field} data-testid="input-sale-weight" /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="price_usd" render={({ field }) => (
            <FormItem>
              <FormLabel>Price (USD)</FormLabel>
              <FormControl><Input type="number" step="0.5" {...field} data-testid="input-sale-price" /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        <FormField control={form.control} name="date_logged" render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-sale-date" /></FormControl>
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-sale-submit">
          {form.formState.isSubmitting ? "Saving…" : "Record sale"}
        </Button>
      </form>
    </Form>
  );
}
