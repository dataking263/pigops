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
export const pigs = sqliteTable("pigs", {
  id: text("id").primaryKey(),
  tag_id: text("tag_id").notNull().unique(),
  category: text("category").notNull(),
  status: text("status").notNull().default("Active"),
  birth_date: text("birth_date"),
  weight_at_weaning_kg: real("weight_at_weaning_kg"),
  current_pen: integer("current_pen"),
  breed: text("breed"),
  created_at: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const insertPigSchema = createInsertSchema(pigs)
  .omit({ id: true, created_at: true })
  .extend({
    category: z.enum(PIG_CATEGORIES),
    status: z.enum(PIG_STATUSES).optional(),
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
  }>;
  census_status: "current" | "overdue";
  last_census_date: string | null;
  zwl_per_usd: number;
}
