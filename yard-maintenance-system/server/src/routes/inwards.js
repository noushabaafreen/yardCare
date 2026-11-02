import { Router } from "express";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();
const clean = v => String(v ?? "").trim();

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.active === "true") filter.exited = false;
  if (req.query.active === "false") filter.exited = true;
  if (req.query.from || req.query.to) {
    filter.inDateTime = {};
    if (req.query.from) filter.inDateTime.$gte = new Date(req.query.from);
    if (req.query.to) { const d = new Date(req.query.to); d.setHours(23,59,59,999); filter.inDateTime.$lte = d; }
  }
  res.json(await Inward.find(filter).populate("equipment").sort({ inDateTime: -1 }).lean());
});

router.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.equipmentId || !clean(b.gatepassNumber) || !b.inDateTime) {
    return res.status(400).json({ message: "Equipment, gatepass number and inward date/time are required." });
  }
  const equipment = await Equipment.findById(b.equipmentId);
  if (!equipment) return res.status(404).json({ message: "Equipment not found." });
  const active = await Inward.findOne({ equipment: equipment._id, exited: false });
  if (active) return res.status(409).json({ message: "This equipment already has an active yard entry. Record its exit before creating another inward entry." });
  const inward = await Inward.create({
    equipment: equipment._id, technicalObjectNumber: equipment.technicalObjectNumber,
    vehicleNumber: equipment.vehicleNumber, equipmentType: equipment.equipmentType,
    make: equipment.make, model: equipment.model, gatepassNumber: clean(b.gatepassNumber),
    inDateTime: new Date(b.inDateTime), complaint: clean(b.complaint),
    enteredBy: clean(b.enteredBy), remarks: clean(b.remarks)
  });
  const jobCardNumber = `JC-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
  const job = await Job.create({
    jobCardNumber, equipment: equipment._id, inward: inward._id,
    technicalObjectNumber: equipment.technicalObjectNumber, vehicleNumber: equipment.vehicleNumber,
    equipmentType: equipment.equipmentType, make: equipment.make, model: equipment.model,
    inDateTime: inward.inDateTime, inwardGatepassNumber: inward.gatepassNumber,
    problems: clean(b.complaint), expectedOutDate: b.expectedOutDate ? new Date(b.expectedOutDate) : null,
    status: "In Progress"
  });
  res.status(201).json({ inward, job });
});

export default router;
