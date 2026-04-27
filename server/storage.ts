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
  pens,
  medicationProtocols,
  penReminders,
  employees,
  expenses,
  income,
  payrollRuns,
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
  Pen,
  InsertPen,
  MedicationProtocol,
  InsertMedicationProtocol,
  PenReminder,
  InsertPenReminder,
  PenSummary,
  Employee,
  InsertEmployee,
  Expense,
  InsertExpense,
  Income,
  InsertIncome,
  PayrollRun,
  InsertPayrollRun,
  ExpenseCategory,
  IncomeCategory,
  LineageNode,
  LineageResponse,
  BreedingCheck,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// On Render, DATA_DIR points at a mounted persistent disk so data.db survives redeploys.
import { mkdirSync } from "node:fs";
const dataDir = process.env.DATA_DIR || ".";
try { mkdirSync(dataDir, { recursive: true }); } catch {}
const dbPath = `${dataDir.replace(/\/$/, "")}/data.db`;
const sqlite = new Database(dbPath);
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
      source TEXT NOT NULL DEFAULT 'Bred',
      purchase_date TEXT,
      purchase_price_usd REAL,
      purchase_supplier TEXT,
      mother_id TEXT,
      father_id TEXT,
      sex TEXT NOT NULL DEFAULT 'F',
      name TEXT,
      notes TEXT,
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
    CREATE TABLE IF NOT EXISTS pens (
      id INTEGER PRIMARY KEY,
      role TEXT NOT NULL,
      notes TEXT,
      last_cleaned_date TEXT
    );
    CREATE TABLE IF NOT EXISTS medication_protocols (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_value INTEGER NOT NULL DEFAULT 0,
      product_name TEXT NOT NULL,
      dose TEXT NOT NULL,
      route TEXT NOT NULL,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      rationale TEXT,
      is_critical INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS pen_reminders (
      id TEXT PRIMARY KEY,
      pen INTEGER NOT NULL,
      pig_id TEXT,
      protocol_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      completed_medical_log_id TEXT
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      start_date TEXT NOT NULL,
      monthly_wage_usd REAL NOT NULL DEFAULT 100,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      vendor TEXT,
      linked_pig_id TEXT,
      linked_employee_id TEXT,
      linked_feed_lot_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      linked_sale_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      run_date TEXT NOT NULL,
      total_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
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

    // Upcoming treatments next 7 days — prefer pen_reminders, fall back to medical_logs.next_due_date
    const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const protocolsById = new Map<string, MedicationProtocol>();
    storage.listProtocols().forEach((p) => protocolsById.set(p.id, p));
    const reminders = db
      .select()
      .from(penReminders)
      .all()
      .filter((r) => r.status === "pending" && r.due_date <= next7)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    let upcoming: DashboardKpis["upcoming_treatments"];
    if (reminders.length > 0) {
      upcoming = reminders.slice(0, 6).map((r) => {
        const proto = protocolsById.get(r.protocol_id);
        return {
          id: r.id,
          treatment_type: proto?.name ?? "Treatment",
          product_name: proto?.product_name ?? "—",
          next_due_date: r.due_date,
          target: `Pen ${r.pen}`,
          pen: r.pen,
          is_critical: proto?.is_critical === 1,
        };
      });
    } else {
      const meds = storage.listMedicalLogs();
      upcoming = meds
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
          pen: m.pen ? Number(m.pen) : null,
          is_critical: false,
        }));
    }

    // Pens health summary (skip if pens table empty)
    const pensSummary = storage.getPensSummary();
    const pens_health_summary = {
      green: pensSummary.filter((p) => p.health_status === "green").length,
      amber: pensSummary.filter((p) => p.health_status === "amber").length,
      red: pensSummary.filter((p) => p.health_status === "red").length,
    };
    const pens_strip = pensSummary.map((p) => ({
      id: p.id,
      role: p.role,
      health_status: p.health_status,
      pending: p.pending_count,
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

    // Cash position (last 30d)
    const expRows = db.select().from(expenses).all();
    const incRows = db.select().from(income).all();
    const thirtyAgoStr = thirtyDaysAgo;
    const exp30 = expRows.filter((e) => e.date >= thirtyAgoStr).reduce((s, x) => s + x.amount_usd, 0);
    const inc30 = incRows.filter((i) => i.date >= thirtyAgoStr).reduce((s, x) => s + x.amount_usd, 0);
    const cash_position_30d = Math.round((inc30 - exp30) * 100) / 100;

    // Pending payroll: most-recent run with status pending
    const allRuns = db.select().from(payrollRuns).all().sort((a, b) => b.month.localeCompare(a.month));
    const pendingRun = allRuns.find((r) => r.status === "pending");
    let pending_payroll: DashboardKpis["pending_payroll"] = null;
    if (pendingRun) {
      const activeEmps = db.select().from(employees).all().filter((e) => e.active === 1);
      pending_payroll = {
        month: pendingRun.month,
        total_usd: pendingRun.total_usd,
        employee_count: activeEmps.length,
      };
    }

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
      pens_health_summary,
      pens_strip,
      census_status,
      last_census_date: lastCensus?.submitted_at ?? null,
      zwl_per_usd: settingsRow.zwl_per_usd,
      cash_position_30d,
      pending_payroll,
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

  // Pens
  listPens(): Pen[] {
    return db.select().from(pens).orderBy(pens.id).all();
  },
  getPen(penId: number): Pen | undefined {
    return db.select().from(pens).where(eq(pens.id, penId)).get();
  },
  upsertPen(data: InsertPen): Pen {
    const existing = db.select().from(pens).where(eq(pens.id, data.id!)).get();
    if (existing) {
      return db.update(pens).set(data).where(eq(pens.id, data.id!)).returning().get();
    }
    return db.insert(pens).values(data).returning().get();
  },
  updatePen(penId: number, data: Partial<InsertPen>): Pen | undefined {
    return db.update(pens).set(data).where(eq(pens.id, penId)).returning().get();
  },

  // Medication protocols
  listProtocols(): MedicationProtocol[] {
    return db.select().from(medicationProtocols).all();
  },
  getProtocol(pid: string): MedicationProtocol | undefined {
    return db.select().from(medicationProtocols).where(eq(medicationProtocols.id, pid)).get();
  },
  createProtocol(data: InsertMedicationProtocol): MedicationProtocol {
    return db
      .insert(medicationProtocols)
      .values({ ...data, id: id() })
      .returning()
      .get();
  },
  updateProtocol(pid: string, data: Partial<InsertMedicationProtocol>): MedicationProtocol | undefined {
    return db
      .update(medicationProtocols)
      .set(data)
      .where(eq(medicationProtocols.id, pid))
      .returning()
      .get();
  },

  // Pen reminders
  listReminders(filter?: { pen?: number; status?: string }): PenReminder[] {
    let q = db.select().from(penReminders).orderBy(penReminders.due_date).all();
    if (filter?.pen != null) q = q.filter((r) => r.pen === filter.pen);
    if (filter?.status) q = q.filter((r) => r.status === filter.status);
    return q;
  },
  getReminder(rid: string): PenReminder | undefined {
    return db.select().from(penReminders).where(eq(penReminders.id, rid)).get();
  },
  createReminder(data: InsertPenReminder): PenReminder {
    return db
      .insert(penReminders)
      .values({ ...data, id: id() })
      .returning()
      .get();
  },
  updateReminder(rid: string, data: Partial<PenReminder>): PenReminder | undefined {
    return db.update(penReminders).set(data).where(eq(penReminders.id, rid)).returning().get();
  },
  clearPendingReminders() {
    db.delete(penReminders).where(eq(penReminders.status, "pending")).run();
  },

  // Pen summary aggregations
  getPensSummary(): PenSummary[] {
    const allPens = storage.listPens();
    const allPigs = storage.listPigs().filter((p) => p.status === "Active");
    const allMeds = storage.listMedicalLogs();
    const allMort = storage.listMortalityLogs();
    const allReminders = db.select().from(penReminders).all();
    const protocolsById = new Map<string, MedicationProtocol>();
    storage.listProtocols().forEach((p) => protocolsById.set(p.id, p));
    const todayStr = today();
    const sevenAgo = daysAgo(7);
    const threeFromNow = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    return allPens.map((p) => {
      const pigsInPen = allPigs.filter((pg) => pg.current_pen === p.id);
      const category_mix: Record<string, number> = {};
      for (const pg of pigsInPen) category_mix[pg.category] = (category_mix[pg.category] ?? 0) + 1;

      const penReminderRows = allReminders
        .filter((r) => r.pen === p.id && r.status === "pending")
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      const overdue = penReminderRows.filter((r) => r.due_date < todayStr);
      const criticalOverdue = overdue.some((r) => protocolsById.get(r.protocol_id)?.is_critical === 1);
      const dueSoon = penReminderRows.filter((r) => r.due_date >= todayStr && r.due_date <= threeFromNow);

      const mort7 = allMort.filter((m) => String(m.pen) === String(p.id) && m.date_logged >= sevenAgo).length;

      let health_status: "green" | "amber" | "red" = "green";
      if (overdue.length > 0 || criticalOverdue || mort7 >= 2) health_status = "red";
      else if (dueSoon.length > 0 || mort7 === 1) health_status = "amber";

      const next = penReminderRows[0];
      const next_due_reminder = next
        ? { ...next, protocol: protocolsById.get(next.protocol_id)! }
        : null;

      const lastTreatment =
        allMeds
          .filter((m) => String(m.pen) === String(p.id))
          .sort((a, b) => b.date_logged.localeCompare(a.date_logged))[0] ?? null;

      const days_since_cleaned = p.last_cleaned_date
        ? Math.floor((Date.now() - new Date(p.last_cleaned_date).getTime()) / 86400000)
        : null;

      return {
        id: p.id,
        role: p.role,
        notes: p.notes,
        last_cleaned_date: p.last_cleaned_date,
        occupancy: pigsInPen.length,
        category_mix,
        health_status,
        next_due_reminder,
        last_treatment: lastTreatment,
        days_since_cleaned,
        mortality_7d: mort7,
        pending_count: penReminderRows.length,
        overdue_count: overdue.length,
      };
    });
  },

  getPenDetail(penId: number) {
    const pen = storage.getPen(penId);
    if (!pen) return null;
    const pigsInPen = storage.listPigs().filter((p) => p.current_pen === penId && p.status === "Active");
    const medsForPen = storage
      .listMedicalLogs()
      .filter((m) => String(m.pen) === String(penId))
      .slice(0, 20);
    const mortForPen = storage
      .listMortalityLogs()
      .filter((m) => String(m.pen) === String(penId));
    const sevenAgo = daysAgo(7);
    const thirtyAgo = daysAgo(30);
    const mort_7d = mortForPen.filter((m) => m.date_logged >= sevenAgo).length;
    const mort_30d = mortForPen.filter((m) => m.date_logged >= thirtyAgo).length;

    const protocolsById = new Map<string, MedicationProtocol>();
    storage.listProtocols().forEach((pp) => protocolsById.set(pp.id, pp));
    const reminders = db
      .select()
      .from(penReminders)
      .where(eq(penReminders.pen, penId))
      .all()
      .filter((r) => r.status === "pending")
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((r) => ({ ...r, protocol: protocolsById.get(r.protocol_id)! }));

    const summary = storage.getPensSummary().find((s) => s.id === penId)!;

    return {
      pen,
      summary,
      pigs: pigsInPen,
      reminders,
      medical_logs: medsForPen,
      mortality_logs: mortForPen.slice(0, 20),
      mort_7d,
      mort_30d,
    };
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

  // ----- Employees -----
  listEmployees(): Employee[] {
    return db.select().from(employees).all();
  },
  getEmployee(eid: string): Employee | undefined {
    return db.select().from(employees).where(eq(employees.id, eid)).get();
  },
  createEmployee(data: InsertEmployee): Employee {
    return db.insert(employees).values({ ...data, id: id() }).returning().get();
  },
  updateEmployee(eid: string, data: Partial<InsertEmployee>): Employee | undefined {
    return db.update(employees).set(data).where(eq(employees.id, eid)).returning().get();
  },

  // ----- Expenses -----
  listExpenses(filter?: { category?: string; from?: string; to?: string }): Expense[] {
    let rows = db.select().from(expenses).orderBy(desc(expenses.date)).all();
    if (filter?.category) rows = rows.filter((r) => r.category === filter.category);
    if (filter?.from) rows = rows.filter((r) => r.date >= filter.from!);
    if (filter?.to) rows = rows.filter((r) => r.date <= filter.to!);
    return rows;
  },
  createExpense(data: InsertExpense): Expense {
    return db
      .insert(expenses)
      .values({ ...data, id: id(), created_at: new Date().toISOString() })
      .returning()
      .get();
  },
  deleteExpense(eid: string) {
    db.delete(expenses).where(eq(expenses.id, eid)).run();
  },

  // ----- Income -----
  listIncome(): Income[] {
    return db.select().from(income).orderBy(desc(income.date)).all();
  },
  createIncome(data: InsertIncome): Income {
    return db
      .insert(income)
      .values({ ...data, id: id(), created_at: new Date().toISOString() })
      .returning()
      .get();
  },
  deleteIncome(iid: string) {
    db.delete(income).where(eq(income.id, iid)).run();
  },

  // ----- Payroll -----
  listPayrollRuns(): PayrollRun[] {
    return db.select().from(payrollRuns).orderBy(desc(payrollRuns.month)).all();
  },
  getPayrollRunByMonth(month: string): PayrollRun | undefined {
    return db.select().from(payrollRuns).where(eq(payrollRuns.month, month)).get();
  },
  createPayrollRun(data: InsertPayrollRun): PayrollRun {
    return db.insert(payrollRuns).values({ ...data, id: id() }).returning().get();
  },
  updatePayrollRun(rid: string, data: Partial<InsertPayrollRun>): PayrollRun | undefined {
    return db.update(payrollRuns).set(data).where(eq(payrollRuns.id, rid)).returning().get();
  },
  /** Run payroll for a month — generates Wages expenses for active employees. Idempotent. */
  runPayroll(month: string): { run: PayrollRun; expenses: Expense[]; alreadyDone: boolean } {
    const existing = storage.getPayrollRunByMonth(month);
    if (existing && existing.status === "paid") {
      return { run: existing, expenses: [], alreadyDone: true };
    }
    const active = storage.listEmployees().filter((e) => e.active === 1);
    const total = active.reduce((s, e) => s + e.monthly_wage_usd, 0);
    const today_ = today();
    const created: Expense[] = [];
    for (const emp of active) {
      const exp = storage.createExpense({
        date: today_,
        category: "Wages",
        description: `${emp.name} — ${emp.role} wages for ${month}`,
        amount_usd: emp.monthly_wage_usd,
        vendor: null,
        linked_pig_id: null,
        linked_employee_id: emp.id,
        linked_feed_lot_id: null,
      });
      created.push(exp);
    }
    let run: PayrollRun;
    if (existing) {
      run = storage.updatePayrollRun(existing.id, {
        run_date: today_,
        total_usd: total,
        status: "paid",
      })!;
    } else {
      run = storage.createPayrollRun({
        month,
        run_date: today_,
        total_usd: total,
        status: "paid",
      });
    }
    return { run, expenses: created, alreadyDone: false };
  },

  // ----- Budget aggregations -----
  getBudgetSummary(month?: string) {
    const now = new Date();
    const ym = month ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const [y, m] = ym.split("-").map(Number);
    const monthStart = `${ym}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;
    // Prior month
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const prevYm = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const prevStart = `${prevYm}-01`;
    const prevLast = new Date(Date.UTC(prevDate.getUTCFullYear(), prevDate.getUTCMonth() + 1, 0)).getUTCDate();
    const prevEnd = `${prevYm}-${String(prevLast).padStart(2, "0")}`;

    const allExp = db.select().from(expenses).all();
    const allInc = db.select().from(income).all();
    const inMonth = (d: string) => d >= monthStart && d <= monthEnd;
    const inPrev = (d: string) => d >= prevStart && d <= prevEnd;
    const inYear = (d: string) => d.startsWith(`${y}-`);

    const expThis = allExp.filter((e) => inMonth(e.date));
    const incThis = allInc.filter((i) => inMonth(i.date));
    const expPrev = allExp.filter((e) => inPrev(e.date));
    const incPrev = allInc.filter((i) => inPrev(i.date));
    const expYTD = allExp.filter((e) => inYear(e.date));
    const incYTD = allInc.filter((i) => inYear(i.date));

    const sum = (arr: { amount_usd: number }[]) => arr.reduce((s, x) => s + x.amount_usd, 0);

    const expBreakdown: Record<string, number> = {};
    for (const e of expThis) expBreakdown[e.category] = (expBreakdown[e.category] ?? 0) + e.amount_usd;

    const topExpenses = [...expThis].sort((a, b) => b.amount_usd - a.amount_usd).slice(0, 5);

    return {
      month: ym,
      income_this_month: Math.round(sum(incThis) * 100) / 100,
      expenses_this_month: Math.round(sum(expThis) * 100) / 100,
      net_this_month: Math.round((sum(incThis) - sum(expThis)) * 100) / 100,
      income_prev_month: Math.round(sum(incPrev) * 100) / 100,
      expenses_prev_month: Math.round(sum(expPrev) * 100) / 100,
      net_prev_month: Math.round((sum(incPrev) - sum(expPrev)) * 100) / 100,
      ytd_income: Math.round(sum(incYTD) * 100) / 100,
      ytd_expenses: Math.round(sum(expYTD) * 100) / 100,
      ytd_net: Math.round((sum(incYTD) - sum(expYTD)) * 100) / 100,
      expense_breakdown: expBreakdown,
      top_expenses: topExpenses,
    };
  },

  getBudgetTrend(months = 12) {
    const allExp = db.select().from(expenses).all();
    const allInc = db.select().from(income).all();
    const out: Array<{ month: string; income: number; expenses: number; net: number }> = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const incs = allInc.filter((x) => x.date.startsWith(ym)).reduce((s, x) => s + x.amount_usd, 0);
      const exps = allExp.filter((x) => x.date.startsWith(ym)).reduce((s, x) => s + x.amount_usd, 0);
      out.push({
        month: ym,
        income: Math.round(incs * 100) / 100,
        expenses: Math.round(exps * 100) / 100,
        net: Math.round((incs - exps) * 100) / 100,
      });
    }
    return out;
  },

  getCostPerKg() {
    const ninetyAgo = daysAgo(90);
    const allExp = db.select().from(expenses).all().filter((e) => e.date >= ninetyAgo);
    const totalCost = allExp.reduce((s, e) => s + e.amount_usd, 0);
    // total kg liveweight produced = total weight gain across active pigs
    const allWeights = storage.listWeightLogs();
    const byPig = new Map<string, typeof allWeights>();
    for (const w of allWeights) {
      if (!w.pig_id) continue;
      if (!byPig.has(w.pig_id)) byPig.set(w.pig_id, []);
      byPig.get(w.pig_id)!.push(w);
    }
    let totalGainKg = 0;
    byPig.forEach((logs) => {
      const sorted = [...logs].sort((a, b) => a.date_logged.localeCompare(b.date_logged));
      const inWindow = sorted.filter((l) => l.date_logged >= ninetyAgo);
      if (inWindow.length >= 2) {
        totalGainKg += inWindow[inWindow.length - 1].weight_kg - inWindow[0].weight_kg;
      }
    });
    // Plus sold kg in window
    const sales = storage.listSalesLogs().filter((s) => s.date_logged >= ninetyAgo);
    const soldKg = sales.reduce((s, x) => s + x.weight_kg, 0);
    const total = Math.max(1, totalGainKg + soldKg * 0.2); // slight blend so cost-per-kg is meaningful
    return {
      total_expenses_usd: Math.round(totalCost * 100) / 100,
      total_kg_lw: Math.round((totalGainKg + soldKg) * 10) / 10,
      cost_per_kg_usd: Number((totalCost / Math.max(1, totalGainKg + soldKg)).toFixed(2)),
    };
  },

  // ----- Lineage -----
  toLineageNode(p: Pig | undefined | null): LineageNode | null {
    if (!p) return null;
    return {
      id: p.id,
      tag_id: p.tag_id,
      name: p.name ?? null,
      category: p.category,
      sex: p.sex,
      status: p.status,
      source: p.source,
    };
  },

  /** Build a 3-generation lineage tree for a pig including siblings and offspring. */
  getLineage(pigId: string): LineageResponse | null {
    const all = storage.listPigs();
    const byId = new Map(all.map((p) => [p.id, p] as const));
    const root = byId.get(pigId);
    if (!root) return null;

    const lookup = (i: string | null | undefined) => (i ? byId.get(i) ?? null : null);
    const mother = lookup(root.mother_id);
    const father = lookup(root.father_id);

    const mat_gm = lookup(mother?.mother_id);
    const mat_gf = lookup(mother?.father_id);
    const pat_gm = lookup(father?.mother_id);
    const pat_gf = lookup(father?.father_id);

    const ggps: (Pig | null)[] = [
      lookup(mat_gm?.mother_id),
      lookup(mat_gm?.father_id),
      lookup(mat_gf?.mother_id),
      lookup(mat_gf?.father_id),
      lookup(pat_gm?.mother_id),
      lookup(pat_gm?.father_id),
      lookup(pat_gf?.mother_id),
      lookup(pat_gf?.father_id),
    ];

    // Siblings
    const fullSibs = all.filter(
      (p) =>
        p.id !== root.id &&
        root.mother_id &&
        root.father_id &&
        p.mother_id === root.mother_id &&
        p.father_id === root.father_id,
    );
    const halfSibs = all.filter(
      (p) =>
        p.id !== root.id &&
        ((root.mother_id && p.mother_id === root.mother_id) ||
          (root.father_id && p.father_id === root.father_id)) &&
        !(
          root.mother_id &&
          root.father_id &&
          p.mother_id === root.mother_id &&
          p.father_id === root.father_id
        ),
    );

    const offspring = all.filter((p) => p.mother_id === root.id || p.father_id === root.id);

    // Coefficient: simple — see if any same ancestor appears on both maternal & paternal side
    // Default 0
    const ancestorIdsM = new Set<string>();
    const ancestorIdsF = new Set<string>();
    function walk(node: Pig | null, depth: number, set: Set<string>) {
      if (!node || depth > 3) return;
      set.add(node.id);
      walk(lookup(node.mother_id), depth + 1, set);
      walk(lookup(node.father_id), depth + 1, set);
    }
    walk(mother, 1, ancestorIdsM);
    walk(father, 1, ancestorIdsF);
    let coi = 0;
    for (const id_ of ancestorIdsM) {
      if (ancestorIdsF.has(id_)) {
        // Add 0.25 if direct parent shared (not possible here), 0.125 grandparent, 0.0625 ggp
        // Approximate: each shared ancestor contributes 1/2^(n+1) where n is generation distance
        coi += 0.0625;
      }
    }
    coi = Math.min(0.5, Number(coi.toFixed(4)));

    return {
      pig: storage.toLineageNode(root)!,
      parents: { mother: storage.toLineageNode(mother), father: storage.toLineageNode(father) },
      grandparents: {
        maternal_grandmother: storage.toLineageNode(mat_gm),
        maternal_grandfather: storage.toLineageNode(mat_gf),
        paternal_grandmother: storage.toLineageNode(pat_gm),
        paternal_grandfather: storage.toLineageNode(pat_gf),
      },
      great_grandparents: ggps.map((g) => storage.toLineageNode(g)).filter((x): x is LineageNode => !!x),
      full_siblings: fullSibs.map((p) => storage.toLineageNode(p)!).filter(Boolean),
      half_siblings: halfSibs.map((p) => storage.toLineageNode(p)!).filter(Boolean),
      offspring: offspring.map((p) => storage.toLineageNode(p)!).filter(Boolean),
      coefficient_of_inbreeding: coi,
    };
  },

  /** Check if a proposed female × male pairing has inbreeding risk. */
  checkBreeding(femaleId: string, maleId: string): BreedingCheck {
    if (femaleId === maleId) {
      return { allowed: false, severity: "block", reason: "Cannot breed a pig with itself.", coefficient: 1 };
    }
    const all = storage.listPigs();
    const byId = new Map(all.map((p) => [p.id, p] as const));
    const f = byId.get(femaleId);
    const m = byId.get(maleId);
    if (!f || !m) {
      return { allowed: false, severity: "block", reason: "One of the pigs does not exist.", coefficient: 0 };
    }
    if (f.sex !== "F" || m.sex !== "M") {
      return {
        allowed: false,
        severity: "block",
        reason: "Pairing must be one female (F) and one male (M).",
        coefficient: 0,
      };
    }

    // Direct parent-offspring
    if (f.mother_id === m.id || f.father_id === m.id) {
      return {
        allowed: false,
        severity: "block",
        reason: `Direct parent–offspring relationship: ${m.tag_id}${m.name ? " (" + m.name + ")" : ""} is a parent of ${f.tag_id}.`,
        coefficient: 0.25,
      };
    }
    if (m.mother_id === f.id || m.father_id === f.id) {
      return {
        allowed: false,
        severity: "block",
        reason: `Direct parent–offspring relationship: ${f.tag_id}${f.name ? " (" + f.name + ")" : ""} is a parent of ${m.tag_id}.`,
        coefficient: 0.25,
      };
    }

    // Full siblings: same mother AND father (both must exist)
    if (
      f.mother_id &&
      f.father_id &&
      f.mother_id === m.mother_id &&
      f.father_id === m.father_id
    ) {
      const motherTag = byId.get(f.mother_id)?.tag_id ?? "unknown";
      const fatherTag = byId.get(f.father_id)?.tag_id ?? "unknown";
      return {
        allowed: false,
        severity: "block",
        reason: `Full siblings — same mother (${motherTag}) and father (${fatherTag}).`,
        coefficient: 0.25,
      };
    }

    // Half siblings
    if (
      (f.mother_id && f.mother_id === m.mother_id) ||
      (f.father_id && f.father_id === m.father_id)
    ) {
      const sharedParentId = f.mother_id === m.mother_id ? f.mother_id : f.father_id;
      const sharedTag = sharedParentId ? byId.get(sharedParentId)?.tag_id ?? "unknown" : "unknown";
      return {
        allowed: false,
        severity: "block",
        reason: `Half siblings — share ${f.mother_id === m.mother_id ? "mother" : "father"} (${sharedTag}).`,
        coefficient: 0.125,
      };
    }

    // Grandparent–grandoffspring
    const grandparentsOfF = [f.mother_id, f.father_id]
      .map((pid) => (pid ? byId.get(pid) : null))
      .filter((p): p is Pig => !!p)
      .flatMap((p) => [p.mother_id, p.father_id].filter(Boolean) as string[]);
    if (grandparentsOfF.includes(m.id)) {
      return {
        allowed: true,
        severity: "warn",
        reason: `${m.tag_id}${m.name ? " (" + m.name + ")" : ""} is a grandparent of ${f.tag_id} — proceed with caution.`,
        coefficient: 0.125,
      };
    }
    const grandparentsOfM = [m.mother_id, m.father_id]
      .map((pid) => (pid ? byId.get(pid) : null))
      .filter((p): p is Pig => !!p)
      .flatMap((p) => [p.mother_id, p.father_id].filter(Boolean) as string[]);
    if (grandparentsOfM.includes(f.id)) {
      return {
        allowed: true,
        severity: "warn",
        reason: `${f.tag_id}${f.name ? " (" + f.name + ")" : ""} is a grandparent of ${m.tag_id} — proceed with caution.`,
        coefficient: 0.125,
      };
    }

    // Cousins via shared grandparent
    const sharedGrandparent = grandparentsOfF.find((id_) => grandparentsOfM.includes(id_));
    if (sharedGrandparent) {
      const tag = byId.get(sharedGrandparent)?.tag_id ?? "unknown";
      return {
        allowed: true,
        severity: "warn",
        reason: `Share a grandparent (${tag}) — first cousins. Proceed with caution.`,
        coefficient: 0.0625,
      };
    }

    return { allowed: true, severity: "ok", reason: "No close relationship detected within 3 generations.", coefficient: 0 };
  },
};

// ----- Seed data -----
function seedIfEmpty() {
  const existing = db.select().from(pigs).all();
  if (existing.length > 0) return;

  // Settings
  storage.getSettings();

  type Seeded = {
    id: string;
    tag: string;
    cat: PigCategory;
    birth: string;
    pen: number;
    breed: string;
    sex: "F" | "M";
    name: string | null;
    source: "Bred" | "Purchased";
    mother_id: string | null;
    father_id: string | null;
  };
  const pigList: Seeded[] = [];
  let counter = 1;
  const breeds = ["Large White", "Landrace", "Duroc", "Hampshire"];

  // ===== Foundation stock — Purchased =====
  // 8 named sows
  const sowNames = ["Daisy", "Hazel", "Mavis", "Tendai", "Rumbi", "Chipo", "Nyasha", "Farai"];
  const sowSuppliers = ["Triple C Pigs", "Surrey Genetics"];
  const sowIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const pid = id();
    const tag = `S-${String(counter++).padStart(3, "0")}`;
    const purchasePrice = 400 + (i % 3) * 25;
    const purchaseDate = daysAgo(540 + i * 15);
    db.insert(pigs)
      .values({
        id: pid,
        tag_id: tag,
        category: "Sow",
        status: "Active",
        birth_date: daysAgo(620 + i * 15),
        weight_at_weaning_kg: 6.5,
        current_pen: 1,
        breed: breeds[i % breeds.length],
        source: "Purchased",
        purchase_date: purchaseDate,
        purchase_price_usd: purchasePrice,
        purchase_supplier: sowSuppliers[i % 2],
        mother_id: null,
        father_id: null,
        sex: "F",
        name: sowNames[i],
        notes: null,
        created_at: isoDaysAgo(540 + i * 15),
      })
      .run();
    sowIds.push(pid);
    pigList.push({
      id: pid, tag, cat: "Sow", birth: daysAgo(620 + i * 15), pen: 1,
      breed: breeds[i % breeds.length], sex: "F", name: sowNames[i],
      source: "Purchased", mother_id: null, father_id: null,
    });
    // Pig Purchase expense
    db.insert(expenses).values({
      id: id(),
      date: purchaseDate,
      category: "Pig Purchase",
      description: `Purchased sow ${sowNames[i]} (${tag})`,
      amount_usd: purchasePrice,
      vendor: sowSuppliers[i % 2],
      linked_pig_id: pid,
      linked_employee_id: null,
      linked_feed_lot_id: null,
      created_at: isoDaysAgo(540 + i * 15),
    }).run();
  }

  // 2 named boars
  const boarNames = ["Tafara", "Simba"];
  const boarIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const pid = id();
    const tag = `B-${String(counter++).padStart(3, "0")}`;
    const purchasePrice = 450;
    const purchaseDate = daysAgo(560 - i * 20);
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Boar",
      status: "Active",
      birth_date: daysAgo(720),
      weight_at_weaning_kg: 7.0,
      current_pen: 2,
      breed: i === 0 ? "Duroc" : "Hampshire",
      source: "Purchased",
      purchase_date: purchaseDate,
      purchase_price_usd: purchasePrice,
      purchase_supplier: i === 0 ? "Triple C Pigs" : "Surrey Genetics",
      mother_id: null, father_id: null,
      sex: "M",
      name: boarNames[i],
      notes: null,
      created_at: isoDaysAgo(560),
    }).run();
    boarIds.push(pid);
    pigList.push({
      id: pid, tag, cat: "Boar", birth: daysAgo(720), pen: 2,
      breed: i === 0 ? "Duroc" : "Hampshire", sex: "M", name: boarNames[i],
      source: "Purchased", mother_id: null, father_id: null,
    });
    db.insert(expenses).values({
      id: id(),
      date: purchaseDate,
      category: "Pig Purchase",
      description: `Purchased boar ${boarNames[i]} (${tag})`,
      amount_usd: purchasePrice,
      vendor: i === 0 ? "Triple C Pigs" : "Surrey Genetics",
      linked_pig_id: pid,
      linked_employee_id: null,
      linked_feed_lot_id: null,
      created_at: isoDaysAgo(560),
    }).run();
  }

  // 10 purchased weaners (foundation grow-out)
  for (let i = 0; i < 10; i++) {
    const pid = id();
    const tag = `W-${String(counter++).padStart(3, "0")}`;
    const purchasePrice = 350;
    const purchaseDate = daysAgo(60 + (i % 5) * 7);
    const age = 50 + (i % 10);
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Weaner",
      status: "Active",
      birth_date: daysAgo(age),
      weight_at_weaning_kg: 6.0 + Math.random() * 1.5,
      current_pen: 4,
      breed: breeds[i % breeds.length],
      source: "Purchased",
      purchase_date: purchaseDate,
      purchase_price_usd: purchasePrice,
      purchase_supplier: i < 5 ? "Triple C Pigs" : "Surrey Genetics",
      mother_id: null, father_id: null,
      sex: i % 2 === 0 ? "F" : "M",
      name: null,
      notes: null,
      created_at: isoDaysAgo(60),
    }).run();
    pigList.push({
      id: pid, tag, cat: "Weaner", birth: daysAgo(age), pen: 4,
      breed: breeds[i % breeds.length], sex: i % 2 === 0 ? "F" : "M",
      name: null, source: "Purchased", mother_id: null, father_id: null,
    });
    db.insert(expenses).values({
      id: id(),
      date: purchaseDate,
      category: "Pig Purchase",
      description: `Purchased weaner (${tag})`,
      amount_usd: purchasePrice,
      vendor: i < 5 ? "Triple C Pigs" : "Surrey Genetics",
      linked_pig_id: pid,
      linked_employee_id: null,
      linked_feed_lot_id: null,
      created_at: isoDaysAgo(60),
    }).run();
  }

  // ===== Bred stock with parent assignments =====
  // 14 piglets in pen 3 — mothers S-001..S-006 (some pairs share a sow → siblings)
  // Inbreeding scenario (b): two FULL siblings from S-002 × B-002 (same litter)
  for (let i = 0; i < 14; i++) {
    const pid = id();
    const tag = `P-${String(counter++).padStart(3, "0")}`;
    let motherIdx: number;
    let fatherIdx: number;
    let pigletName: string | null = null;
    if (i === 0 || i === 1) {
      // Full sibling pair — both from S-002 × B-002
      motherIdx = 1;
      fatherIdx = 1;
      pigletName = i === 0 ? "Twin-A" : "Twin-B";
    } else {
      motherIdx = (i - 2) % 6; // S-001..S-006
      fatherIdx = i % 2;
    }
    const motherId = sowIds[motherIdx];
    const fatherId = boarIds[fatherIdx];
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Piglet",
      status: "Active",
      birth_date: daysAgo(20 + (i % 14)),
      weight_at_weaning_kg: null,
      current_pen: 3,
      breed: breeds[i % breeds.length],
      source: "Bred",
      purchase_date: null,
      purchase_price_usd: null,
      purchase_supplier: null,
      mother_id: motherId,
      father_id: fatherId,
      sex: i % 2 === 0 ? "F" : "M",
      name: pigletName,
      notes: null,
      created_at: isoDaysAgo(20),
    }).run();
    pigList.push({
      id: pid, tag, cat: "Piglet", birth: daysAgo(20 + (i % 14)), pen: 3,
      breed: breeds[i % breeds.length], sex: i % 2 === 0 ? "F" : "M",
      name: pigletName, source: "Bred",
      mother_id: motherId, father_id: fatherId,
    });
  }

  // 18 weaners pen 4, bred (offset counter so we don't reuse existing tag prefix)
  for (let i = 0; i < 18; i++) {
    const pid = id();
    const tag = `W-${String(counter++).padStart(3, "0")}`;
    const age = 50 + (i % 10);
    const motherIdx = i % 8;
    const fatherIdx = i % 2;
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Weaner",
      status: "Active",
      birth_date: daysAgo(age),
      weight_at_weaning_kg: 6.0 + Math.random() * 1.5,
      current_pen: 4,
      breed: breeds[i % breeds.length],
      source: "Bred",
      purchase_date: null,
      purchase_price_usd: null,
      purchase_supplier: null,
      mother_id: sowIds[motherIdx],
      father_id: boarIds[fatherIdx],
      sex: i % 2 === 0 ? "F" : "M",
      name: null,
      notes: null,
      created_at: isoDaysAgo(age),
    }).run();
    pigList.push({
      id: pid, tag, cat: "Weaner", birth: daysAgo(age), pen: 4,
      breed: breeds[i % breeds.length], sex: i % 2 === 0 ? "F" : "M",
      name: null, source: "Bred",
      mother_id: sowIds[motherIdx], father_id: boarIds[fatherIdx],
    });
  }

  // 22 growers pens 5-6, bred. INBREEDING scenario (a): one is a gilt offspring of S-001 × B-001.
  let inbreedGiltId: string | null = null;
  for (let i = 0; i < 22; i++) {
    const pid = id();
    const tag = `G-${String(counter++).padStart(3, "0")}`;
    const age = 100 + (i % 20);
    const motherIdx = i % 8;
    const fatherIdx = i % 2;
    let sex: "F" | "M" = i % 2 === 0 ? "F" : "M";
    let pigName: string | null = null;
    // Force one specific gilt to be S-001 × B-001 daughter
    if (i === 0) {
      pigName = "Gilt-Inbreed";
      sex = "F";
    }
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Grower",
      status: "Active",
      birth_date: daysAgo(age),
      weight_at_weaning_kg: 6.5,
      current_pen: 5 + (i % 2),
      breed: breeds[i % breeds.length],
      source: "Bred",
      purchase_date: null, purchase_price_usd: null, purchase_supplier: null,
      mother_id: i === 0 ? sowIds[0] : sowIds[motherIdx],
      father_id: i === 0 ? boarIds[0] : boarIds[fatherIdx],
      sex,
      name: pigName,
      notes: null,
      created_at: isoDaysAgo(age),
    }).run();
    if (i === 0) inbreedGiltId = pid;
    pigList.push({
      id: pid, tag, cat: "Grower", birth: daysAgo(age),
      pen: 5 + (i % 2), breed: breeds[i % breeds.length], sex,
      name: pigName, source: "Bred",
      mother_id: i === 0 ? sowIds[0] : sowIds[motherIdx],
      father_id: i === 0 ? boarIds[0] : boarIds[fatherIdx],
    });
  }

  // 16 finishers pen 7, bred
  for (let i = 0; i < 16; i++) {
    const pid = id();
    const tag = `F-${String(counter++).padStart(3, "0")}`;
    const age = 150 + (i % 25);
    const motherIdx = i % 8;
    const fatherIdx = i % 2;
    db.insert(pigs).values({
      id: pid,
      tag_id: tag,
      category: "Finisher",
      status: "Active",
      birth_date: daysAgo(age),
      weight_at_weaning_kg: 6.5,
      current_pen: 7,
      breed: breeds[i % breeds.length],
      source: "Bred",
      purchase_date: null, purchase_price_usd: null, purchase_supplier: null,
      mother_id: sowIds[motherIdx],
      father_id: boarIds[fatherIdx],
      sex: i % 2 === 0 ? "F" : "M",
      name: null, notes: null,
      created_at: isoDaysAgo(age),
    }).run();
    pigList.push({
      id: pid, tag, cat: "Finisher", birth: daysAgo(age), pen: 7,
      breed: breeds[i % breeds.length], sex: i % 2 === 0 ? "F" : "M",
      name: null, source: "Bred",
      mother_id: sowIds[motherIdx], father_id: boarIds[fatherIdx],
    });
  }

  // ===== Weight logs over time =====
  for (const p of pigList) {
    if (p.cat === "Boar") continue;
    const ageDays = Math.floor((Date.now() - new Date(p.birth).getTime()) / 86400000);
    const samples = Math.min(6, Math.max(2, Math.floor(ageDays / 14)));
    for (let s = 0; s < samples; s++) {
      const sampleAge = (ageDays / samples) * (s + 1);
      let kg = 1.5;
      if (sampleAge <= 28) kg = 1.5 + (sampleAge / 28) * 5;
      else if (sampleAge <= 56) kg = 6.5 + ((sampleAge - 28) / 28) * 13.5;
      else if (sampleAge <= 168) kg = 20 + ((sampleAge - 56) / 112) * 80;
      else kg = 100 + ((sampleAge - 168) / 30) * 8;
      kg = Math.max(1.4, kg * (0.92 + Math.random() * 0.16));
      const dateLogged = new Date(new Date(p.birth).getTime() + sampleAge * 86400000)
        .toISOString().slice(0, 10);
      if (dateLogged > today()) continue;
      db.insert(weightLogs).values({
        id: id(), pig_id: p.id, weight_kg: Number(kg.toFixed(1)), date_logged: dateLogged,
      }).run();
    }
  }

  // ===== Feed lots =====
  const feedTypes: FeedType[] = ["Creep", "Grower", "Finisher", "Sow"];
  const lotPlans: { ft: FeedType; bags: number; daysAgoVal: number; cost: number; supplier: string }[] = [
    { ft: "Sow", bags: 50, daysAgoVal: 70, cost: 32, supplier: "AgriFeeds Harare" },
    { ft: "Creep", bags: 40, daysAgoVal: 65, cost: 38, supplier: "National Foods" },
    { ft: "Grower", bags: 60, daysAgoVal: 50, cost: 30, supplier: "Profeeds" },
    { ft: "Finisher", bags: 50, daysAgoVal: 35, cost: 30, supplier: "AgriFeeds Harare" },
    { ft: "Grower", bags: 30, daysAgoVal: 18, cost: 30, supplier: "Profeeds" },
  ];
  for (const p of lotPlans) {
    const lotId = id();
    db.insert(feedLots).values({
      id: lotId,
      feed_type: p.ft,
      bags_received: p.bags,
      kg_per_bag: 50,
      cost_per_bag_usd: p.cost,
      supplier: p.supplier,
      date_received: daysAgo(p.daysAgoVal),
    }).run();
    // Feed expense
    db.insert(expenses).values({
      id: id(),
      date: daysAgo(p.daysAgoVal),
      category: "Feed",
      description: `${p.bags} bags ${p.ft} feed`,
      amount_usd: p.bags * p.cost,
      vendor: p.supplier,
      linked_pig_id: null,
      linked_employee_id: null,
      linked_feed_lot_id: lotId,
      created_at: isoDaysAgo(p.daysAgoVal),
    }).run();
  }

  // ===== Feed logs =====
  for (let d = 42; d >= 0; d--) {
    const date = daysAgo(d);
    const distribution: Record<FeedType, number> = { Creep: 1, Sow: 1, Grower: 1, Finisher: 1 };
    const variance = Math.random() < 0.5 ? 0 : 1;
    distribution.Grower += variance;
    for (const ft of feedTypes) {
      const bags = distribution[ft];
      db.insert(feedLogs).values({
        id: id(), feed_type: ft, bags_opened: bags, kg_used: bags * 50,
        pen_or_category: ft, date_logged: date, recorded_by: "Tendai (Manager)",
      }).run();
    }
  }

  // ===== Medical logs =====
  const sowsList = pigList.filter((p) => p.cat === "Sow");
  const weanersList = pigList.filter((p) => p.cat === "Weaner");
  db.insert(medicalLogs).values({
    id: id(), pig_id: sowsList[0]?.id ?? null, pen: "1",
    treatment_type: "Vaccination", product_name: "Parvovirus + Erysipelas",
    dose: "2 ml IM", date_logged: daysAgo(20), next_due_date: daysAgo(-1),
    notes: "Pre-farrowing booster",
  }).run();
  db.insert(medicalLogs).values({
    id: id(), pen: "4", treatment_type: "Iron Injection", product_name: "Ferrodex 200",
    dose: "1 ml IM each", date_logged: daysAgo(7), next_due_date: null,
    notes: "All piglets 3-day routine",
  }).run();
  db.insert(medicalLogs).values({
    id: id(), pen: "6", treatment_type: "Deworming", product_name: "Ivermectin 1%",
    dose: "1 ml / 33 kg", date_logged: daysAgo(14), next_due_date: daysAgo(-3),
    notes: "Routine grower deworming",
  }).run();
  db.insert(medicalLogs).values({
    id: id(), pig_id: weanersList[2]?.id ?? null, pen: "4",
    treatment_type: "Antibiotic", product_name: "Penstrep",
    dose: "5 ml IM", date_logged: daysAgo(2), next_due_date: daysAgo(-5),
    notes: "Mild respiratory symptoms — monitor",
  }).run();

  // ===== Mortality logs =====
  db.insert(mortalityLogs).values({
    id: id(), pen: "3", category: "Piglet", cause_of_death: "Crushing",
    notes: "Sow rolled on piglet overnight", date_logged: daysAgo(5),
  }).run();
  db.insert(mortalityLogs).values({
    id: id(), pen: "6", category: "Grower", cause_of_death: "Disease",
    notes: "Suspected enteritis — vet contacted", date_logged: daysAgo(3),
  }).run();
  db.insert(mortalityLogs).values({
    id: id(), pen: "3", category: "Piglet", cause_of_death: "Stillborn",
    notes: "From sow S-002 farrowing", date_logged: daysAgo(12),
  }).run();

  // ===== Birth log =====
  if (sowsList[1]) {
    db.insert(birthLogs).values({
      id: id(), sow_pig_id: sowsList[1].id,
      piglets_born_alive: 11, piglets_stillborn: 1,
      date_logged: daysAgo(12),
    }).run();
  }

  // ===== Sales (3 finishers in last 60 days) — also link income =====
  const finishersList = pigList.filter((p) => p.cat === "Finisher");
  for (let i = 0; i < 3; i++) {
    const pig = finishersList[i];
    if (!pig) break;
    const sid = id();
    const buyer = ["Surrey Abattoir", "Colcom Foods", "Local Butcher (Marondera)"][i];
    const wt = 95 + i * 4;
    const price = wt * 2.4;
    const dt = daysAgo(15 + i * 12);
    db.insert(salesLogs).values({
      id: sid, pig_id: pig.id, buyer, weight_kg: wt, price_usd: price, date_logged: dt,
    }).run();
    db.insert(income).values({
      id: id(), date: dt, category: "Pig Sale",
      description: `Sold ${pig.tag} (${wt}kg) → ${buyer}`,
      amount_usd: price, linked_sale_id: sid,
      created_at: isoDaysAgo(15 + i * 12),
    }).run();
  }

  // ===== Census =====
  const byCat: Record<string, number> = {};
  for (const p of pigList) byCat[p.cat] = (byCat[p.cat] ?? 0) + 1;
  db.insert(censusRecords).values({
    id: id(), week_start_date: daysAgo(14),
    total_count: pigList.length,
    by_category: JSON.stringify(byCat),
    submitted_at: isoDaysAgo(8),
    submitted_by: "Tendai (Manager)",
  }).run();

  // ===== Employees =====
  const tendaiId = id();
  const blessingId = id();
  db.insert(employees).values({
    id: tendaiId, name: "Tendai Moyo", role: "Manager",
    start_date: daysAgo(540), monthly_wage_usd: 100, active: 1,
  }).run();
  db.insert(employees).values({
    id: blessingId, name: "Blessing Sibanda", role: "Hand",
    start_date: daysAgo(420), monthly_wage_usd: 100, active: 1,
  }).run();

  // ===== Expenses backfill (12 months) =====
  const now = new Date();
  for (let m = 12; m >= 1; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const dateStr = d.toISOString().slice(0, 10);
    const createdAt = d.toISOString();
    // Feed monthly recurring (in addition to lot-driven)
    db.insert(expenses).values({
      id: id(), date: dateStr, category: "Feed",
      description: "Bag feed top-up (cash purchase)",
      amount_usd: 280, vendor: "Profeeds",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: createdAt,
    }).run();
    // Medication monthly
    db.insert(expenses).values({
      id: id(), date: dateStr, category: "Medication",
      description: "Routine vaccine + dewormer stock",
      amount_usd: 30 + ((m % 4) * 10),
      vendor: "Cooper Zimbabwe",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: createdAt,
    }).run();
    // Utilities
    db.insert(expenses).values({
      id: id(), date: dateStr, category: "Utilities",
      description: "Borehole pump electricity / water levy",
      amount_usd: 20, vendor: "ZESA",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: createdAt,
    }).run();
  }
  // Equipment lumpy
  const equipmentItems = [
    { amt: 180, desc: "Heat lamps × 4", days: 320 },
    { amt: 90, desc: "Drinker nipples replacement", days: 200 },
    { amt: 220, desc: "Wheelbarrow + shovels", days: 120 },
    { amt: 60, desc: "Syringes + needles bulk", days: 45 },
  ];
  for (const it of equipmentItems) {
    db.insert(expenses).values({
      id: id(), date: daysAgo(it.days), category: "Equipment",
      description: it.desc, amount_usd: it.amt, vendor: "Farm & City",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: isoDaysAgo(it.days),
    }).run();
  }
  // Vet calls
  for (let i = 0; i < 2; i++) {
    db.insert(expenses).values({
      id: id(), date: daysAgo(40 + i * 90), category: "Veterinary",
      description: "Vet farm call", amount_usd: 40, vendor: "Dr. Mukasa",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: isoDaysAgo(40 + i * 90),
    }).run();
  }
  // Transport
  for (let i = 0; i < 6; i++) {
    db.insert(expenses).values({
      id: id(), date: daysAgo(20 + i * 50), category: "Transport",
      description: "Pickup hire to abattoir / feed run",
      amount_usd: 25, vendor: "Local hauler",
      linked_pig_id: null, linked_employee_id: null, linked_feed_lot_id: null,
      created_at: isoDaysAgo(20 + i * 50),
    }).run();
  }

  // ===== Manure sales (2 historical income) =====
  for (let i = 0; i < 2; i++) {
    db.insert(income).values({
      id: id(), date: daysAgo(40 + i * 60),
      category: "Manure Sale",
      description: "Manure sold to vegetable grower",
      amount_usd: 30, linked_sale_id: null,
      created_at: isoDaysAgo(40 + i * 60),
    }).run();
  }
  // ===== 8 historical pig sales as income (no linked sale_log; standalone)
  for (let i = 0; i < 8; i++) {
    const ds = daysAgo(60 + i * 35);
    const amount = 80 + (i * 6);
    db.insert(income).values({
      id: id(), date: ds, category: "Pig Sale",
      description: `Historical sale weaner/grower (~${amount} USD)`,
      amount_usd: amount, linked_sale_id: null,
      created_at: isoDaysAgo(60 + i * 35),
    }).run();
  }

  // ===== Payroll runs (13 months, last one pending) =====
  const employeeWageTotal = 200; // 100 + 100
  for (let m = 13; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const runDate = new Date(d.getFullYear(), d.getMonth(), 28).toISOString().slice(0, 10);
    const runId = id();
    const isPending = m === 0;
    db.insert(payrollRuns).values({
      id: runId, month, run_date: runDate,
      total_usd: employeeWageTotal,
      status: isPending ? "pending" : "paid",
    }).run();
    if (!isPending) {
      // Wages expenses
      db.insert(expenses).values({
        id: id(), date: runDate, category: "Wages",
        description: `Wages — Tendai Moyo (${month})`,
        amount_usd: 100, vendor: null,
        linked_pig_id: null, linked_employee_id: tendaiId, linked_feed_lot_id: null,
        created_at: new Date(runDate).toISOString(),
      }).run();
      db.insert(expenses).values({
        id: id(), date: runDate, category: "Wages",
        description: `Wages — Blessing Sibanda (${month})`,
        amount_usd: 100, vendor: null,
        linked_pig_id: null, linked_employee_id: blessingId, linked_feed_lot_id: null,
        created_at: new Date(runDate).toISOString(),
      }).run();
    }
  }

  void inbreedGiltId;
}

seedIfEmpty();

// ----- Idempotent seed of pens & protocols -----
function seedPensAndProtocols() {
  const existingPens = db.select().from(pens).all();
  if (existingPens.length === 0) {
    const penDefs: Array<{ id: number; role: string; cleaned_days_ago: number | null }> = [
      { id: 1, role: "Sows · Breeding", cleaned_days_ago: 4 },
      { id: 2, role: "Boars · Service", cleaned_days_ago: 9 },
      { id: 3, role: "Farrowing · Piglets", cleaned_days_ago: 1 },
      { id: 4, role: "Weaners · Nursery", cleaned_days_ago: 6 },
      { id: 5, role: "Growers", cleaned_days_ago: 12 },
      { id: 6, role: "Growers", cleaned_days_ago: 14 },
      { id: 7, role: "Finishers · Market-ready", cleaned_days_ago: 8 },
    ];
    for (const p of penDefs) {
      db.insert(pens)
        .values({
          id: p.id,
          role: p.role,
          notes: null,
          last_cleaned_date: p.cleaned_days_ago == null ? null : daysAgo(p.cleaned_days_ago),
        })
        .run();
    }
  }

  const existingProtocols = db.select().from(medicationProtocols).all();
  if (existingProtocols.length === 0) {
    const protocols: Array<Omit<InsertMedicationProtocol, "id"> & { id?: string }> = [
      {
        name: "Iron Dextran — Day 3",
        category: "Piglet",
        trigger_type: "age_days",
        trigger_value: 3,
        product_name: "Iron Dextran 200",
        dose: "1 ml IM",
        route: "Intramuscular",
        estimated_cost_usd: 0.50,
        rationale: "Prevents anaemia; piglets on concrete have no soil iron access.",
        is_critical: 1,
        enabled: 1,
      },
      {
        name: "Coccidiostat — Day 14",
        category: "Piglet",
        trigger_type: "age_days",
        trigger_value: 14,
        product_name: "Toltrazuril (Baycox)",
        dose: "1 ml oral",
        route: "Oral",
        estimated_cost_usd: 0.80,
        rationale: "Prevents coccidiosis diarrhoea — a top cause of pre-weaning mortality.",
        is_critical: 1,
        enabled: 1,
      },
      {
        name: "Deworming at Weaning",
        category: "Piglet",
        trigger_type: "event_weaning",
        trigger_value: 0,
        product_name: "Ivermectin 1%",
        dose: "0.3 ml SC per 10 kg",
        route: "Subcutaneous",
        estimated_cost_usd: 0.30,
        rationale: "Removes internal/external parasites at the stress point of weaning.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "Mycoplasma Vaccine",
        category: "Weaner",
        trigger_type: "age_days",
        trigger_value: 42,
        product_name: "Mycoplasma hyopneumoniae vaccine",
        dose: "2 ml IM",
        route: "Intramuscular",
        estimated_cost_usd: 1.20,
        rationale: "Prevents enzootic pneumonia, single biggest cause of stunted growers.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "Erysipelas + Parvovirus (gilts)",
        category: "Grower",
        trigger_type: "age_days",
        trigger_value: 112,
        product_name: "Parvo-Ery vaccine",
        dose: "2 ml IM",
        route: "Intramuscular",
        estimated_cost_usd: 1.50,
        rationale: "Pre-breeding cover for replacement gilts; protects future fertility.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "Erysipelas + Parvovirus Booster",
        category: "Sow",
        trigger_type: "recurring_days",
        trigger_value: 365,
        product_name: "Parvo-Ery vaccine",
        dose: "2 ml IM",
        route: "Intramuscular",
        estimated_cost_usd: 1.50,
        rationale: "Annual booster for breeding stock.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "E. coli + Clostridium (pre-farrow)",
        category: "Sow",
        trigger_type: "pre_farrow_days",
        trigger_value: 14,
        product_name: "Litterguard / Coliclost",
        dose: "2 ml IM",
        route: "Intramuscular",
        estimated_cost_usd: 2.00,
        rationale: "Sow passes immunity via colostrum, prevents scours in newborns.",
        is_critical: 1,
        enabled: 1,
      },
      {
        name: "Routine Deworming — Sow",
        category: "Sow",
        trigger_type: "recurring_days",
        trigger_value: 180,
        product_name: "Ivermectin 1%",
        dose: "5 ml SC",
        route: "Subcutaneous",
        estimated_cost_usd: 0.40,
        rationale: "Six-monthly deworming for breeding stock.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "Routine Deworming — Boar",
        category: "Boar",
        trigger_type: "recurring_days",
        trigger_value: 180,
        product_name: "Ivermectin 1%",
        dose: "5 ml SC",
        route: "Subcutaneous",
        estimated_cost_usd: 0.40,
        rationale: "Six-monthly deworming for breeding stock.",
        is_critical: 0,
        enabled: 1,
      },
      {
        name: "ASF Biosecurity Audit",
        category: "All",
        trigger_type: "recurring_days",
        trigger_value: 7,
        product_name: "Perimeter, footbaths, visitor log",
        dose: "Inspection only",
        route: "N/A",
        estimated_cost_usd: 0.00,
        rationale:
          "African Swine Fever has no vaccine — prevention is everything. Weekly farm-wide audit.",
        is_critical: 1,
        enabled: 1,
      },
    ];
    for (const p of protocols) {
      db.insert(medicationProtocols)
        .values({ ...p, id: id() })
        .run();
    }
  }
}

seedPensAndProtocols();
