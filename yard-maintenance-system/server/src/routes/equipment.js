import { Router } from "express";
import mongoose from "mongoose";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();
const clean = (v) => String(v ?? "").trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Express 4 does not catch rejected promises from async handlers; forward them to the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Returns null for empty, undefined for an invalid date, otherwise a Date.
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const validId = (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json({ message: "Invalid equipment id." });
  return false;
};

router.get(
  "/",
  wrap(async (req, res) => {
    const q = clean(req.query.q);
    const rx = q ? { $regex: escapeRegex(q), $options: "i" } : null;
    const filter = rx
      ? {
          $or: [
            { technicalObjectNumber: rx },
            { vehicleNumber: rx },
            { equipmentName: rx },
            { equipmentType: rx },
            { make: rx },
            { model: rx },
          ],
        }
      : {};
    res.json(await Equipment.find(filter).sort({ technicalObjectNumber: 1 }).lean());
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const body = req.body || {};
    if (!clean(body.technicalObjectNumber) || !clean(body.equipmentType)) {
      return res.status(400).json({ message: "Technical object number and equipment type are required." });
    }
    const inDate = parseDate(body.inDate);
    if (inDate === undefined) return res.status(400).json({ message: "In date is not a valid date." });

    try {
      const equipment = await Equipment.create({
        technicalObjectNumber: clean(body.technicalObjectNumber),
        vehicleNumber: clean(body.vehicleNumber),
        equipmentName: clean(body.equipmentName),
        equipmentType: clean(body.equipmentType),
        make: clean(body.make),
        model: clean(body.model),
        remarks: clean(body.remarks),
        gatepassNumber: clean(body.gatepassNumber),
        inDate,
      });
      res.status(201).json(equipment);
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: "That technical object number already exists." });
      throw e;
    }
  })
);

router.patch(
  "/:id",
  wrap(async (req, res) => {
    if (!validId(req, res)) return;

    const allowed = [
      "vehicleNumber",
      "equipmentName",
      "equipmentType",
      "make",
      "model",
      "remarks",
      "gatepassNumber",
      "inDate",
    ];

    const updates = {};
    for (const k of allowed) {
      if (req.body?.[k] === undefined) continue;
      if (k === "inDate") {
        const d = parseDate(req.body[k]);
        if (d === undefined) return res.status(400).json({ message: "In date is not a valid date." });
        updates[k] = d;
      } else {
        updates[k] = clean(req.body[k]);
      }
    }

    if ("equipmentType" in updates && !updates.equipmentType) {
      return res.status(400).json({ message: "Equipment type is required." });
    }

    const equipment = await Equipment.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!equipment) return res.status(404).json({ message: "Equipment not found." });
    res.json(equipment);
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    if (!validId(req, res)) return;

    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: "Equipment not found." });
    const used = await Inward.exists({ equipment: equipment._id });
    const hasJobs = await Job.exists({ equipment: equipment._id });
    if (used || hasJobs) {
      return res.status(409).json({ message: "Equipment with inward/job history cannot be deleted. Edit it instead." });
    }
    await equipment.deleteOne();
    res.json({ success: true });
  })
);

export default router;
