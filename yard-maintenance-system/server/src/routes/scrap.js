import { Router } from "express";
import ExcelJS from "exceljs";
import { ScrapVehicle } from "../models.js";

const router = Router();
const clean = (value) => String(value ?? "").trim();
const fields = ["vehicleNumber", "technicalNumber", "issue", "vehicleType", "makeCompany"];

function validate(body) {
  const data = {};
  for (const field of fields) data[field] = clean(body?.[field]);
  const missing = fields.filter((field) => !data[field]);
  if (missing.length) return { error: `Please provide: ${missing.join(", ")}.` };
  return { data };
}

router.get("/", async (_req, res) => {
  try {
    const records = await ScrapVehicle.find().sort({ createdAt: -1 }).lean();
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: "Unable to load scrap vehicles." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { data, error } = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const record = await ScrapVehicle.create(data);
    res.status(201).json({ message: "Scrap vehicle added successfully.", record });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to add scrap vehicle." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { data, error } = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const record = await ScrapVehicle.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Scrap vehicle not found." });
    res.json({ message: "Scrap vehicle updated successfully.", record });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to update scrap vehicle." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const record = await ScrapVehicle.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Scrap vehicle not found." });
    res.json({ message: "Scrap vehicle deleted successfully." });
  } catch (error) {
    res.status(400).json({ message: "Unable to delete scrap vehicle." });
  }
});

router.get("/export", async (_req, res) => {
  try {
    const records = await ScrapVehicle.find().sort({ createdAt: 1 }).lean();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Scrap Vehicles");
    sheet.columns = [
      { header: "SL NO", key: "sl", width: 10 },
      { header: "VEHICLE NUMBER", key: "vehicleNumber", width: 22 },
      { header: "TECHNICAL NUMBER", key: "technicalNumber", width: 22 },
      { header: "ISSUE OF VEHICLE", key: "issue", width: 48 },
      { header: "TYPE OF VEHICLE", key: "vehicleType", width: 24 },
      { header: "MAKE / COMPANY", key: "makeCompany", width: 24 },
    ];
    records.forEach((record, index) => sheet.addRow({ sl: index + 1, ...record }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12345A" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "F1" };
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "middle", wrapText: true };
      if (rowNumber > 1) row.height = 30;
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Scrap_Vehicles.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Scrap Excel export error:", error);
    res.status(500).json({ message: "Unable to export scrap vehicles." });
  }
});

export default router;
