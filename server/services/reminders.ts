/**
 * Reminder generation service.
 *
 * Walks active pigs and active protocols, materialises pen_reminders for the
 * next 30 days. Idempotent — wipes existing pending reminders and rebuilds.
 *
 * Skip rules:
 *   - Disabled protocols are ignored
 *   - If a recent medical_log matches the protocol's treatment family within
 *     a sane window, the next due is rolled forward instead of duplicated.
 */
import { storage } from "../storage";
import type { Pig, MedicalLog, MedicationProtocol, BirthLog } from "@shared/schema";

const DAY_MS = 86400000;
const ISO_DAY = (d: Date) => d.toISOString().slice(0, 10);
const today = () => new Date();
const todayStr = () => ISO_DAY(today());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

function ageDaysOf(p: Pig): number | null {
  if (!p.birth_date) return null;
  return Math.floor((Date.now() - new Date(p.birth_date).getTime()) / DAY_MS);
}

/** Has a medical_log matching this protocol's product_name been recorded for this pig/pen recently? */
function hasRecentMatch(
  meds: MedicalLog[],
  protocol: MedicationProtocol,
  pigId: string | null,
  pen: number,
  windowDays: number,
): MedicalLog | null {
  const cutoff = ISO_DAY(addDays(today(), -windowDays));
  for (const m of meds) {
    if (m.date_logged < cutoff) continue;
    // Match by product_name (loose match) or treatment_type
    const matchesProduct = m.product_name.toLowerCase().includes(
      protocol.product_name.toLowerCase().split(" ")[0],
    );
    const matchesPig = pigId ? m.pig_id === pigId : !m.pig_id || String(m.pen) === String(pen);
    if (matchesProduct && matchesPig) return m;
  }
  return null;
}

export interface GenerateOptions {
  lookaheadDays?: number;
}

export interface GenerationStats {
  protocols_active: number;
  active_pigs: number;
  reminders_created: number;
  by_category: Record<string, number>;
}

export function generateReminders(opts: GenerateOptions = {}): GenerationStats {
  const lookahead = opts.lookaheadDays ?? 30;
  const horizon = ISO_DAY(addDays(today(), lookahead));

  // Wipe existing pending reminders so we don't duplicate
  storage.clearPendingReminders();

  const protocols = storage.listProtocols().filter((p) => p.enabled === 1);
  const allPigs = storage.listPigs().filter((p) => p.status === "Active");
  const allMeds = storage.listMedicalLogs();
  const allBirths = storage.listBirthLogs();
  const pens = storage.listPens();
  const pensById = new Map(pens.map((p) => [p.id, p] as const));
  const stats: GenerationStats = {
    protocols_active: protocols.length,
    active_pigs: allPigs.length,
    reminders_created: 0,
    by_category: {},
  };

  // Group pigs by pen for category-level (whole-pen) protocols
  const pigsByPen = new Map<number, Pig[]>();
  for (const p of allPigs) {
    if (!p.current_pen) continue;
    if (!pigsByPen.has(p.current_pen)) pigsByPen.set(p.current_pen, []);
    pigsByPen.get(p.current_pen)!.push(p);
  }

  // Index latest birth_log per sow
  const lastBirthBySow = new Map<string, BirthLog>();
  for (const b of allBirths) {
    const cur = lastBirthBySow.get(b.sow_pig_id);
    if (!cur || b.date_logged > cur.date_logged) lastBirthBySow.set(b.sow_pig_id, b);
  }

  function recordReminder(
    pen: number,
    pigId: string | null,
    protocolId: string,
    dueDate: string,
    category: string,
  ) {
    if (dueDate > horizon) return;
    if (dueDate < ISO_DAY(addDays(today(), -7))) return; // skip ancient stuff
    storage.createReminder({
      pen,
      pig_id: pigId,
      protocol_id: protocolId,
      due_date: dueDate,
      status: "pending",
      created_at: new Date().toISOString(),
      completed_at: null,
      completed_medical_log_id: null,
    });
    stats.reminders_created++;
    stats.by_category[category] = (stats.by_category[category] ?? 0) + 1;
  }

  // ----- Per-pig protocols -----
  for (const protocol of protocols) {
    if (protocol.category === "All") continue; // handled below

    const candidates = allPigs.filter((p) => p.category === protocol.category && p.current_pen);

    for (const pig of candidates) {
      const ageDays = ageDaysOf(pig);
      const pen = pig.current_pen!;

      switch (protocol.trigger_type) {
        case "age_days": {
          if (ageDays == null || !pig.birth_date) break;
          const due = addDays(new Date(pig.birth_date), protocol.trigger_value);
          const dueStr = ISO_DAY(due);
          // skip if already done (within 60d window for age-based one-shots)
          const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, 60);
          if (recent) break;
          // Only schedule if upcoming (not too long past)
          if (dueStr >= ISO_DAY(addDays(today(), -3))) {
            recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          }
          break;
        }

        case "recurring_days": {
          // base: last matching med, else either creation_date or birth_date
          const lastMatch = hasRecentMatch(allMeds, protocol, pig.id, pen, protocol.trigger_value * 2);
          let nextDue: Date;
          if (lastMatch) {
            nextDue = addDays(new Date(lastMatch.date_logged), protocol.trigger_value);
          } else {
            // never done — schedule now (today)
            nextDue = today();
          }
          const dueStr = ISO_DAY(nextDue);
          recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          break;
        }

        case "pre_farrow_days": {
          // For sows: if there's a recent farrow, project next farrow at +114d
          if (protocol.category !== "Sow") break;
          const lastBirth = lastBirthBySow.get(pig.id);
          if (!lastBirth) {
            // no farrow record — heuristic: if sow >300d old, schedule a soft reminder 30d out
            if ((ageDays ?? 0) > 300) {
              const due = ISO_DAY(addDays(today(), 30));
              const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, 90);
              if (!recent) recordReminder(pen, pig.id, protocol.id, due, protocol.category);
            }
            break;
          }
          // Skip if last farrow was more than 30 days ago AND less than 60d ago — too early
          const daysSinceFarrow = Math.floor(
            (Date.now() - new Date(lastBirth.date_logged).getTime()) / DAY_MS,
          );
          // Next gestation cycle: assume rebreeding ~7d after weaning (around d28 after farrow)
          // gestation 114d, so next farrow ~149 days after this farrow
          const nextFarrow = addDays(new Date(lastBirth.date_logged), 149);
          const dueDate = addDays(nextFarrow, -protocol.trigger_value);
          const dueStr = ISO_DAY(dueDate);
          // Skip if already done since last farrow
          const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, daysSinceFarrow + 30);
          if (recent) break;
          recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          break;
        }

        case "post_weaning_days": {
          // weaning approx age 28d for piglets; for weaners/growers, assume already weaned
          if (!pig.birth_date) break;
          const weaningDate = addDays(new Date(pig.birth_date), 28);
          const due = addDays(weaningDate, protocol.trigger_value);
          const dueStr = ISO_DAY(due);
          const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, 60);
          if (recent) break;
          if (dueStr >= ISO_DAY(addDays(today(), -3))) {
            recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          }
          break;
        }

        case "event_weaning": {
          // Schedule on the projected weaning date for piglets (birth + 28d)
          if (protocol.category !== "Piglet") break;
          if (!pig.birth_date) break;
          const wDate = addDays(new Date(pig.birth_date), 28);
          const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, 60);
          if (recent) break;
          const dueStr = ISO_DAY(wDate);
          if (dueStr >= ISO_DAY(addDays(today(), -3))) {
            recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          }
          break;
        }

        case "event_birth": {
          // Schedule on birth date for piglets (already happened)
          if (!pig.birth_date) break;
          const recent = hasRecentMatch(allMeds, protocol, pig.id, pen, 60);
          if (recent) break;
          const due = addDays(new Date(pig.birth_date), protocol.trigger_value);
          const dueStr = ISO_DAY(due);
          if (dueStr >= ISO_DAY(addDays(today(), -3))) {
            recordReminder(pen, pig.id, protocol.id, dueStr, protocol.category);
          }
          break;
        }
      }
    }
  }

  // ----- Whole-farm protocols (category "All") -----
  // ASF biosecurity: schedule a reminder per pen, every trigger_value days
  for (const protocol of protocols) {
    if (protocol.category !== "All") continue;
    if (protocol.trigger_type !== "recurring_days") continue;

    for (const pen of pens) {
      const lastMatch = hasRecentMatch(allMeds, protocol, null, pen.id, protocol.trigger_value * 2);
      const nextDue = lastMatch
        ? addDays(new Date(lastMatch.date_logged), protocol.trigger_value)
        : today();
      const dueStr = ISO_DAY(nextDue);
      recordReminder(pen.id, null, protocol.id, dueStr, "All");
    }
  }

  return stats;
}
