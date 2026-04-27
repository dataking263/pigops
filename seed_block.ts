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
