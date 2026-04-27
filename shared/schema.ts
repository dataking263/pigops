import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums (validated via Zod since SQLite has no native enum)
export const PIG_CATEGORIES = ["Sow", "Boar", "Weaner", "Grower", "Finisher", "Piglet"] as const;
export const PIG_STATUSES = ["Active", "Sold", "Deceased", "Transferred"] as const;
export const FEED_TYPES = ["Creep", "Grower", "Finisher", "Sow"] as const;
export const TREATMENT_TYPES = ["Vaccination", "Iron Injection", "Deworming", "Antibiotic", "Other"] as const;
export const DEATH_CAUSES = ["Disease", "Crushing", "Stillborn", "Unknown", "Predator", "Other"] as const;

export type PigCategory = (typeof PIG_CATEGORIES)[number];
export type PigStatus = (typeof PIG_STATUSES)[number];
export type FeedType = (typeof FEED_TYPES)[number];
export type TreatmentType = (typeof TREATMENT_TYPES)[number];
export type DeathCause = (typeof DEATH_CAUSES)[number];

// pigs
export const PIG_SOURCES = ["Bred", "Purchased"] as const;
export type PigSource = (typeof PIG_SOURCES)[number];
export const PIG_SEXES = ["F", "M"] as const;
export type PigSex = (typeof PIG_SEXES)[number];

export const pigs = sqliteTable("pigs", {
  id: text("id").primaryKey(),
  tag_id: text("tag_id").notNull().unique(),
  category: text("category").notNull(),
  status: text("status").notNull().default("Active"),
  birth_date: text("birth_date"),
  weight_at_weaning_kg: real("weight_at_weaning_kg"),
  current_pen: integer("current_pen"),
  breed: text("breed"),
  // v2 additions
  source: text("source").notNull().default("Bred"),
  purchase_date: text("purchase_date"),
  purchase_price_usd: real("purchase_price_usd"),
  purchase_supplier: text("purchase_supplier"),
  mother_id: text("mother_id"),
  father_id: text("father_id"),
  sex: text("sex").notNull().default("F"),
  name: text("name"),
  notes: text("notes"),
  created_at: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const insertPigSchema = createInsertSchema(pigs)
  .omit({ id: true, created_at: true })
  .extend({
    category: z.enum(PIG_CATEGORIES),
    status: z.enum(PIG_STATUSES).optional(),
    source: z.enum(PIG_SOURCES).optional(),
    sex: z.enum(PIG_SEXES).optional(),
  });
export type InsertPig = z.infer<typeof insertPigSchema>;
export type Pig = typeof pigs.$inferSelect;

// feed_lots
export const feedLots = sqliteTable("feed_lots", {
  id: text("id").primaryKey(),
  feed_type: text("feed_type").notNull(),
  bags_received: integer("bags_received").notNull(),
  kg_per_bag: real("kg_per_bag").notNull().default(50),
  cost_per_bag_usd: real("cost_per_bag_usd").notNull(),
  supplier: text("supplier"),
  date_received: text("date_received").notNull(),
});

export const insertFeedLotSchema = createInsertSchema(feedLots)
  .omit({ id: true })
  .extend({ feed_type: z.enum(FEED_TYPES) });
export type InsertFeedLot = z.infer<typeof insertFeedLotSchema>;
export type FeedLot = typeof feedLots.$inferSelect;

// feed_logs
export const feedLogs = sqliteTable("feed_logs", {
  id: text("id").primaryKey(),
  feed_type: text("feed_type").notNull(),
  bags_opened: integer("bags_opened").notNull(),
  kg_used: real("kg_used").notNull(),
  pen_or_category: text("pen_or_category"),
  date_logged: text("date_logged").notNull(),
  recorded_by: text("recorded_by"),
});

export const insertFeedLogSchema = createInsertSchema(feedLogs)
  .omit({ id: true })
  .extend({ feed_type: z.enum(FEED_TYPES) });
export type InsertFeedLog = z.infer<typeof insertFeedLogSchema>;
export type FeedLog = typeof feedLogs.$inferSelect;

// weight_logs
export const weightLogs = sqliteTable("weight_logs", {
  id: text("id").primaryKey(),
  pig_id: text("pig_id"),
  batch_id: text("batch_id"),
  weight_kg: real("weight_kg").notNull(),
  date_logged: text("date_logged").notNull(),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({ id: true });
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;
export type WeightLog = typeof weightLogs.$inferSelect;

// medical_logs
export const medicalLogs = sqliteTable("medical_logs", {
  id: text("id").primaryKey(),
  pig_id: text("pig_id"),
  pen: text("pen"),
  treatment_type: text("treatment_type").notNull(),
  product_name: text("product_name").notNull(),
  dose: text("dose"),
  date_logged: text("date_logged").notNull(),
  next_due_date: text("next_due_date"),
  notes: text("notes"),
});

export const insertMedicalLogSchema = createInsertSchema(medicalLogs)
  .omit({ id: true })
  .extend({ treatment_type: z.enum(TREATMENT_TYPES) });
export type InsertMedicalLog = z.infer<typeof insertMedicalLogSchema>;
export type MedicalLog = typeof medicalLogs.$inferSelect;

// mortality_logs
export const mortalityLogs = sqliteTable("mortality_logs", {
  id: text("id").primaryKey(),
  pig_id: text("pig_id"),
  pen: text("pen"),
  category: text("category"),
  cause_of_death: text("cause_of_death").notNull(),
  notes: text("notes"),
  photo_data_url: text("photo_data_url"),
  photo_lat: real("photo_lat"),
  photo_lng: real("photo_lng"),
  photo_timestamp: text("photo_timestamp"),
  date_logged: text("date_logged").notNull(),
});

export const insertMortalityLogSchema = createInsertSchema(mortalityLogs)
  .omit({ id: true })
  .extend({
    cause_of_death: z.enum(DEATH_CAUSES),
    category: z.enum(PIG_CATEGORIES).optional().nullable(),
  });
export type InsertMortalityLog = z.infer<typeof insertMortalityLogSchema>;
export type MortalityLog = typeof mortalityLogs.$inferSelect;

// birth_logs
export const birthLogs = sqliteTable("birth_logs", {
  id: text("id").primaryKey(),
  sow_pig_id: text("sow_pig_id").notNull(),
  piglets_born_alive: integer("piglets_born_alive").notNull(),
  piglets_stillborn: integer("piglets_stillborn").notNull().default(0),
  date_logged: text("date_logged").notNull(),
  photo_data_url: text("photo_data_url"),
  photo_lat: real("photo_lat"),
  photo_lng: real("photo_lng"),
  photo_timestamp: text("photo_timestamp"),
});

export const insertBirthLogSchema = createInsertSchema(birthLogs).omit({ id: true });
export type InsertBirthLog = z.infer<typeof insertBirthLogSchema>;
export type BirthLog = typeof birthLogs.$inferSelect;

// sales_logs
export const salesLogs = sqliteTable("sales_logs", {
  id: text("id").primaryKey(),
  pig_id: text("pig_id"),
  batch: text("batch"),
  buyer: text("buyer").notNull(),
  weight_kg: real("weight_kg").notNull(),
  price_usd: real("price_usd").notNull(),
  date_logged: text("date_logged").notNull(),
});

export const insertSalesLogSchema = createInsertSchema(salesLogs).omit({ id: true });
export type InsertSalesLog = z.infer<typeof insertSalesLogSchema>;
export type SalesLog = typeof salesLogs.$inferSelect;

// census_records
export const censusRecords = sqliteTable("census_records", {
  id: text("id").primaryKey(),
  week_start_date: text("week_start_date").notNull(),
  total_count: integer("total_count").notNull(),
  by_category: text("by_category").notNull(), // JSON string
  submitted_at: text("submitted_at").notNull(),
  submitted_by: text("submitted_by"),
});

export const insertCensusSchema = createInsertSchema(censusRecords).omit({ id: true });
export type InsertCensus = z.infer<typeof insertCensusSchema>;
export type CensusRecord = typeof censusRecords.$inferSelect;

// settings (single row)
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  zwl_per_usd: real("zwl_per_usd").notNull().default(27),
  breed_standard_curves: text("breed_standard_curves").notNull(),
  low_bandwidth_mode: integer("low_bandwidth_mode", { mode: "boolean" }).notNull().default(false),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// pens
export const pens = sqliteTable("pens", {
  id: integer("id").primaryKey(),
  role: text("role").notNull(),
  notes: text("notes"),
  last_cleaned_date: text("last_cleaned_date"),
});

export const insertPenSchema = createInsertSchema(pens);
export type InsertPen = z.infer<typeof insertPenSchema>;
export type Pen = typeof pens.$inferSelect;

// medication_protocols
export const PROTOCOL_TRIGGERS = [
  "age_days",
  "pre_farrow_days",
  "post_weaning_days",
  "recurring_days",
  "event_birth",
  "event_weaning",
] as const;
export type ProtocolTrigger = (typeof PROTOCOL_TRIGGERS)[number];

export const medicationProtocols = sqliteTable("medication_protocols", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  trigger_type: text("trigger_type").notNull(),
  trigger_value: integer("trigger_value").notNull().default(0),
  product_name: text("product_name").notNull(),
  dose: text("dose").notNull(),
  route: text("route").notNull(),
  estimated_cost_usd: real("estimated_cost_usd").notNull().default(0),
  rationale: text("rationale"),
  is_critical: integer("is_critical").notNull().default(0),
  enabled: integer("enabled").notNull().default(1),
});

export const insertMedicationProtocolSchema = createInsertSchema(medicationProtocols).omit({ id: true });
export type InsertMedicationProtocol = z.infer<typeof insertMedicationProtocolSchema>;
export type MedicationProtocol = typeof medicationProtocols.$inferSelect;

// pen_reminders
export const REMINDER_STATUSES = ["pending", "done", "snoozed", "skipped"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const penReminders = sqliteTable("pen_reminders", {
  id: text("id").primaryKey(),
  pen: integer("pen").notNull(),
  pig_id: text("pig_id"),
  protocol_id: text("protocol_id").notNull(),
  due_date: text("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  created_at: text("created_at").notNull(),
  completed_at: text("completed_at"),
  completed_medical_log_id: text("completed_medical_log_id"),
});

export const insertPenReminderSchema = createInsertSchema(penReminders).omit({ id: true });
export type InsertPenReminder = z.infer<typeof insertPenReminderSchema>;
export type PenReminder = typeof penReminders.$inferSelect;

// employees
export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  start_date: text("start_date").notNull(),
  monthly_wage_usd: real("monthly_wage_usd").notNull().default(100),
  active: integer("active").notNull().default(1),
});
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// expenses
export const EXPENSE_CATEGORIES = [
  "Feed",
  "Medication",
  "Equipment",
  "Pig Purchase",
  "Wages",
  "Utilities",
  "Veterinary",
  "Transport",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount_usd: real("amount_usd").notNull(),
  vendor: text("vendor"),
  linked_pig_id: text("linked_pig_id"),
  linked_employee_id: text("linked_employee_id"),
  linked_feed_lot_id: text("linked_feed_lot_id"),
  created_at: text("created_at").notNull(),
});
export const insertExpenseSchema = createInsertSchema(expenses)
  .omit({ id: true, created_at: true })
  .extend({ category: z.enum(EXPENSE_CATEGORIES) });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// income
export const INCOME_CATEGORIES = ["Pig Sale", "Manure Sale", "Other"] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const income = sqliteTable("income", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount_usd: real("amount_usd").notNull(),
  linked_sale_id: text("linked_sale_id"),
  created_at: text("created_at").notNull(),
});
export const insertIncomeSchema = createInsertSchema(income)
  .omit({ id: true, created_at: true })
  .extend({ category: z.enum(INCOME_CATEGORIES) });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof income.$inferSelect;

// payroll_runs
export const payrollRuns = sqliteTable("payroll_runs", {
  id: text("id").primaryKey(),
  month: text("month").notNull(), // YYYY-MM
  run_date: text("run_date").notNull(),
  total_usd: real("total_usd").notNull(),
  status: text("status").notNull().default("pending"),
});
export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({ id: true });
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;
export type PayrollRun = typeof payrollRuns.$inferSelect;

// Joined types for API responses
export interface PenSummary {
  id: number;
  role: string;
  notes: string | null;
  last_cleaned_date: string | null;
  occupancy: number;
  category_mix: Record<string, number>;
  health_status: "green" | "amber" | "red";
  next_due_reminder: (PenReminder & { protocol: MedicationProtocol }) | null;
  last_treatment: MedicalLog | null;
  days_since_cleaned: number | null;
  mortality_7d: number;
  pending_count: number;
  overdue_count: number;
}

// Dashboard response shape
export interface DashboardKpis {
  headcount: {
    total: number;
    by_category: Record<PigCategory, number>;
  };
  feed: {
    stock_remaining_kg: number;
    avg_daily_kg_7d: number;
    days_of_feed_left: number;
    refill_cost_usd: number;
  };
  fcr: {
    current: number;
    target: number;
    score: "green" | "amber" | "red";
    sparkline: { date: string; fcr: number }[];
  };
  mortality_rate_30d: number;
  mortality_trend_arrow: "up" | "down" | "flat";
  upcoming_treatments: Array<{
    id: string;
    treatment_type: string;
    product_name: string;
    next_due_date: string;
    target: string;
    pen?: number | null;
    is_critical?: boolean;
  }>;
  pens_health_summary: { green: number; amber: number; red: number };
  pens_strip: Array<{ id: number; role: string; health_status: "green" | "amber" | "red"; pending: number }>;
  census_status: "current" | "overdue";
  last_census_date: string | null;
  zwl_per_usd: number;
  cash_position_30d: number;
  pending_payroll: { month: string; total_usd: number; employee_count: number } | null;
}

// Lineage response
export interface LineageNode {
  id: string;
  tag_id: string;
  name: string | null;
  category: string;
  sex: string;
  status: string;
  source: string;
}

export interface LineageResponse {
  pig: LineageNode;
  parents: { mother: LineageNode | null; father: LineageNode | null };
  grandparents: {
    maternal_grandmother: LineageNode | null;
    maternal_grandfather: LineageNode | null;
    paternal_grandmother: LineageNode | null;
    paternal_grandfather: LineageNode | null;
  };
  great_grandparents: LineageNode[];
  full_siblings: LineageNode[];
  half_siblings: LineageNode[];
  offspring: LineageNode[];
  coefficient_of_inbreeding: number;
}

export interface BreedingCheck {
  allowed: boolean;
  severity: "block" | "warn" | "ok";
  reason: string;
  coefficient: number;
}
