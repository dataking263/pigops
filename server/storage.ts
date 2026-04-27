import {
  pigs,
  feedLots,
  feedLogs,
  weightLogs,
  medicalLogs,
  mortalityLogs,
  birthLogs,
  salesLogs,
  censusRecords,
  settings,
  PIG_CATEGORIES,
} from "@shared/schema";
import type {
  Pig,
  InsertPig,
  FeedLot,
  InsertFeedLot,
  FeedLog,
  InsertFeedLog,
  WeightLog,
  InsertWeightLog,
  MedicalLog,
  InsertMedicalLog,
  MortalityLog,
  InsertMortalityLog,
  BirthLog,
  InsertBirthLog,
  SalesLog,
  InsertSalesLog,
  CensusRecord,
  InsertCensus,
  Settings,
  InsertSettings,
  PigCategory,
  FeedType,
  DashboardKpis,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Run migrations - create tables if they don't exist
function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pigs (
      id TEXT PRIMARY KEY,
      tag_id TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      birth_date TEXT,
      weight_at_weaning_kg REAL,
      current_pen INTEGER,
      breed TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS feed_lots (
      id TEXT PRIMARY KEY,
      feed_type TEXT NOT NULL,
      bags_received INTEGER NOT NULL,
      kg_per_bag REAL NOT NULL DEFAULT 50,
      cost_per_bag_usd REAL NOT NULL,
      supplier TEXT,
      date_received TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feed_logs (
      id TEXT PRIMARY KEY,
      feed_type TEXT NOT NULL,
      bags_opened INTEGER NOT NULL,
      kg_used REAL NOT NULL,
      pen_or_category TEXT,
      date_logged TEXT NOT NULL,
      recorded_by TEXT
    );
    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      pig_id TEXT,
      batch_id TEXT,
      weight_kg REAL NOT NULL,
      date_logged TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medical_logs (
      id TEXT PRIMARY KEY,
      pig_id TEXT,
      pen TEXT,
      treatment_type TEXT NOT NULL,
      product_name TEXT NOT NULL,
      dose TEXT,
      date_logged TEXT NOT NULL,
      next_due_date TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS mortality_logs (
      id TEXT PRIMARY KEY,
      pig_id TEXT,
      pen TEXT,
      category TEXT,
      cause_of_death TEXT NOT NULL,
      notes TEXT,
      photo_data_url TEXT,
      photo_lat REAL,
      photo_lng REAL,
      photo_timestamp TEXT,
      date_logged TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS birth_logs (
      id TEXT PRIMARY KEY,
      sow_pig_id TEXT NOT NULL,
      piglets_born_alive INTEGER NOT NULL,
      piglets_stillborn INTEGER NOT NULL DEFAULT 0,
      date_logged TEXT NOT NULL,
      photo_data_url TEXT,
      photo_lat REAL,
      photo_lng REAL,
      photo_timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS sales_logs (
      id TEXT PRIMARY KEY,
      pig_id TEXT,
      batch TEXT,
      buyer TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      price_usd REAL NOT NULL,
      date_logged TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS census_records (
      id TEXT PRIMARY KEY,
      week_start_date TEXT NOT NULL,
      total_count INTEGER NOT NULL,
      by_category TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      submitted_by TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      zwl_per_usd REAL NOT NULL DEFAULT 27,
      breed_standard_curves TEXT NOT NULL,
      low_bandwidth_mode INTEGER NOT NULL DEFAULT 0
    );
  `);
}

ensureSchema();

const id = () => randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const isoDaysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

// Generic dashboard helpers
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const storage = {
  // Pigs
  listPigs(): Pig[] {
    return db.select().from(pigs).orderBy(desc(pigs.created_at)).all();
  },
  getPig(pigId: string): Pig | undefined {
    return db.select().from(pigs).where(eq(pigs.id, pigId)).get();
  },
  createPig(data: InsertPig): Pig {
    return db
      .insert(pigs)
      .values({ ...data, id: id(), created_at: new Date().toISOString() })
      .returning()
      .get();
  },
  updatePig(pigId: string, data: Partial<InsertPig>): Pig | undefined {
    return db.update(pigs).set(data).where(eq(pigs.id, pigId)).returning().get();
  },
  deletePig(pigId: string) {
    db.delete(pigs).where(eq(pigs.id, pigId)).run();
  },

  // Feed lots
  listFeedLots(): FeedLot[] {
    return db.select().from(feedLots).orderBy(desc(feedLots.date_received)).all();
  },
  createFeedLot(data: InsertFeedLot): FeedLot {
    return db.insert(feedLots).values({ ...data, id: id() }).returning().get();
  },

  // Feed logs
  listFeedLogs(): FeedLog[] {
    return db.select().from(feedLogs).orderBy(desc(feedLogs.date_logged)).all();
  },
  createFeedLog(data: InsertFeedLog): FeedLog {
    return db.insert(feedLogs).values({ ...data, id: id() }).returning().get();
  },

  // Weight logs
  listWeightLogs(pigId?: string): WeightLog[] {
    if (pigId) {
      return db
        .select()
        .from(weightLogs)
        .where(eq(weightLogs.pig_id, pigId))
        .orderBy(desc(weightLogs.date_logged))
        .all();
    }
    return db.select().from(weightLogs).orderBy(desc(weightLogs.date_logged)).all();
  },
  createWeightLog(data: InsertWeightLog): WeightLog {
    return db.insert(weightLogs).values({ ...data, id: id() }).returning().get();
  },

  // Medical
  listMedicalLogs(pigId?: string): MedicalLog[] {
    if (pigId) {
      return db
        .select()
        .from(medicalLogs)
        .where(eq(medicalLogs.pig_id, pigId))
        .orderBy(desc(medicalLogs.date_logged))
        .all();
    }
    return db.select().from(medicalLogs).orderBy(desc(medicalLogs.date_logged)).all();
  },
  createMedicalLog(data: InsertMedicalLog): MedicalLog {
    return db.insert(medicalLogs).values({ ...data, id: id() }).returning().get();
  },

  // Mortality
  listMortalityLogs(): MortalityLog[] {
    return db.select().from(mortalityLogs).orderBy(desc(mortalityLogs.date_logged)).all();
  },
  createMortalityLog(data: InsertMortalityLog): MortalityLog {
    const result = db
      .insert(mortalityLogs)
      .values({ ...data, id: id() })
      .returning()
      .get();
    // Mark pig deceased if pig_id provided
    if (data.pig_id) {
      db.update(pigs).set({ status: "Deceased" }).where(eq(pigs.id, data.pig_id)).run();
    }
    return result;
  },
  deleteMortalityLog(logId: string): MortalityLog | undefined {
    const log = db.select().from(mortalityLogs).where(eq(mortalityLogs.id, logId)).get();
    if (!log) return undefined;
    db.delete(mortalityLogs).where(eq(mortalityLogs.id, logId)).run();
    if (log.pig_id) {
      db.update(pigs).set({ status: "Active" }).where(eq(pigs.id, log.pig_id)).run();
    }
    return log;
  },

  // Birth
  listBirthLogs(): BirthLog[] {
    return db.select().from(birthLogs).orderBy(desc(birthLogs.date_logged)).all();
  },
  createBirthLog(data: InsertBirthLog): BirthLog {
    return db.insert(birthLogs).values({ ...data, id: id() }).returning().get();
  },

  // Sales
  listSalesLogs(): SalesLog[] {
    return db.select().from(salesLogs).orderBy(desc(salesLogs.date_logged)).all();
  },
  createSalesLog(data: InsertSalesLog): SalesLog {
    const result = db.insert(salesLogs).values({ ...data, id: id() }).returning().get();
    if (data.pig_id) {
      db.update(pigs).set({ status: "Sold" }).where(eq(pigs.id, data.pig_id)).run();
    }
    return result;
  },

  // Census
  listCensus(): CensusRecord[] {
    return db
      .select()
      .from(censusRecords)
      .orderBy(desc(censusRecords.submitted_at))
      .all();
  },
  createCensus(data: InsertCensus): CensusRecord {
    return db.insert(censusRecords).values({ ...data, id: id() }).returning().get();
  },

  // Settings
  getSettings(): Settings {
    let s = db.select().from(settings).get();
    if (!s) {
      s = db
        .insert(settings)
        .values({
          id: id(),
          zwl_per_usd: 27,
          breed_standard_curves: JSON.stringify({
            weaner_target_kg_at_8w: 20,
            finisher_target_kg_at_24w: 100,
            target_fcr: 2.8,
          }),
          low_bandwidth_mode: false,
        })
        .returning()
        .get();
    }
    return s;
  },
  updateSettings(data: Partial<InsertSettings>): Settings {
    const current = storage.getSettings();
    const updated = db
      .update(settings)
      .set(data)
      .where(eq(settings.id, current.id))
      .returning()
      .get();
    return updated!;
  },

  // ----- Aggregations -----
  getDashboard(): DashboardKpis {
    const allPigs = storage.listPigs();
    const active = allPigs.filter((p) => p.status === "Active");

    const by_category = PIG_CATEGORIES.reduce(
      (acc, c) => {
        acc[c] = active.filter((p) => p.category === c).length;
        return acc;
      },
      {} as Record<PigCategory, number>,
    );

    // Feed stock = sum(lot bags*kg) - sum(logs kg_used)
    const lots = storage.listFeedLots();
    const fLogs = storage.listFeedLogs();
    const totalReceivedKg = lots.reduce(
      (s, l) => s + l.bags_received * l.kg_per_bag,
      0,
    );
    const totalUsedKg = fLogs.reduce((s, l) => s + l.kg_used, 0);
    const stock_remaining_kg = Math.max(0, totalReceivedKg - totalUsedKg);

    // Avg daily 7d
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const last7 = fLogs.filter((l) => l.date_logged >= sevenDaysAgo);
    const used7 = last7.reduce((s, l) => s + l.kg_used, 0);
    const avg_daily_kg_7d = used7 / 7;
    const days_of_feed_left =
      avg_daily_kg_7d > 0 ? Math.floor(stock_remaining_kg / avg_daily_kg_7d) : 99;

    // Refill cost: assume avg cost per bag * bags needed for ~14 days
    const avgCostPerBag =
      lots.reduce((s, l) => s + l.cost_per_bag_usd, 0) / Math.max(1, lots.length);
    const bagsToRefill = Math.ceil((avg_daily_kg_7d * 14) / 50);
    const refill_cost_usd = Math.round(avgCostPerBag * bagsToRefill);

    // FCR last 30d
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    const last30Feed = fLogs
      .filter((l) => l.date_logged >= thirtyDaysAgo)
      .reduce((s, l) => s + l.kg_used, 0);

    // Weight gain 30d: latest weight - weight ~30d ago per pig (sum)
    const allWeights = storage.listWeightLogs();
    const byPig = new Map<string, WeightLog[]>();
    for (const w of allWeights) {
      if (!w.pig_id) continue;
      if (!byPig.has(w.pig_id)) byPig.set(w.pig_id, []);
      byPig.get(w.pig_id)!.push(w);
    }
    let totalGainKg = 0;
    byPig.forEach((logs) => {
      const sorted = [...logs].sort((a, b) =>
        a.date_logged.localeCompare(b.date_logged),
      );
      const recent = sorted.filter((l) => l.date_logged >= thirtyDaysAgo);
      if (recent.length >= 2) {
        totalGainKg += recent[recent.length - 1].weight_kg - recent[0].weight_kg;
      } else if (sorted.length >= 2) {
        const last = sorted[sorted.length - 1];
        const prior = sorted.find((l) => l.date_logged < thirtyDaysAgo);
        if (prior) totalGainKg += last.weight_kg - prior.weight_kg;
      }
    });
    const settingsRow = storage.getSettings();
    const targetCurves = JSON.parse(settingsRow.breed_standard_curves);
    const target_fcr = targetCurves.target_fcr ?? 2.8;
    const fcr = totalGainKg > 0 ? last30Feed / totalGainKg : 0;
    const score: "green" | "amber" | "red" =
      fcr === 0
        ? "amber"
        : fcr <= target_fcr
        ? "green"
        : fcr <= target_fcr * 1.15
        ? "amber"
        : "red";

    // Sparkline: rolling 30d FCR computed weekly for last 8 weeks (only weeks with data)
    const sparkline: { date: string; fcr: number }[] = [];
    for (let weeksBack = 7; weeksBack >= 0; weeksBack--) {
      const end = new Date(Date.now() - weeksBack * 7 * 86400000);
      const start = new Date(end.getTime() - 30 * 86400000);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const feedKg = fLogs
        .filter((l) => l.date_logged >= startStr && l.date_logged <= endStr)
        .reduce((s, l) => s + l.kg_used, 0);
      let gain = 0;
      byPig.forEach((logs) => {
        const inWindow = logs
          .filter((l) => l.date_logged >= startStr && l.date_logged <= endStr)
          .sort((a, b) => a.date_logged.localeCompare(b.date_logged));
        if (inWindow.length >= 2)
          gain += inWindow[inWindow.length - 1].weight_kg - inWindow[0].weight_kg;
      });
      const w = gain > 0 ? Number((feedKg / gain).toFixed(2)) : null;
      if (w !== null && w < 10) {
        sparkline.push({ date: endStr, fcr: w });
      }
    }

    // Mortality rate 30d
    const mort = storage.listMortalityLogs();
    const mort30 = mort.filter((m) => m.date_logged >= thirtyDaysAgo).length;
    const mortPrev = mort.filter(
      (m) =>
        m.date_logged < thirtyDaysAgo &&
        m.date_logged >=
          new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10),
    ).length;
    const total_population = allPigs.length || 1;
    const mortality_rate_30d = Number(
      ((mort30 / total_population) * 100).toFixed(2),
    );
    const mortality_trend_arrow: "up" | "down" | "flat" =
      mort30 > mortPrev ? "up" : mort30 < mortPrev ? "down" : "flat";

    // Upcoming treatments next 7 days
    const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const meds = storage.listMedicalLogs();
    const upcoming = meds
      .filter(
        (m) => m.next_due_date && m.next_due_date >= today() && m.next_due_date <= next7,
      )
      .sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        treatment_type: m.treatment_type,
        product_name: m.product_name,
        next_due_date: m.next_due_date!,
        target: m.pig_id ? `Pig ${m.pig_id.slice(0, 6)}` : `Pen ${m.pen ?? "—"}`,
      }));

    // Census status
    const censuses = storage.listCensus();
    const lastCensus = censuses[0];
    const census_status: "current" | "overdue" =
      lastCensus &&
      new Date(lastCensus.submitted_at).getTime() >
        Date.now() - 7 * 86400000
        ? "current"
        : "overdue";

    return {
      headcount: { total: active.length, by_category },
      feed: {
        stock_remaining_kg: Math.round(stock_remaining_kg),
        avg_daily_kg_7d: Math.round(avg_daily_kg_7d),
        days_of_feed_left,
        refill_cost_usd,
      },
      fcr: {
        current: Number(fcr.toFixed(2)),
        target: target_fcr,
        score,
        sparkline,
      },
      mortality_rate_30d,
      mortality_trend_arrow,
      upcoming_treatments: upcoming,
      census_status,
      last_census_date: lastCensus?.submitted_at ?? null,
      zwl_per_usd: settingsRow.zwl_per_usd,
    };
  },

  getActivityFeed(limit = 30) {
    type Item = {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      icon: string;
    };
    const items: Item[] = [];
    for (const w of storage.listWeightLogs().slice(0, 40)) {
      items.push({
        id: `w-${w.id}`,
        type: "weight",
        title: "Weight recorded",
        description: `${w.weight_kg} kg · ${w.pig_id ? `pig ${w.pig_id.slice(0, 6)}` : "batch"}`,
        timestamp: w.date_logged,
        icon: "scale",
      });
    }
    for (const m of storage.listMedicalLogs().slice(0, 40)) {
      items.push({
        id: `m-${m.id}`,
        type: "treatment",
        title: `${m.treatment_type}`,
        description: `${m.product_name}${m.dose ? ` · ${m.dose}` : ""}`,
        timestamp: m.date_logged,
        icon: "syringe",
      });
    }
    for (const d of storage.listMortalityLogs()) {
      items.push({
        id: `d-${d.id}`,
        type: "mortality",
        title: "Death recorded",
        description: `${d.cause_of_death}${d.pen ? ` · pen ${d.pen}` : ""}`,
        timestamp: d.date_logged,
        icon: "skull",
      });
    }
    for (const b of storage.listBirthLogs()) {
      items.push({
        id: `b-${b.id}`,
        type: "birth",
        title: "Litter born",
        description: `${b.piglets_born_alive} alive${b.piglets_stillborn ? `, ${b.piglets_stillborn} stillborn` : ""}`,
        timestamp: b.date_logged,
        icon: "baby",
      });
    }
    for (const s of storage.listSalesLogs()) {
      items.push({
        id: `s-${s.id}`,
        type: "sale",
        title: "Sale recorded",
        description: `${s.buyer} · $${s.price_usd}`,
        timestamp: s.date_logged,
        icon: "dollar",
      });
    }
    for (const f of storage.listFeedLogs().slice(0, 30)) {
      items.push({
        id: `f-${f.id}`,
        type: "feed",
        title: "Feed used",
        description: `${f.kg_used} kg · ${f.feed_type}${f.pen_or_category ? ` · ${f.pen_or_category}` : ""}`,
        timestamp: f.date_logged,
        icon: "wheat",
      });
    }
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return items.slice(0, limit);
  },

  getAlerts() {
    const dash = storage.getDashboard();
    const alerts: Array<{
      id: string;
      severity: "alert" | "warn" | "info";
      title: string;
      description: string;
      route: string;
      timestamp: string;
    }> = [];
    if (dash.census_status === "overdue") {
      alerts.push({
        id: "census-overdue",
        severity: "warn",
        title: "Sunday Census overdue",
        description: dash.last_census_date
          ? `Last submitted ${new Date(dash.last_census_date).toLocaleDateString()}.`
          : "No census on record yet.",
        route: "/census",
        timestamp: new Date().toISOString(),
      });
    }
    if (dash.feed.days_of_feed_left <= 7) {
      alerts.push({
        id: "feed-low",
        severity: dash.feed.days_of_feed_left <= 3 ? "alert" : "warn",
        title: "Low feed stock",
        description: `${dash.feed.days_of_feed_left} days of feed remaining. Refill cost: $${dash.feed.refill_cost_usd}.`,
        route: "/feed",
        timestamp: new Date().toISOString(),
      });
    }
    if (dash.fcr.score === "red") {
      alerts.push({
        id: "fcr-red",
        severity: "alert",
        title: "FCR exceeds target",
        description: `Current FCR ${dash.fcr.current} vs target ${dash.fcr.target}. Review feed quality and herd health.`,
        route: "/feed",
        timestamp: new Date().toISOString(),
      });
    }
    // Mortality cluster: 3+ same cause in 7 days
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const recent = storage.listMortalityLogs().filter((m) => m.date_logged >= sevenAgo);
    const clusters = new Map<string, number>();
    for (const m of recent) clusters.set(m.cause_of_death, (clusters.get(m.cause_of_death) ?? 0) + 1);
    clusters.forEach((count, cause) => {
      if (count >= 3) {
        alerts.push({
          id: `mortality-${cause}`,
          severity: "alert",
          title: "Possible disease outbreak",
          description: `${count} deaths from ${cause} in last 7 days. Review immediately.`,
          route: "/mortality",
          timestamp: new Date().toISOString(),
        });
      }
    });
    // Treatments due today
    const t = today();
    const meds = storage.listMedicalLogs().filter((m) => m.next_due_date === t);
    if (meds.length > 0) {
      alerts.push({
        id: "treatments-today",
        severity: "info",
        title: `${meds.length} treatment${meds.length > 1 ? "s" : ""} due today`,
        description: meds.map((m) => m.product_name).join(", "),
        route: "/medical",
        timestamp: new Date().toISOString(),
      });
    }
    // Growth lag detector
    const curves = JSON.parse(storage.getSettings().breed_standard_curves);
    const allPigs = storage.listPigs().filter((p) => p.status === "Active");
    const allWeights = storage.listWeightLogs();
    const lagging: string[] = [];
    for (const p of allPigs) {
      if (!p.birth_date) continue;
      const ageWeeks = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (7 * 86400000));
      if (ageWeeks < 8) continue;
      const lastW = allWeights.find((w) => w.pig_id === p.id);
      if (!lastW) continue;
      const target =
        ageWeeks <= 8
          ? curves.weaner_target_kg_at_8w
          : curves.weaner_target_kg_at_8w +
            ((curves.finisher_target_kg_at_24w - curves.weaner_target_kg_at_8w) *
              Math.min(1, (ageWeeks - 8) / 16));
      if (lastW.weight_kg < target * 0.9) lagging.push(p.tag_id);
    }
    if (lagging.length >= 3) {
      alerts.push({
        id: "growth-lag",
        severity: "warn",
        title: `${lagging.length} pigs lagging growth curve`,
        description: `Pigs >10% under target weight: ${lagging.slice(0, 4).join(", ")}${lagging.length > 4 ? "…" : ""}.`,
        route: "/herd",
        timestamp: new Date().toISOString(),
      });
    }
    return alerts;
  },

  getReports(rangeDays = 90) {
    const startStr = new Date(Date.now() - rangeDays * 86400000)
      .toISOString()
      .slice(0, 10);
    const fLogs = storage.listFeedLogs().filter((l) => l.date_logged >= startStr);
    const weights = storage.listWeightLogs();
    const mort = storage.listMortalityLogs().filter((m) => m.date_logged >= startStr);
    const sales = storage.listSalesLogs().filter((s) => s.date_logged >= startStr);
    const allPigs = storage.listPigs();

    // FCR by month
    const fcrByMonth: Record<string, { feed: number; gain: number }> = {};
    for (const f of fLogs) {
      const month = f.date_logged.slice(0, 7);
      fcrByMonth[month] = fcrByMonth[month] ?? { feed: 0, gain: 0 };
      fcrByMonth[month].feed += f.kg_used;
    }
    const byPig = new Map<string, typeof weights>();
    for (const w of weights) {
      if (!w.pig_id) continue;
      if (!byPig.has(w.pig_id)) byPig.set(w.pig_id, []);
      byPig.get(w.pig_id)!.push(w);
    }
    byPig.forEach((logs) => {
      const sorted = [...logs].sort((a, b) =>
        a.date_logged.localeCompare(b.date_logged),
      );
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].date_logged < startStr) continue;
        const month = sorted[i].date_logged.slice(0, 7);
        const gain = sorted[i].weight_kg - sorted[i - 1].weight_kg;
        if (gain > 0) {
          fcrByMonth[month] = fcrByMonth[month] ?? { feed: 0, gain: 0 };
          fcrByMonth[month].gain += gain;
        }
      }
    });
    const fcrTrend = Object.entries(fcrByMonth)
      .map(([month, v]) => ({
        month,
        fcr: v.gain > 0 ? Number((v.feed / v.gain).toFixed(2)) : 0,
        feed_kg: Math.round(v.feed),
        gain_kg: Math.round(v.gain),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Mortality breakdown
    const mortByCause: Record<string, number> = {};
    const mortByPen: Record<string, number> = {};
    for (const m of mort) {
      mortByCause[m.cause_of_death] = (mortByCause[m.cause_of_death] ?? 0) + 1;
      const pen = m.pen ?? "—";
      mortByPen[pen] = (mortByPen[pen] ?? 0) + 1;
    }

    // Sales revenue by month
    const salesByMonth: Record<string, { revenue: number; count: number; kg: number }> = {};
    for (const s of sales) {
      const month = s.date_logged.slice(0, 7);
      salesByMonth[month] = salesByMonth[month] ?? { revenue: 0, count: 0, kg: 0 };
      salesByMonth[month].revenue += s.price_usd;
      salesByMonth[month].count += 1;
      salesByMonth[month].kg += s.weight_kg;
    }
    const salesTrend = Object.entries(salesByMonth)
      .map(([month, v]) => ({
        month,
        revenue: Math.round(v.revenue),
        count: v.count,
        kg: Math.round(v.kg),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Feed cost per kg liveweight
    const lots = storage.listFeedLots();
    const totalFeedCost = fLogs.reduce((s, f) => {
      const lot = lots.find((l) => l.feed_type === f.feed_type);
      const cost = lot ? lot.cost_per_bag_usd / lot.kg_per_bag : 0.6;
      return s + f.kg_used * cost;
    }, 0);
    const totalGain = Object.values(fcrByMonth).reduce((s, v) => s + v.gain, 0);
    const cost_per_kg_lw =
      totalGain > 0 ? Number((totalFeedCost / totalGain).toFixed(2)) : 0;

    // PSY (pigs per sow per year)
    const sows = allPigs.filter((p) => p.category === "Sow").length || 1;
    const piglets = storage
      .listBirthLogs()
      .filter((b) => b.date_logged >= startStr)
      .reduce((s, b) => s + b.piglets_born_alive, 0);
    const psy = Number(((piglets / sows) * (365 / rangeDays)).toFixed(2));

    return {
      range_days: rangeDays,
      fcr_trend: fcrTrend,
      mortality_by_cause: mortByCause,
      mortality_by_pen: mortByPen,
      sales_trend: salesTrend,
      cost_per_kg_lw_usd: cost_per_kg_lw,
      psy,
      total_revenue: Math.round(sales.reduce((s, x) => s + x.price_usd, 0)),
      total_sold_kg: Math.round(sales.reduce((s, x) => s + x.weight_kg, 0)),
    };
  },
};

// ----- Seed data -----
function seedIfEmpty() {
  const existing = db.select().from(pigs).all();
  if (existing.length > 0) return;

  // Settings
  storage.getSettings();

  const pigList: { id: string; tag: string; cat: PigCategory; birth: string; pen: number; breed: string }[] = [];
  let counter = 1;
  const breeds = ["Large White", "Landrace", "Duroc", "Hampshire"];

  // Sows: 8
  for (let i = 0; i < 8; i++) {
    const pid = id();
    const tag = `S-${String(counter++).padStart(3, "0")}`;
    pigList.push({
      id: pid,
      tag,
      cat: "Sow",
      birth: daysAgo(540 + i * 30),
      pen: 1,
      breed: breeds[i % breeds.length],
    });
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Sow",
        status: "Active",
        birth_date: daysAgo(540 + i * 30),
        weight_at_weaning_kg: 6.5,
        current_pen: 1,
        breed: breeds[i % breeds.length],
        created_at: isoDaysAgo(540),
      })
      .run();
  }
  // Boars: 2
  for (let i = 0; i < 2; i++) {
    const pid = id();
    const tag = `B-${String(counter++).padStart(3, "0")}`;
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Boar",
        status: "Active",
        birth_date: daysAgo(720),
        weight_at_weaning_kg: 7.0,
        current_pen: 2,
        breed: "Duroc",
        created_at: isoDaysAgo(720),
      })
      .run();
    pigList.push({ id: pid, tag, cat: "Boar", birth: daysAgo(720), pen: 2, breed: "Duroc" });
  }
  // Piglets: 14
  for (let i = 0; i < 14; i++) {
    const pid = id();
    const tag = `P-${String(counter++).padStart(3, "0")}`;
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Piglet",
        status: "Active",
        birth_date: daysAgo(20 + (i % 14)),
        weight_at_weaning_kg: null,
        current_pen: 3,
        breed: breeds[i % breeds.length],
        created_at: isoDaysAgo(20),
      })
      .run();
    pigList.push({ id: pid, tag, cat: "Piglet", birth: daysAgo(20 + (i % 14)), pen: 3, breed: breeds[i % breeds.length] });
  }
  // Weaners: 18
  for (let i = 0; i < 18; i++) {
    const pid = id();
    const tag = `W-${String(counter++).padStart(3, "0")}`;
    const age = 50 + (i % 10);
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Weaner",
        status: "Active",
        birth_date: daysAgo(age),
        weight_at_weaning_kg: 6.0 + Math.random() * 1.5,
        current_pen: 4 + (i % 2),
        breed: breeds[i % breeds.length],
        created_at: isoDaysAgo(age),
      })
      .run();
    pigList.push({ id: pid, tag, cat: "Weaner", birth: daysAgo(age), pen: 4 + (i % 2), breed: breeds[i % breeds.length] });
  }
  // Growers: 22
  for (let i = 0; i < 22; i++) {
    const pid = id();
    const tag = `G-${String(counter++).padStart(3, "0")}`;
    const age = 100 + (i % 20);
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Grower",
        status: "Active",
        birth_date: daysAgo(age),
        weight_at_weaning_kg: 6.5,
        current_pen: 6 + (i % 3),
        breed: breeds[i % breeds.length],
        created_at: isoDaysAgo(age),
      })
      .run();
    pigList.push({ id: pid, tag, cat: "Grower", birth: daysAgo(age), pen: 6 + (i % 3), breed: breeds[i % breeds.length] });
  }
  // Finishers: 16
  for (let i = 0; i < 16; i++) {
    const pid = id();
    const tag = `F-${String(counter++).padStart(3, "0")}`;
    const age = 150 + (i % 25);
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Finisher",
        status: "Active",
        birth_date: daysAgo(age),
        weight_at_weaning_kg: 6.5,
        current_pen: 9 + (i % 3),
        breed: breeds[i % breeds.length],
        created_at: isoDaysAgo(age),
      })
      .run();
    pigList.push({ id: pid, tag, cat: "Finisher", birth: daysAgo(age), pen: 9 + (i % 3), breed: breeds[i % breeds.length] });
  }

  // Weight logs — multiple per pig over 6 weeks for chart richness
  for (const p of pigList) {
    if (p.cat === "Boar") continue;
    const ageDays = Math.floor((Date.now() - new Date(p.birth).getTime()) / 86400000);
    const samples = Math.min(6, Math.max(2, Math.floor(ageDays / 14)));
    for (let s = 0; s < samples; s++) {
      const sampleAge = (ageDays / samples) * (s + 1);
      // simple growth curve: start 1.5kg birth → ~1kg/wk weaner → 0.7 kg/day grower
      let kg = 1.5;
      if (sampleAge <= 28) kg = 1.5 + (sampleAge / 28) * 5; // ~6.5 weaning
      else if (sampleAge <= 56) kg = 6.5 + ((sampleAge - 28) / 28) * 13.5; // ~20kg
      else if (sampleAge <= 168) kg = 20 + ((sampleAge - 56) / 112) * 80; // ~100kg
      else kg = 100 + ((sampleAge - 168) / 30) * 8;
      // small random noise
      kg = Math.max(1.4, kg * (0.92 + Math.random() * 0.16));
      const dateLogged = new Date(
        new Date(p.birth).getTime() + sampleAge * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      if (dateLogged > today()) continue;
      db.insert(weightLogs)
        .values({
          id: id(),
          pig_id: p.id,
          weight_kg: Number(kg.toFixed(1)),
          date_logged: dateLogged,
        })
        .run();
    }
  }

  // Feed lots — receipts over last 90 days, sized to leave ~10-12 days remaining
  const feedTypes: FeedType[] = ["Creep", "Grower", "Finisher", "Sow"];
  // ~42 days * 4 bags = 168 bags consumed; receive 180 to leave ~12 bags = 600kg = ~3 days
  // We want a teaching scenario where feed runs low — ~10 days left.
  // Bump receipts to ~210 bags total → ~10 days surplus.
  const lotPlans: { ft: FeedType; bags: number; daysAgoVal: number; cost: number; supplier: string }[] = [
    { ft: "Sow", bags: 50, daysAgoVal: 70, cost: 32, supplier: "AgriFeeds Harare" },
    { ft: "Creep", bags: 40, daysAgoVal: 65, cost: 38, supplier: "National Foods" },
    { ft: "Grower", bags: 60, daysAgoVal: 50, cost: 30, supplier: "Profeeds" },
    { ft: "Finisher", bags: 50, daysAgoVal: 35, cost: 30, supplier: "AgriFeeds Harare" },
    { ft: "Grower", bags: 30, daysAgoVal: 18, cost: 30, supplier: "Profeeds" },
  ];
  for (const p of lotPlans) {
    db.insert(feedLots)
      .values({
        id: id(),
        feed_type: p.ft,
        bags_received: p.bags,
        kg_per_bag: 50,
        cost_per_bag_usd: p.cost,
        supplier: p.supplier,
        date_received: daysAgo(p.daysAgoVal),
      })
      .run();
  }

  // Feed logs: ~6 weeks daily — calibrated so FCR settles ~2.7-3.0
  // Active herd ~80 head; daily feed ~2.5 kg/head avg = ~200 kg/day total => 4 bags
  for (let d = 42; d >= 0; d--) {
    const date = daysAgo(d);
    // Distribute 4 bags/day across feed types with some variance
    const distribution: Record<FeedType, number> = {
      Creep: 1,
      Sow: 1,
      Grower: 1,
      Finisher: 1,
    };
    // small daily variance
    const variance = Math.random() < 0.5 ? 0 : 1;
    distribution.Grower += variance;
    for (const ft of feedTypes) {
      const bags = distribution[ft];
      db.insert(feedLogs)
        .values({
          id: id(),
          feed_type: ft,
          bags_opened: bags,
          kg_used: bags * 50,
          pen_or_category: ft,
          date_logged: date,
          recorded_by: "Tendai (Manager)",
        })
        .run();
    }
  }

  // Medical logs
  const sows = pigList.filter((p) => p.cat === "Sow");
  const weaners = pigList.filter((p) => p.cat === "Weaner");
  db.insert(medicalLogs)
    .values({
      id: id(),
      pig_id: sows[0]?.id ?? null,
      pen: "1",
      treatment_type: "Vaccination",
      product_name: "Parvovirus + Erysipelas",
      dose: "2 ml IM",
      date_logged: daysAgo(20),
      next_due_date: daysAgo(-1),
      notes: "Pre-farrowing booster",
    })
    .run();
  db.insert(medicalLogs)
    .values({
      id: id(),
      pen: "4",
      treatment_type: "Iron Injection",
      product_name: "Ferrodex 200",
      dose: "1 ml IM each",
      date_logged: daysAgo(7),
      next_due_date: null,
      notes: "All piglets 3-day routine",
    })
    .run();
  db.insert(medicalLogs)
    .values({
      id: id(),
      pen: "6",
      treatment_type: "Deworming",
      product_name: "Ivermectin 1%",
      dose: "1 ml / 33 kg",
      date_logged: daysAgo(14),
      next_due_date: daysAgo(-3),
      notes: "Routine grower deworming",
    })
    .run();
  db.insert(medicalLogs)
    .values({
      id: id(),
      pig_id: weaners[2]?.id ?? null,
      pen: "4",
      treatment_type: "Antibiotic",
      product_name: "Penstrep",
      dose: "5 ml IM",
      date_logged: daysAgo(2),
      next_due_date: daysAgo(-5),
      notes: "Mild respiratory symptoms — monitor",
    })
    .run();

  // Mortality logs (different causes)
  db.insert(mortalityLogs)
    .values({
      id: id(),
      pen: "3",
      category: "Piglet",
      cause_of_death: "Crushing",
      notes: "Sow rolled on piglet overnight",
      date_logged: daysAgo(5),
    })
    .run();
  db.insert(mortalityLogs)
    .values({
      id: id(),
      pen: "6",
      category: "Grower",
      cause_of_death: "Disease",
      notes: "Suspected enteritis — vet contacted",
      date_logged: daysAgo(3),
    })
    .run();
  db.insert(mortalityLogs)
    .values({
      id: id(),
      pen: "3",
      category: "Piglet",
      cause_of_death: "Stillborn",
      notes: "From sow S-002 farrowing",
      date_logged: daysAgo(12),
    })
    .run();

  // Birth log
  if (sows[1]) {
    db.insert(birthLogs)
      .values({
        id: id(),
        sow_pig_id: sows[1].id,
        piglets_born_alive: 11,
        piglets_stillborn: 1,
        date_logged: daysAgo(12),
      })
      .run();
  }

  // Sales — 3 in last 60 days
  const finishers = pigList.filter((p) => p.cat === "Finisher");
  for (let i = 0; i < 3; i++) {
    const pig = finishers[i];
    if (!pig) break;
    db.insert(salesLogs)
      .values({
        id: id(),
        pig_id: pig.id,
        buyer: ["Surrey Abattoir", "Colcom Foods", "Local Butcher (Marondera)"][i],
        weight_kg: 95 + i * 4,
        price_usd: (95 + i * 4) * 2.4,
        date_logged: daysAgo(15 + i * 12),
      })
      .run();
  }

  // Census — last one 8 days ago (so dashboard shows overdue)
  const byCat: Record<string, number> = {};
  for (const p of pigList) byCat[p.cat] = (byCat[p.cat] ?? 0) + 1;
  db.insert(censusRecords)
    .values({
      id: id(),
      week_start_date: daysAgo(14),
      total_count: pigList.length,
      by_category: JSON.stringify(byCat),
      submitted_at: isoDaysAgo(8),
      submitted_by: "Tendai (Manager)",
    })
    .run();
}

seedIfEmpty();
