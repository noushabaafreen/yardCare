import { Router } from "express";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();
const clean = (v) => String(v ?? "").trim();

router.get("/", async (req, res) => {
  const q = clean(req.query.q);
  const filter = q ? { $or: [
    { technicalObjectNumber: { $regex: q, $options: "i" } },
    { vehicleNumber: { $regex: q, $options: "i" } },
    { equipmentType: { $regex: q, $options: "i" } },
    { model: { $regex: q, $options: "i" } }
  ] } : {};
  res.json(await Equipment.find(filter).sort({ technicalObjectNumber: 1 }).lean());
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  if (!clean(body.technicalObjectNumber) || !clean(body.equipmentType)) {
    return res.status(400).json({ message: "Technical object number and equipment type are required." });
  }
  try {
    const equipment = await Equipment.create({
      technicalObjectNumber: clean(body.technicalObjectNumber),
      vehicleNumber: clean(body.vehicleNumber), equipmentName: clean(body.equipmentName),
      equipmentType: clean(body.equipmentType), make: clean(body.make),
      model: clean(body.model), remarks: clean(body.remarks)
    });
    res.status(201).json(equipment);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "That technical object number already exists." });
    throw e;
  }
});

router.patch("/:id", async (req, res) => {
  const allowed = ["vehicleNumber","equipmentName","equipmentType","make","model","remarks"];
  const updates = Object.fromEntries(allowed.filter(k => req.body?.[k] !== undefined).map(k => [k, clean(req.body[k])]));
  const equipment = await Equipment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!equipment) return res.status(404).json({ message: "Equipment not found." });
  res.json(equipment);
});

router.delete("/:id", async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) return res.status(404).json({ message: "Equipment not found." });
  const used = await Inward.exists({ equipment: equipment._id });
  const hasJobs = await Job.exists({ equipment: equipment._id });
  if (used || hasJobs) return res.status(409).json({ message: "Equipment with inward/job history cannot be deleted. Edit it instead." });
  await equipment.deleteOne();
  res.json({ success: true });
});

export default router;
