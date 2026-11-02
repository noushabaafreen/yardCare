import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
let adminHash = null;

export async function initialiseAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  if (!process.env.ADMIN_USERNAME || !password || password.length < 12) {
    throw new Error("Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters in server/.env");
  }
  adminHash = await bcrypt.hash(password, 12);
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || username !== process.env.ADMIN_USERNAME || !adminHash) {
    return res.status(401).json({ message: "Invalid username or password." });
  }
  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) return res.status(401).json({ message: "Invalid username or password." });
  const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, username, expiresIn: 28800 });
});

router.get("/me", requireAuth, (req, res) => res.json({ username: req.admin.username, role: req.admin.role }));
export default router;
