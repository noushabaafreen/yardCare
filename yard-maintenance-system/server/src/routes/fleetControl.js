import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const router = express.Router();
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(here, "../../data");
const DATA_FILE = path.join(DATA_DIR, "fleet-control-center.json");

const DEFAULT_CATEGORIES = ["Hydra", "Hyva", "Excavator", "Tipper", "Mixer", "Crane", "Wheel Loader", "Backhoe Loader", "Bus", "Trailer", "Other"];
const STAGES = ["Inside Yard", "Work in Progress", "Waiting for Parts", "Inspection Pending", "Work Completed"];

async function readStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = { vehicles: [], categories: DEFAULT_CATEGORIES };
    await writeStore(initial);
    return initial;
  }
}

async function writeStore(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temp, DATA_FILE);
}

const clean = (value) => String(value ?? "").trim();
const dateOnly = (value = new Date()) => new Date(value).toISOString().slice(0, 10);
const daysBetween = (from, to = new Date()) => {
  if (!from) return 0;
  const start = new Date(`${dateOnly(from)}T00:00:00`);
  const end = new Date(`${dateOnly(to)}T00:00:00`);
  return Math.max(0, Math.floor((end - start) / 86400000));
};

router.get("/", async (_req, res, next) => {
  try {
    const data = await readStore();
    const today = dateOnly();
    const inside = data.vehicles.filter(v => !v.exitDate);
    const exited = data.vehicles.filter(v => Boolean(v.exitDate));
    const counts = Object.fromEntries(STAGES.map(stage => [stage, inside.filter(v => v.stage === stage).length]));
    const categoryCounts = data.categories.map(category => ({
      category,
      inside: inside.filter(v => v.category === category).length,
      exited: exited.filter(v => v.category === category).length
    }));
    res.json({
      vehicles: data.vehicles,
      categories: data.categories,
      summary: {
        inside: inside.length,
        workInProgress: counts["Work in Progress"],
        waitingForParts: counts["Waiting for Parts"],
        inspectionPending: counts["Inspection Pending"],
        workCompleted: counts["Work Completed"],
        exited: exited.length,
        over30Days: inside.filter(v => daysBetween(v.entryDate) > 30).length
      },
      stageCounts: counts,
      categoryCounts,
      today
    });
  } catch (error) { next(error); }
});

router.post("/vehicles", async (req, res, next) => {
  try {
    const data = await readStore();
    const vehicleNumber = clean(req.body.vehicleNumber).toUpperCase();
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });
    if (data.vehicles.some(v => v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase() && !v.exitDate)) {
      return res.status(409).json({ message: "This vehicle is already inside the yard." });
    }
    const now = new Date().toISOString();
    const vehicle = {
      id: `FCC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      vehicleNumber,
      technicalObject: clean(req.body.technicalObject),
      category: clean(req.body.category) || "Other",
      makeModel: clean(req.body.makeModel),
      gatePassNumber: clean(req.body.gatePassNumber),
      entryDate: clean(req.body.entryDate) || dateOnly(),
      problem: clean(req.body.problem),
      priority: ["High", "Medium", "Low"].includes(req.body.priority) ? req.body.priority : "Medium",
      stage: "Inside Yard",
      notes: clean(req.body.notes),
      createdAt: now,
      updatedAt: now,
      exitDate: "",
      exitCompletedBy: "",
      reEntryCount: 0
    };
    data.vehicles.unshift(vehicle);
    await writeStore(data);
    res.status(201).json({ vehicle });
  } catch (error) { next(error); }
});

router.put("/vehicles/:id", async (req, res, next) => {
  try {
    const data = await readStore();
    const vehicle = data.vehicles.find(v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle record not found." });
    const fields = ["vehicleNumber", "technicalObject", "category", "makeModel", "gatePassNumber", "entryDate", "problem", "priority", "stage", "notes"];
    for (const field of fields) {
      if (req.body[field] !== undefined) vehicle[field] = field === "vehicleNumber" ? clean(req.body[field]).toUpperCase() : clean(req.body[field]);
    }
    if (!STAGES.includes(vehicle.stage)) vehicle.stage = "Inside Yard";
    if (!["High", "Medium", "Low"].includes(vehicle.priority)) vehicle.priority = "Medium";
    vehicle.updatedAt = new Date().toISOString();
    await writeStore(data);
    res.json({ vehicle });
  } catch (error) { next(error); }
});

router.delete("/vehicles/:id", async (req, res, next) => {
  try {
    const data = await readStore();
    const before = data.vehicles.length;
    data.vehicles = data.vehicles.filter(v => v.id !== req.params.id);
    if (data.vehicles.length === before) return res.status(404).json({ message: "Vehicle record not found." });
    await writeStore(data);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post("/vehicles/:id/exit", async (req, res, next) => {
  try {
    const data = await readStore();
    const vehicle = data.vehicles.find(v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle record not found." });
    if (vehicle.exitDate) return res.status(409).json({ message: "Vehicle has already exited." });
    vehicle.exitDate = clean(req.body.exitDate) || dateOnly();
    vehicle.exitCompletedBy = clean(req.body.completedBy);
    vehicle.stage = "Exited";
    vehicle.updatedAt = new Date().toISOString();
    await writeStore(data);
    res.json({ vehicle, turnaroundDays: daysBetween(vehicle.entryDate, vehicle.exitDate) });
  } catch (error) { next(error); }
});

router.post("/vehicles/:id/re-enter", async (req, res, next) => {
  try {
    const data = await readStore();
    const vehicle = data.vehicles.find(v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle record not found." });
    if (!vehicle.exitDate) return res.status(409).json({ message: "Vehicle is already inside the yard." });
    vehicle.entryDate = clean(req.body.entryDate) || dateOnly();
    vehicle.gatePassNumber = clean(req.body.gatePassNumber);
    vehicle.exitDate = "";
    vehicle.exitCompletedBy = "";
    vehicle.stage = "Inside Yard";
    vehicle.reEntryCount = Number(vehicle.reEntryCount || 0) + 1;
    vehicle.updatedAt = new Date().toISOString();
    await writeStore(data);
    res.json({ vehicle });
  } catch (error) { next(error); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const data = await readStore();
    const category = clean(req.body.category);
    if (!category) return res.status(400).json({ message: "Category name is required." });
    if (data.categories.some(item => item.toLowerCase() === category.toLowerCase())) {
      return res.status(409).json({ message: "Category already exists." });
    }
    data.categories.push(category);
    data.categories.sort((a, b) => a.localeCompare(b));
    await writeStore(data);
    res.status(201).json({ categories: data.categories });
  } catch (error) { next(error); }
});

router.delete("/categories/:category", async (req, res, next) => {
  try {
    const data = await readStore();
    const category = req.params.category;
    if (data.vehicles.some(v => v.category === category)) {
      return res.status(409).json({ message: "This category is in use by vehicle records and cannot be deleted." });
    }
    data.categories = data.categories.filter(item => item !== category);
    await writeStore(data);
    res.json({ categories: data.categories });
  } catch (error) { next(error); }
});

router.get("/export/:kind", async (req, res, next) => {
  try {
    const data = await readStore();
    const kind = req.params.kind;
    if (!["inside", "exited"].includes(kind)) return res.status(400).json({ message: "Export type must be inside or exited." });
    const rows = data.vehicles.filter(v => kind === "inside" ? !v.exitDate : Boolean(v.exitDate));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(kind === "inside" ? "Inside Yard" : "Exited Vehicles");
    sheet.columns = [
      { header: "SL NO", key: "sl", width: 9 },
      { header: "VEHICLE NUMBER", key: "vehicleNumber", width: 20 },
      { header: "TECHNICAL OBJECT", key: "technicalObject", width: 20 },
      { header: "CATEGORY", key: "category", width: 18 },
      { header: "MAKE / MODEL", key: "makeModel", width: 22 },
      { header: "GATE PASS NUMBER", key: "gatePassNumber", width: 20 },
      { header: "ENTRY DATE", key: "entryDate", width: 16 },
      { header: "STAGE", key: "stage", width: 22 },
      { header: "PRIORITY", key: "priority", width: 12 },
      { header: "PROBLEM / REMARKS", key: "problem", width: 35 },
      { header: "EXIT DATE", key: "exitDate", width: 16 },
      { header: "COMPLETED BY", key: "exitCompletedBy", width: 20 },
      { header: "TURNAROUND DAYS", key: "turnaroundDays", width: 18 }
    ];
    rows.forEach((v, i) => sheet.addRow({
      sl: i + 1, ...v, turnaroundDays: v.exitDate ? daysBetween(v.entryDate, v.exitDate) : daysBetween(v.entryDate)
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12345A" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="fleet-control-${kind}-${dateOnly()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
});

export default router;
