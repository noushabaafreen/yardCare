import { Router } from "express";
import ExcelJS from "exceljs";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();
const clean = v => String(v ?? "").trim();
const escapeRegex = s => clean(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function dateBounds(query, field) {
  const bounds = {};
  if (query.from) {
    const fromDate = new Date(query.from);
    if (!isNaN(fromDate)) bounds.$gte = fromDate;
  }
  if (query.to) {
    const toDate = new Date(query.to);
    if (!isNaN(toDate)) {
      toDate.setHours(23, 59, 59, 999);
      bounds.$lte = toDate;
    }
  }
  return Object.keys(bounds).length ? { [field]: bounds } : {};
}

function jobFilter(query) {
  const filter = {};
  const kind = query.kind || "inside";

  if (kind === "inside") filter.status = { $ne: "Exited" };
  else if (kind === "pending") filter.status = { $in: ["Awaiting Job Card", "In Progress", "Waiting for Parts"] };
  else if (kind === "completed") filter.status = { $in: ["Completed", "Exited"] };
  else if (kind === "exited") filter.status = "Exited";
  else if (query.status && query.status !== "all") filter.status = query.status;

  if (query.type && query.type !== "all") filter.equipmentType = query.type;

  if (query.q) {
    const q = escapeRegex(query.q);
    filter.$or = [
      "jobCardNumber", "technicalObjectNumber", "vehicleNumber",
      "inwardGatepassNumber", "exitGatepassNumber", "sapMaintenanceOrderNumber",
      "mechanicNames", "completedByMechanic"
    ].map(k => ({ [k]: { $regex: q, $options: "i" } }));
  }

  Object.assign(filter, dateBounds(query, query.dateField === "createdAt" ? "createdAt" : "inDateTime"));
  return filter;
}

const fmt = d => (d && !isNaN(new Date(d))) ? new Date(d).toISOString().replace("T", " ").slice(0, 16) : "";

function mapJobToRow(x) {
  return {
    "Job Card": x.jobCardNumber ?? "",
    "Technical Object": x.technicalObjectNumber ?? "",
    "Vehicle Number": x.vehicleNumber ?? "",
    "Equipment Type": x.equipmentType ?? "",
    "Make": x.make ?? "",
    "Model": x.model ?? "",
    "Inward Date/Time": fmt(x.inDateTime),
    "Inward Gatepass": x.inwardGatepassNumber ?? "",
    "Expected Outdate": fmt(x.expectedOutDate),
    "Problems": x.problems ?? "",
    "Action Taken": x.actionTaken ?? "",
    "Parts Required": x.partsRequired ?? "",
    "Parts Changed": x.partsChanged ?? "",
    "MO Number": x.maintenanceOrderNumber || "",
    "MO Date": fmt(x.maintenanceOrderDate),
    "STPO Number": x.stpoNumber || "",
    "STPO Date": fmt(x.stpoDate),
    "Parts / PR / PO Details": (x.partsItems || [])
      .map((part, index) =>
        [
          `Part ${index + 1}: ${part.partName || part.shortText || ""}`,
          `Material: ${part.materialCode || ""}`,
          `PR: ${part.prNumber || ""}`,
          `PR Date: ${fmt(part.prDate)}`,
          `Qty Requested: ${part.quantityRequested ?? 0}`,
          `PO: ${part.poNumber || ""}`,
          `PO Date: ${fmt(part.poDate)}`,
          `Qty Ordered: ${part.quantityOrdered ?? 0}`
        ].join(" | ")
      )
      .join("\n"),
    "Parts Lots": (x.partsLots || [])
      .map((lot, lotIndex) => {
        const partDetails = (lot.parts || [])
          .map((part, partIndex) =>
            [
              `Part ${partIndex + 1}: ${part.partName || part.shortText || ""}`,
              `Material: ${part.materialCode || ""}`,
              `Qty Requested: ${part.quantityRequested ?? 0}`,
              `Qty Ordered: ${part.quantityOrdered ?? 0}`
            ].join(" | ")
          )
          .join("\n");

        return [
          `Lot ${lotIndex + 1}: ${lot.lotName || ""}`,
          `PR: ${lot.prNumber || ""}`,
          `PR Date: ${fmt(lot.prDate)}`,
          `PO: ${lot.poNumber || ""}`,
          `PO Date: ${fmt(lot.poDate)}`,
          partDetails
        ].join("\n");
      })
      .join("\n\n"),
    "Mechanic(s)": x.mechanicNames ?? "",
    "SAP Order": x.sapMaintenanceOrderNumber ?? "",
    "Status": x.status ?? "",
    "Completed Date/Time": fmt(x.jobCompletedDateTime),
    "Completed By": x.completedByMechanic ?? "",
    "Exit Gatepass": x.exitGatepassNumber ?? "",
    "Exit Date/Time": fmt(x.exitDateTime)
  };
}

router.get("/summary", async (_req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [equipment, inside, activeJobs, completedToday, overdue, totalJobs] = await Promise.all([
      Equipment.countDocuments(),
      Inward.countDocuments({ exited: false }),
      Job.countDocuments({ status: { $in: ["In Progress", "Waiting for Parts", "Awaiting Job Card"] } }),
      Job.countDocuments({ status: "Completed", jobCompletedDateTime: { $gte: todayStart } }),
      Job.countDocuments({ status: { $nin: ["Completed", "Exited"] }, expectedOutDate: { $exists: true, $ne: null, $lt: new Date() } }),
      Job.countDocuments()
    ]);
    res.json({ equipment, inside, activeJobs, completedToday, overdue, totalJobs });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const filter = jobFilter(req.query);
    const rows = await Job.find(filter).sort({ inDateTime: -1 }).lean();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/export.xlsx", async (req, res, next) => {
  try {
    const kind = req.query.kind || "inside";
    let rows = [];

    if (kind === "equipment") {
      const equipFilter = req.query.q ? {
        $or: [
          { technicalObjectNumber: { $regex: escapeRegex(req.query.q), $options: "i" } },
          { vehicleNumber: { $regex: escapeRegex(req.query.q), $options: "i" } }
        ]
      } : {};
      const records = await Equipment.find(equipFilter).sort({ technicalObjectNumber: 1 }).lean();
      rows = records.map(x => ({
        "Technical Object": x.technicalObjectNumber ?? "",
        "Vehicle Number": x.vehicleNumber ?? "",
        "Equipment Type": x.equipmentType ?? "",
        "Make": x.make ?? "",
        "Model": x.model ?? "",
        "Status": x.status ?? ""
      }));
    } else if (kind === "inward") {
      const inwardFilter = { ...dateBounds(req.query, "inDateTime") };
      if (req.query.q) {
        const q = escapeRegex(req.query.q);
        inwardFilter.$or = [
          { technicalObjectNumber: { $regex: q, $options: "i" } },
          { vehicleNumber: { $regex: q, $options: "i" } },
          { gatepassNumber: { $regex: q, $options: "i" } }
        ];
      }
      const records = await Inward.find(inwardFilter).sort({ inDateTime: -1 }).lean();
      rows = records.map(x => ({
        "Job Card": "",
        "Technical Object": x.technicalObjectNumber ?? "",
        "Vehicle Number": x.vehicleNumber ?? "",
        "Equipment Type": x.equipmentType ?? "",
        "Make": x.make ?? "",
        "Model": x.model ?? "",
        "Inward Date/Time": fmt(x.inDateTime),
        "Inward Gatepass": x.gatepassNumber ?? "",
        "Expected Outdate": "",
        "Problems": x.complaint ?? "",
        "Action Taken": "",
        "Parts Required": "",
        "Parts Changed": "",
        "MO Number": "",
        "MO Date": "",
        "STPO Number": "",
        "STPO Date": "",
        "Parts / PR / PO Details": "",
        "Parts Lots": "",
        "Mechanic(s)": "",
        "SAP Order": "",
        "Status": x.exited ? "Exited" : "Inside Yard",
        "Completed Date/Time": "",
        "Completed By": "",
        "Exit Gatepass": "",
        "Exit Date/Time": ""
      }));
    } else {
      const filter = jobFilter(req.query);
      const records = await Job.find(filter).sort({ inDateTime: -1 }).lean();
      rows = records.map(mapJobToRow);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Yard Maintenance Management";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Yard MIS", { views: [{ state: "frozen", ySplit: 1 }] });

    const columns = rows.length
      ? Object.keys(rows[0]).map(key => ({
          header: key,
          key,
          width:
            key === "Parts Lots" || key === "Parts / PR / PO Details"
              ? 60
              : Math.min(28, Math.max(14, key.length + 2))
        }))
      : [{ header: "Message", key: "message", width: 48 }];

    sheet.columns = columns;

    if (!rows.length) {
      sheet.addRow({ message: "No records match the selected filters." });
    } else {
      rows.forEach(r => sheet.addRow(r));
    }

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12345A" } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F6FA" } };
      }
      row.alignment = { vertical: "top", wrapText: true };
    });

    const sanitizedKind = encodeURIComponent(kind);
    const filename = `yard-${sanitizedKind}-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;