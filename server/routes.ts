import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import {
  insertPigSchema,
  insertFeedLotSchema,
  insertFeedLogSchema,
  insertWeightLogSchema,
  insertMedicalLogSchema,
  insertMortalityLogSchema,
  insertBirthLogSchema,
  insertSalesLogSchema,
  insertCensusSchema,
  insertSettingsSchema,
  insertMedicationProtocolSchema,
  insertEmployeeSchema,
  insertExpenseSchema,
  insertIncomeSchema,
} from "@shared/schema";
import { generateReminders } from "./services/reminders";
import { ZodError } from "zod";

function handle<T>(fn: (req: Request, res: Response) => Promise<T> | T) {
  return async (req: Request, res: Response) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (e: any) {
      if (e instanceof ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: e.errors });
      }
      console.error(e);
      res.status(500).json({ message: e?.message ?? "Server error" });
    }
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Dashboard
  app.get("/api/dashboard", handle(() => storage.getDashboard()));

  // Activity feed
  app.get("/api/activity", handle((req) => {
    const limit = Number(req.query.limit ?? 30);
    return storage.getActivityFeed(limit);
  }));

  // Alerts
  app.get("/api/alerts", handle(() => storage.getAlerts()));

  // Reports
  app.get("/api/reports", handle((req) => {
    const range = Number(req.query.range_days ?? 90);
    return storage.getReports(range);
  }));

  // Pigs
  app.get("/api/pigs", handle(() => storage.listPigs()));
  app.get("/api/pigs/:id", handle((req) => {
    const pid = String(req.params.id);
    const pig = storage.getPig(pid);
    if (!pig) throw Object.assign(new Error("Not found"), { status: 404 });
    return {
      ...pig,
      weights: storage.listWeightLogs(pid),
      treatments: storage.listMedicalLogs(pid),
    };
  }));
  app.post("/api/pigs", handle((req) => storage.createPig(insertPigSchema.parse(req.body))));
  app.patch("/api/pigs/:id", handle((req) => storage.updatePig(String(req.params.id), req.body)));
  app.delete("/api/pigs/:id", handle((req, res) => {
    storage.deletePig(String(req.params.id));
    res.json({ ok: true });
  }));

  // Feed lots
  app.get("/api/feed/lots", handle(() => storage.listFeedLots()));
  app.post("/api/feed/lots", handle((req) =>
    storage.createFeedLot(insertFeedLotSchema.parse(req.body))));

  // Feed logs
  app.get("/api/feed/logs", handle(() => storage.listFeedLogs()));
  app.post("/api/feed/logs", handle((req) => {
    const data = insertFeedLogSchema.parse(req.body);
    // compute kg_used if not given
    if (!data.kg_used) {
      const lot = storage.listFeedLots().find((l) => l.feed_type === data.feed_type);
      const kgPerBag = lot?.kg_per_bag ?? 50;
      data.kg_used = data.bags_opened * kgPerBag;
    }
    return storage.createFeedLog(data);
  }));

  // Weight logs
  app.get("/api/weights", handle((req) => storage.listWeightLogs(typeof req.query.pig_id === 'string' ? req.query.pig_id : undefined)));
  app.post("/api/weights", handle((req) => storage.createWeightLog(insertWeightLogSchema.parse(req.body))));

  // Medical
  app.get("/api/medical", handle(() => storage.listMedicalLogs()));
  app.post("/api/medical", handle((req) => storage.createMedicalLog(insertMedicalLogSchema.parse(req.body))));

  // Mortality
  app.get("/api/mortality", handle(() => storage.listMortalityLogs()));
  app.post("/api/mortality", handle((req) => storage.createMortalityLog(insertMortalityLogSchema.parse(req.body))));
  app.delete("/api/mortality/:id", handle((req) => {
    const removed = storage.deleteMortalityLog(String(req.params.id));
    return { ok: !!removed };
  }));

  // Birth
  app.get("/api/births", handle(() => storage.listBirthLogs()));
  app.post("/api/births", handle((req) => storage.createBirthLog(insertBirthLogSchema.parse(req.body))));

  // Sales
  app.get("/api/sales", handle(() => storage.listSalesLogs()));
  app.post("/api/sales", handle((req) => storage.createSalesLog(insertSalesLogSchema.parse(req.body))));

  // Census
  app.get("/api/census", handle(() => storage.listCensus()));
  app.post("/api/census/submit", handle((req) => {
    const parsed = insertCensusSchema.parse({
      ...req.body,
      submitted_at: req.body.submitted_at ?? new Date().toISOString(),
    });
    return storage.createCensus(parsed);
  }));

  // Settings
  app.get("/api/settings", handle(() => storage.getSettings()));
  app.patch("/api/settings", handle((req) => {
    const partial = insertSettingsSchema.partial().parse(req.body);
    return storage.updateSettings(partial);
  }));

  // ---- Pens ----
  app.get("/api/pens", handle(() => storage.getPensSummary()));
  app.get("/api/pens/:id", handle((req) => {
    const pid = Number(req.params.id);
    const detail = storage.getPenDetail(pid);
    if (!detail) throw Object.assign(new Error("Pen not found"), { status: 404 });
    return detail;
  }));
  app.post("/api/pens/:id/clean", handle((req) => {
    const pid = Number(req.params.id);
    const today = new Date().toISOString().slice(0, 10);
    return storage.updatePen(pid, { last_cleaned_date: today });
  }));
  app.patch("/api/pens/:id/notes", handle((req) => {
    const pid = Number(req.params.id);
    const notes = typeof req.body?.notes === "string" ? req.body.notes : null;
    return storage.updatePen(pid, { notes });
  }));
  app.post("/api/pens/regenerate-reminders", handle(() => generateReminders()));

  // ---- Pen Reminders ----
  app.get("/api/reminders", handle((req) => {
    const pen = req.query.pen ? Number(req.query.pen) : undefined;
    const status = req.query.status as string | undefined;
    const all = storage.listReminders({ pen, status: status ?? "pending" });
    const protocols = storage.listProtocols();
    const pById = new Map(protocols.map((p) => [p.id, p] as const));
    return all.map((r) => ({ ...r, protocol: pById.get(r.protocol_id) }));
  }));

  app.post("/api/reminders/:id/complete", handle((req) => {
    const reminder = storage.getReminder(String(req.params.id));
    if (!reminder) throw Object.assign(new Error("Reminder not found"), { status: 404 });
    const protocol = storage.getProtocol(reminder.protocol_id);
    if (!protocol) throw Object.assign(new Error("Protocol missing"), { status: 500 });

    // Map protocol category/route to a treatment_type enum value
    const tt = (() => {
      const name = (protocol.product_name + " " + protocol.name).toLowerCase();
      if (name.includes("iron")) return "Iron Injection";
      if (name.includes("ivermectin") || name.includes("deworm")) return "Deworming";
      if (name.includes("vaccine") || name.includes("parvo") || name.includes("erysipelas") || name.includes("mycoplasma") || name.includes("litterguard") || name.includes("coliclost")) return "Vaccination";
      if (name.includes("antibiotic") || name.includes("penstrep")) return "Antibiotic";
      return "Other";
    })();

    const today = new Date().toISOString().slice(0, 10);
    const med = storage.createMedicalLog({
      pig_id: reminder.pig_id ?? null,
      pen: String(reminder.pen),
      treatment_type: tt as any,
      product_name: protocol.product_name,
      dose: protocol.dose,
      date_logged: today,
      next_due_date: null,
      notes: `Auto-logged via protocol “${protocol.name}”. ${protocol.rationale ?? ""}`.trim(),
    });

    storage.updateReminder(reminder.id, {
      status: "done",
      completed_at: new Date().toISOString(),
      completed_medical_log_id: med.id,
    });

    // Advance recurring reminders
    if (protocol.trigger_type === "recurring_days") {
      const next = new Date(Date.now() + protocol.trigger_value * 86400000)
        .toISOString()
        .slice(0, 10);
      storage.createReminder({
        pen: reminder.pen,
        pig_id: reminder.pig_id ?? null,
        protocol_id: reminder.protocol_id,
        due_date: next,
        status: "pending",
        created_at: new Date().toISOString(),
        completed_at: null,
        completed_medical_log_id: null,
      });
    }

    return { reminder: storage.getReminder(reminder.id), medical_log: med };
  }));

  app.post("/api/reminders/:id/snooze", handle((req) => {
    const days = Number(req.body?.days ?? 3);
    const r = storage.getReminder(String(req.params.id));
    if (!r) throw Object.assign(new Error("Reminder not found"), { status: 404 });
    const next = new Date(new Date(r.due_date).getTime() + days * 86400000)
      .toISOString()
      .slice(0, 10);
    return storage.updateReminder(r.id, { due_date: next });
  }));

  // ---- Medication Protocols ----
  app.get("/api/medication-protocols", handle(() => storage.listProtocols()));
  app.patch("/api/medication-protocols/:id", handle((req) => {
    const partial = insertMedicationProtocolSchema.partial().parse(req.body);
    return storage.updateProtocol(String(req.params.id), partial);
  }));

  // ---- Lineage / Breeding ----
  app.get("/api/pigs/:id/lineage", handle((req) => {
    const out = storage.getLineage(String(req.params.id));
    if (!out) throw Object.assign(new Error("Pig not found"), { status: 404 });
    return out;
  }));
  app.post("/api/breeding/check", handle((req) => {
    const female_id = String(req.body?.female_id ?? "");
    const male_id = String(req.body?.male_id ?? "");
    if (!female_id || !male_id) throw Object.assign(new Error("female_id and male_id required"), { status: 400 });
    return storage.checkBreeding(female_id, male_id);
  }));

  // ---- Employees ----
  app.get("/api/employees", handle(() => storage.listEmployees()));
  app.post("/api/employees", handle((req) =>
    storage.createEmployee(insertEmployeeSchema.parse(req.body))));
  app.patch("/api/employees/:id", handle((req) => {
    const partial = insertEmployeeSchema.partial().parse(req.body);
    return storage.updateEmployee(String(req.params.id), partial);
  }));

  // ---- Expenses ----
  app.get("/api/expenses", handle((req) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    return storage.listExpenses({ category, from, to });
  }));
  app.post("/api/expenses", handle((req) =>
    storage.createExpense(insertExpenseSchema.parse(req.body))));
  app.delete("/api/expenses/:id", handle((req, res) => {
    storage.deleteExpense(String(req.params.id));
    res.json({ ok: true });
  }));

  // ---- Income ----
  app.get("/api/income", handle(() => storage.listIncome()));
  app.post("/api/income", handle((req) =>
    storage.createIncome(insertIncomeSchema.parse(req.body))));

  // ---- Payroll ----
  app.get("/api/payroll", handle(() => storage.listPayrollRuns()));
  app.post("/api/payroll/run", handle((req) => {
    const month = String(req.body?.month ?? new Date().toISOString().slice(0, 7));
    return storage.runPayroll(month);
  }));

  // ---- Budget ----
  app.get("/api/budget/summary", handle((req) => {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    return storage.getBudgetSummary(month);
  }));
  app.get("/api/budget/trend", handle((req) => {
    const months = req.query.months ? Number(req.query.months) : 12;
    return storage.getBudgetTrend(months);
  }));
  app.get("/api/budget/cost-per-kg", handle(() => storage.getCostPerKg()));

  return httpServer;
}
