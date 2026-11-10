import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();
let adminHash = null;
const MENUS = ["Dashboard", "Equipment Master", "Inward Entry", "Job Cards", "Detail Search", "Data Management", "Attendance", "Parts Catalogue", "Vehicle History", "Vehicle Presentation", "Reports & MIS", "Scrap"];

export async function initialiseAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  if (!process.env.ADMIN_USERNAME || !password || password.length < 12) throw new Error("Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters in server/.env");
  adminHash = await bcrypt.hash(password, 12);
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(401).json({ message: "Invalid username or password." });
  const normalized = String(username).trim().toLowerCase();
  let identity;
  if (normalized === String(process.env.ADMIN_USERNAME).trim().toLowerCase() && adminHash && await bcrypt.compare(password, adminHash)) {
    identity = { username: process.env.ADMIN_USERNAME, role: "superadmin", permissions: Object.fromEntries(MENUS.map(m => [m, "edit"])) };
  } else {
    const user = await User.findOne({ username: normalized, active: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid username or password." });
    identity = { username: user.username, role: user.role, permissions: user.permissions || {} };
  }
  const token = jwt.sign(identity, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, username: identity.username, role: identity.role, permissions: identity.permissions, expiresIn: 28800 });
});

router.get("/me", requireAuth, (req, res) => res.json({ username: req.admin.username, role: req.admin.role, permissions: req.admin.permissions || {} }));

router.get("/users", requireAuth, requireSuperAdmin, async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ username: 1 }).lean();
  res.json({ users, menus: MENUS });
});

router.post("/users", requireAuth, requireSuperAdmin, async (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const permissions = req.body?.permissions || {};
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return res.status(400).json({ message: "Username must be 3-40 characters (letters, numbers, dot, underscore or hyphen)." });
  if (password.length < 12) return res.status(400).json({ message: "Password must be at least 12 characters." });
  const cleanPermissions = { Dashboard: "view" };
  for (const menu of MENUS) if (["view", "edit"].includes(permissions[menu])) cleanPermissions[menu] = permissions[menu];
  try {
    const user = await User.create({ username, passwordHash: await bcrypt.hash(password, 12), permissions: cleanPermissions, role: "user" });
    res.status(201).json({ user: { _id: user._id, username: user.username, role: user.role, permissions: user.permissions, active: user.active } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That username already exists." });
    throw error;
  }
});

router.patch("/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const update = {};
  if (req.body?.permissions) {
    update.permissions = {};
    for (const menu of MENUS) if (["view", "edit"].includes(req.body.permissions[menu])) update.permissions[menu] = req.body.permissions[menu];
  }
  if (typeof req.body?.active === "boolean") update.active = req.body.active;
  if (req.body?.password) {
    if (String(req.body.password).length < 12) return res.status(400).json({ message: "Password must be at least 12 characters." });
    update.passwordHash = await bcrypt.hash(String(req.body.password), 12);
  }
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
});

router.delete("/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ success: true });
});

export default router;
