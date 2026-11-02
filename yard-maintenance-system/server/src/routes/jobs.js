import { Router } from "express";
import { Inward, Job } from "../models.js";

const router = Router();
const clean = (v) => String(v ?? "").trim();

const cleanDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date provided.");
  }

  return date;
};

const normalizePartsLots = (lots) => {
  if (!Array.isArray(lots)) return [];

  return lots.map((lot, index) => ({
    lotName: clean(lot.lotName) || `Lot ${index + 1}`,

    // Shared by every part in this lot
    prNumber: clean(lot.prNumber),
    prDate: cleanDate(lot.prDate),
    poNumber: clean(lot.poNumber),
    poDate: cleanDate(lot.poDate),

    // Individual part details
    parts: (Array.isArray(lot.parts) ? lot.parts : []).map((part) => {
      const requested = Number(part.quantityRequested || 0);
      const ordered = Number(part.quantityOrdered || 0);

      if (
        !Number.isFinite(requested) ||
        !Number.isFinite(ordered) ||
        requested < 0 ||
        ordered < 0
      ) {
        throw new Error("Part quantities must be valid non-negative numbers.");
      }

      return {
        materialCode: clean(part.materialCode),
        partName: clean(part.partName),
        shortText: clean(part.shortText),
        quantityRequested: requested,
        quantityOrdered: ordered,
        deletionIndicator: Boolean(part.deletionIndicator),
      };
    }),
  }));
};

const editable = [
  "expectedOutDate",
  "problems",
  "actionTaken",
  "partsRequired",
  "partsChanged",
  "mechanicNames",
  "sapMaintenanceOrderNumber",

  // MR details
  "mrNumber",
  "mrDate",

  // Maintenance order details
  "maintenanceOrderNumber",
  "maintenanceOrderDate",

  // Parts procurement
  "partsLots",

  "status",
  "finalRemarks",
];

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;

  if (req.query.q) {
    const q = clean(req.query.q);
    filter.$or = [
      "jobCardNumber",
      "technicalObjectNumber",
      "vehicleNumber",
      "inwardGatepassNumber",
      "sapMaintenanceOrderNumber",

      "mrNumber",

      "maintenanceOrderNumber",
      "mechanicNames",
      "partsLots.prNumber",
      "partsLots.poNumber",
      "partsLots.parts.materialCode",
      "partsLots.parts.partName",
      "partsLots.parts.shortText",
    ].map((key) => ({
      [key]: { $regex: q, $options: "i" },
    }));
  }

  if (req.query.from || req.query.to) {
    const dateField = req.query.dateField === "createdAt" ? "createdAt" : "inDateTime";
    filter[dateField] = {};
    if (req.query.from) filter[dateField].$gte = new Date(req.query.from);
    if (req.query.to) {
      const d = new Date(req.query.to);
      d.setHours(23, 59, 59, 999);
      filter[dateField].$lte = d;
    }
  }

  res.json(
    await Job.find(filter)
      .populate("equipment")
      .populate("inward")
      .sort({ inDateTime: -1 })
      .lean()
  );
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.inwardId) {
      return res.status(400).json({ message: "Choose an inward entry to create a job card." });
    }

    const inward = await Inward.findById(b.inwardId).populate("equipment");
    if (!inward) {
      return res.status(404).json({ message: "Inward entry not found." });
    }

    const jobCardNumber = `JC-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    const job = await Job.create({
      jobCardNumber,
      equipment: inward.equipment._id,
      inward: inward._id,
      technicalObjectNumber: inward.technicalObjectNumber,
      vehicleNumber: inward.vehicleNumber,
      equipmentType: inward.equipmentType,
      make: inward.make,
      model: inward.model,
      inDateTime: inward.inDateTime,
      inwardGatepassNumber: inward.gatepassNumber,
      expectedOutDate: cleanDate(b.expectedOutDate),
      problems: clean(b.problems),
      actionTaken: clean(b.actionTaken),
      partsRequired: clean(b.partsRequired),
      partsChanged: clean(b.partsChanged),
      mechanicNames: clean(b.mechanicNames),
      sapMaintenanceOrderNumber: clean(b.sapMaintenanceOrderNumber),

      mrNumber: clean(b.mrNumber),
      mrDate: cleanDate(b.mrDate),

      maintenanceOrderNumber: clean(b.maintenanceOrderNumber),
      maintenanceOrderDate: cleanDate(b.maintenanceOrderDate),
      partsLots: normalizePartsLots(b.partsLots),
      status: clean(b.status) || "In Progress",
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to create job card." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const updates = {};

    for (const key of editable) {
      if (req.body?.[key] === undefined) continue;

      if (
        key === "expectedOutDate" ||
        key === "mrDate" ||
        key === "maintenanceOrderDate"
      ) {
        updates[key] = cleanDate(req.body[key]);
      } else if (key === "partsLots") {
        updates.partsLots = normalizePartsLots(req.body.partsLots);
      } else if (key === "status") {
        updates.status = clean(req.body[key]);
      } else {
        updates[key] = clean(req.body[key]);
      }
    }

    if (updates.status === "Exited") {
      return res.status(400).json({
        message: "Use the exit action to record a vehicle exit.",
      });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        message: "Job card not found.",
      });
    }

    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/complete", async (req, res) => {
  const b = req.body || {};
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: "Job card not found." });
  if (job.status === "Exited") {
    return res.status(409).json({ message: "This vehicle has already exited." });
  }
  if (!b.jobCompletedDateTime || !clean(b.completedByMechanic)) {
    return res.status(400).json({ message: "Completed date/time and mechanic name are required." });
  }

  job.jobCompletedDateTime = new Date(b.jobCompletedDateTime);
  job.completedByMechanic = clean(b.completedByMechanic);
  job.finalRemarks = clean(b.finalRemarks);
  job.status = "Completed";
  await job.save();

  res.json(job);
});

router.post("/:id/exit", async (req, res) => {
  const b = req.body || {};
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: "Job card not found." });
  if (job.status === "Exited") {
    return res.status(409).json({ message: "Exit has already been recorded." });
  }
  if (job.status !== "Completed") {
    return res.status(400).json({ message: "Complete the maintenance job before recording exit." });
  }
  if (!clean(b.exitGatepassNumber) || !b.exitDateTime) {
    return res.status(400).json({ message: "Exit gatepass number and exit date/time are required." });
  }

  job.exitGatepassNumber = clean(b.exitGatepassNumber);
  job.exitDateTime = new Date(b.exitDateTime);
  job.status = "Exited";
  await job.save();

  await Inward.findByIdAndUpdate(job.inward, {
    exited: true,
    exitDateTime: job.exitDateTime,
  });

  res.json(job);
});

export default router;