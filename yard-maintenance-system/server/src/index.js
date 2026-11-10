import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes, { initialiseAdmin } from "./routes/auth.js";
import equipmentRoutes from "./routes/equipment.js";
import inwardRoutes from "./routes/inwards.js";
import jobRoutes from "./routes/jobs.js";
import reportRoutes from "./routes/reports.js";
import { requireAuth, requireMenu } from "./middleware/auth.js";
import dataManagementRoutes from "./routes/dataManagement.js";
import attendanceRoutes from "./routes/attendance.js";
import partsCatalogRoutes from "./routes/partsCatalog.js";
import scrapRoutes from "./routes/scrap.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim()), credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ success: true, message: "Yard Maintenance API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/equipment", requireAuth, requireMenu("Equipment Master"), equipmentRoutes);
app.use("/api/inwards", requireAuth, requireMenu("Inward Entry"), inwardRoutes);
app.use("/api/jobs", requireAuth, requireMenu("Job Cards"), jobRoutes);
app.use("/api/reports", requireAuth, requireMenu("Reports & MIS"), reportRoutes);
app.use("/api/data-management", requireAuth, requireMenu("Data Management"), dataManagementRoutes);
app.use("/api/attendance", requireAuth, requireMenu("Attendance"), attendanceRoutes);
app.use("/api/parts-catalog", requireAuth, requireMenu("Parts Catalogue"), partsCatalogRoutes);
app.use("/api/scrap", requireAuth, requireMenu("Scrap"), scrapRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid record ID." });
  res.status(500).json({ message: "Unexpected server error." });
});

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) throw new Error("JWT_SECRET must be at least 24 characters.");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yard_maintenance");
  await initialiseAdmin();
  app.listen(PORT, () => console.log(`Yard Maintenance API listening at http://localhost:${PORT}`));
} catch (err) {
  console.error("Startup failed:", err.message);
  process.exit(1);
}
