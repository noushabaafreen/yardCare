import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET, { maxAge: "2h" });
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== "superadmin") {
    return res.status(403).json({ message: "Only the Super Admin can manage users." });
  }
  next();
}

export function requireMenu(menu) {
  return (req, res, next) => {
    if (req.admin?.role === "superadmin") return next();
    const permission = req.admin?.permissions?.[menu];
    if (!permission) return res.status(403).json({ message: `You do not have access to ${menu}.` });
    if (req.method !== "GET" && permission !== "edit") {
      return res.status(403).json({ message: `You have view-only access to ${menu}.` });
    }
    next();
  };
}
