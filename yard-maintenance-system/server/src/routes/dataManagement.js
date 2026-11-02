import { Router } from "express";
import mongoose from "mongoose";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();

// Delete a vehicle and all linked maintenance history.
router.delete("/equipment/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: "Invalid equipment ID."
    });
  }

  const equipment = await Equipment.findById(req.params.id).lean();

  if (!equipment) {
    return res.status(404).json({
      message: "Equipment not found."
    });
  }

  const match = {
    $or: [
      { equipment: equipment._id },
      { technicalObjectNumber: equipment.technicalObjectNumber }
    ]
  };

  const relatedJobs = await Job.find(match, { _id: 1, inward: 1 }).lean();
  const inwardIds = relatedJobs.map((job) => job.inward).filter(Boolean);

  const [jobsDeleted, inwardsByEquipment, inwardsByJob] = await Promise.all([
    Job.deleteMany(match),
    Inward.deleteMany(match),
    inwardIds.length
      ? Inward.deleteMany({ _id: { $in: inwardIds } })
      : Promise.resolve({ deletedCount: 0 })
  ]);

  await Equipment.deleteOne({ _id: equipment._id });

  return res.json({
    success: true,
    message: "Equipment and linked history deleted.",
    deleted: {
      equipment: 1,
      jobs: jobsDeleted.deletedCount || 0,
      inwards: (inwardsByEquipment.deletedCount || 0) + (inwardsByJob.deletedCount || 0)
    }
  });
});

// Delete one job card and its linked inward record.
router.delete("/jobs/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: "Invalid job card ID."
    });
  }

  const job = await Job.findById(req.params.id).lean();

  if (!job) {
    return res.status(404).json({
      message: "Job card not found."
    });
  }

  await Job.deleteOne({ _id: job._id });

  if (job.inward) {
    await Inward.deleteOne({ _id: job.inward });
  }

  return res.json({
    success: true,
    message: "Job card and linked inward record deleted."
  });
});

export default router;