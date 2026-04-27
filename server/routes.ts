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
} from "@shared/schema";
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

  return httpServer;
}
