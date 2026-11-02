import { Router } from "express";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const router = Router();
const catalogPath = fileURLToPath(new URL("../../data/material-parts.json", import.meta.url));
let cache = null;

async function getCatalog() {
  if (!cache) {
    const raw = await readFile(catalogPath, "utf8");
    cache = JSON.parse(raw);
  }
  return cache;
}

router.get("/", async (_req, res, next) => {
  try {
    const parts = await getCatalog();
    res.set("Cache-Control", "private, max-age=300");
    res.json({ count: parts.length, companies: [...new Set(parts.map(p => p.company))].sort(), parts });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const materialCode = String(req.body?.materialCode || "").trim();
    const materialName = String(req.body?.materialName || "").trim();
    const company = String(req.body?.company || "").trim();
    if (!materialCode || !materialName || !company) {
      return res.status(400).json({ message: "Material code, material name, and company are required." });
    }
    const parts = await getCatalog();
    const duplicate = parts.some(p => p.materialCode.toLowerCase() === materialCode.toLowerCase() && p.company.toLowerCase() === company.toLowerCase());
    if (duplicate) return res.status(409).json({ message: "This material code already exists for the selected company." });
    const updated = [...parts, { materialCode, materialName, company }];
    await writeFile(catalogPath, JSON.stringify(updated, null, 2), "utf8");
    cache = updated;
    res.status(201).json({ message: "Part added to catalogue.", part: updated[updated.length - 1], count: updated.length });
  } catch (error) {
    next(error);
  }
});


router.put("/:materialCode/:company", async (req, res, next) => {
  try {
    const oldCode = String(req.params.materialCode || "").trim();
    const oldCompany = String(req.params.company || "").trim();
    const materialCode = String(req.body?.materialCode || "").trim();
    const materialName = String(req.body?.materialName || "").trim();
    const company = String(req.body?.company || "").trim();
    if (!materialCode || !materialName || !company) {
      return res.status(400).json({ message: "Material code, material name, and company are required." });
    }
    const parts = await getCatalog();
    const index = parts.findIndex(p => p.materialCode === oldCode && p.company === oldCompany);
    if (index < 0) return res.status(404).json({ message: "Part not found." });
    const duplicate = parts.some((p, i) => i !== index &&
      p.materialCode.toLowerCase() === materialCode.toLowerCase() &&
      p.company.toLowerCase() === company.toLowerCase());
    if (duplicate) return res.status(409).json({ message: "This material code already exists for the selected company." });
    const updated = parts.map((p, i) => i === index ? { materialCode, materialName, company } : p);
    await writeFile(catalogPath, JSON.stringify(updated, null, 2), "utf8");
    cache = updated;
    res.json({ message: "Part updated.", part: updated[index] });
  } catch (error) {
    next(error);
  }
});

router.delete("/:materialCode/:company", async (req, res, next) => {
  try {
    const materialCode = String(req.params.materialCode || "").trim();
    const company = String(req.params.company || "").trim();
    const parts = await getCatalog();
    const updated = parts.filter(p => !(p.materialCode === materialCode && p.company === company));
    if (updated.length === parts.length) return res.status(404).json({ message: "Part not found." });
    await writeFile(catalogPath, JSON.stringify(updated, null, 2), "utf8");
    cache = updated;
    res.json({ message: "Part deleted.", count: updated.length });
  } catch (error) {
    next(error);
  }
});

export default router;
