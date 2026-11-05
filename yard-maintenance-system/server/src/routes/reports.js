import { Router } from "express";
import ExcelJS from "exceljs";
import { Equipment, Inward, Job } from "../models.js";

const router = Router();

const clean = v => String(v ?? "").trim();

const escapeRegex = s =>
  clean(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Day boundaries are interpreted in India Standard Time, matching /summary,
// so results do not depend on the timezone the server happens to run in.
function dateBounds(query, field) {
  const bounds = {};

  const from = clean(query.from);
  if (DAY.test(from)) {
    const fromDate = new Date(`${from}T00:00:00+05:30`);
    if (!isNaN(fromDate)) bounds.$gte = fromDate;
  }

  const to = clean(query.to);
  if (DAY.test(to)) {
    const toDate = new Date(`${to}T23:59:59.999+05:30`);
    if (!isNaN(toDate)) bounds.$lte = toDate;
  }

  return Object.keys(bounds).length ? { [field]: bounds } : {};
}

function jobFilter(query) {
  const filter = {};
  const kind = clean(query.kind) || "inside";

  // Report type and the Job status dropdown are combined, as they are on screen.
  const statusConditions = [];

  if (kind === "inside") {
    statusConditions.push({ status: { $ne: "Exited" } });
  } else if (kind === "pending") {
    statusConditions.push({
      status: {
        $in: ["Awaiting Job Card", "In Progress", "Waiting for Parts"]
      }
    });
  } else if (kind === "completed") {
    statusConditions.push({ status: { $in: ["Completed", "Exited"] } });
  } else if (kind === "exited") {
    statusConditions.push({ status: "Exited" });
  }

  const wantedStatus = clean(query.status);
  if (wantedStatus && wantedStatus !== "all") {
    statusConditions.push({ status: wantedStatus });
  }

  if (statusConditions.length) filter.$and = statusConditions;

  // clean() keeps query-string objects such as type[$ne]=x out of the Mongo filter.
  const type = clean(query.type);
  if (type && type !== "all") {
    filter.equipmentType = type;
  }

  const search = clean(query.q);
  if (search) {
    const q = escapeRegex(search);

    filter.$or = [
      "jobCardNumber",
      "technicalObjectNumber",
      "vehicleNumber",
      "inwardGatepassNumber",
      "exitGatepassNumber",
      "sapMaintenanceOrderNumber",
      "maintenanceOrderNumber",
      "mrNumber",
      "stpoNumber",
      "mechanicNames",
      "completedByMechanic",
      "problems",
      "actionTaken",
      "partsRequired",
      "partsChanged",
      "finalRemarks",
      "partsLots.lotName",
      "partsLots.prNumber",
      "partsLots.poNumber",
      "partsLots.parts.materialCode",
      "partsLots.parts.partName",
      "partsLots.parts.shortText"
    ].map(k => ({
      [k]: { $regex: q, $options: "i" }
    }));
  }

  Object.assign(
    filter,
    dateBounds(
      query,
      query.dateField === "createdAt" ? "createdAt" : "inDateTime"
    )
  );

  return filter;
}

// Dates are written in India Standard Time (not UTC) so the Excel file matches the app.
const istFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

const fmt = d => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";

  const p = Object.fromEntries(
    istFormat.formatToParts(date).map(part => [part.type, part.value])
  );

  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

function mapJobToRow(x) {
  const partsDetails = (x.partsLots || []).flatMap((lot, lotIndex) =>
    (lot.parts || []).map((part, partIndex) =>
      [
        `Lot ${lotIndex + 1} / Part ${partIndex + 1}: ${
          part.partName || part.shortText || ""
        }`,
        `Material: ${part.materialCode || ""}`,
        `PR: ${lot.prNumber || ""}`,
        `PR Date: ${fmt(lot.prDate)}`,
        `Qty Requested: ${part.quantityRequested ?? 0}`,
        `PO: ${lot.poNumber || ""}`,
        `PO Date: ${fmt(lot.poDate)}`,
        `Qty Ordered: ${part.quantityOrdered ?? 0}`
      ].join(" | ")
    )
  );

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
    "MR Number": x.mrNumber || "",
    "MR Date": fmt(x.mrDate),
    "STPO Number": x.stpoNumber || "",
    "STPO Date": fmt(x.stpoDate),

    "Parts / PR / PO Details": partsDetails.join("\n"),

    "Parts Lots": (x.partsLots || [])
      .map((lot, lotIndex) => {
        const partDetails = (lot.parts || [])
          .map((part, partIndex) =>
            [
              `Part ${partIndex + 1}: ${
                part.partName || part.shortText || ""
              }`,
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
    "Final Remarks": x.finalRemarks ?? "",
    "Exit Gatepass": x.exitGatepassNumber ?? "",
    "Exit Date/Time": fmt(x.exitDateTime)
  };
}

router.get("/summary", async (_req, res, next) => {
  try {
    // Calculate today's boundaries using India Standard Time.
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    });

    const todayStart = new Date(`${today}T00:00:00+05:30`);
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    const now = new Date();

    const [
      equipment,
      inside,
      activeJobs,
      completedToday,
      overdue,
      totalJobs
    ] = await Promise.all([
      Equipment.countDocuments(),

      Inward.countDocuments({
        exited: false
      }),

      Job.countDocuments({
        status: {
          $in: [
            "In Progress",
            "Waiting for Parts",
            "Awaiting Job Card"
          ]
        }
      }),

      // Completed today, including jobs that have since exited.
      Job.countDocuments({
        status: {
          $in: ["Completed", "Exited"]
        },
        jobCompletedDateTime: {
          $gte: todayStart,
          $lt: tomorrowStart
        }
      }),

      // Jobs whose expected completion date has passed.
      Job.countDocuments({
        status: {
          $nin: ["Completed", "Exited"]
        },
        expectedOutDate: {
          $exists: true,
          $ne: null,
          $lt: now
        }
      }),

      Job.countDocuments()
    ]);

    res.json({
      equipment,
      inside,
      activeJobs,
      completedToday,
      overdue,
      totalJobs
    });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const filter = jobFilter(req.query);
    const rows = await Job.find(filter)
      .sort({ inDateTime: -1 })
      .lean();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/export.xlsx", async (req, res, next) => {
  try {
    const kind = clean(req.query.kind) || "inside";
    const search = clean(req.query.q);
    let rows = [];

    if (kind === "equipment") {
      let equipFilter = {};

      if (search) {
        const rx = { $regex: escapeRegex(search), $options: "i" };

        equipFilter = {
          $or: [
            { technicalObjectNumber: rx },
            { vehicleNumber: rx },
            { equipmentName: rx },
            { equipmentType: rx },
            { make: rx },
            { model: rx }
          ]
        };
      }

      const [records, activeEquipmentIds] = await Promise.all([
        Equipment.find(equipFilter)
          .sort({ technicalObjectNumber: 1 })
          .lean(),
        Job.distinct("equipment", { status: { $ne: "Exited" } })
      ]);

      // Equipment has no status field of its own; it is inside the yard
      // while any of its jobs has not exited.
      const insideIds = new Set(activeEquipmentIds.map(String));

      rows = records.map(x => ({
        "Technical Object": x.technicalObjectNumber ?? "",
        "Vehicle Number": x.vehicleNumber ?? "",
        "Equipment Type": x.equipmentType ?? "",
        "Make": x.make ?? "",
        "Model": x.model ?? "",
        "Status": insideIds.has(String(x._id)) ? "Inside Yard" : "Not in Yard"
      }));
    } else if (kind === "inward") {
      const inwardFilter = {
        ...dateBounds(req.query, "inDateTime")
      };

      if (search) {
        const q = escapeRegex(search);

        inwardFilter.$or = [
          { technicalObjectNumber: { $regex: q, $options: "i" } },
          { vehicleNumber: { $regex: q, $options: "i" } },
          { gatepassNumber: { $regex: q, $options: "i" } }
        ];
      }

      const records = await Inward.find(inwardFilter)
        .sort({ inDateTime: -1 })
        .lean();

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
        "MR Number": "",
        "MR Date": "",
        "STPO Number": "",
        "STPO Date": "",
        "Parts / PR / PO Details": "",
        "Parts Lots": "",
        "Mechanic(s)": "",
        "SAP Order": "",
        "Status": x.exited ? "Exited" : "Inside Yard",
        "Completed Date/Time": "",
        "Completed By": "",
        "Final Remarks": "",
        "Exit Gatepass": "",
        "Exit Date/Time": ""
      }));
    } else {
      const filter = jobFilter(req.query);

      const records = await Job.find(filter)
        .sort({ inDateTime: -1 })
        .lean();

      rows = records.map(mapJobToRow);
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Yard Maintenance Management";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Yard MIS", {
      views: [{ state: "frozen", ySplit: 1 }]
    });

    const columns = rows.length
      ? Object.keys(rows[0]).map(key => ({
          header: key,
          key,
          width:
            key === "Parts Lots" ||
            key === "Parts / PR / PO Details"
              ? 60
              : Math.min(28, Math.max(14, key.length + 2))
        }))
      : [
          {
            header: "Message",
            key: "message",
            width: 48
          }
        ];

    sheet.columns = columns;

    if (!rows.length) {
      sheet.addRow({
        message: "No records match the selected filters."
      });
    } else {
      rows.forEach(r => sheet.addRow(r));
    }

    // Header formatting
    sheet.getRow(1).font = {
      bold: true,
      color: { argb: "FFFFFFFF" }
    };

    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF12345A" }
    };

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    // Wrap text and calculate row heights for long content
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F6FA" }
        };
      }

      row.alignment = {
        vertical: "top",
        wrapText: true
      };

      if (rowNumber > 1) {
        let estimatedLines = 1;

        row.eachCell((cell, columnNumber) => {
          const value = String(cell.value ?? "");
          const columnWidth = Number(
            sheet.getColumn(columnNumber).width || 14
          );

          const charsPerLine = Math.max(
            8,
            Math.floor(columnWidth * 0.9)
          );

          const lines = value
            .split("\n")
            .reduce(
              (sum, line) =>
                sum + Math.max(
                  1,
                  Math.ceil(line.length / charsPerLine)
                ),
              0
            );

          estimatedLines = Math.max(
            estimatedLines,
            lines
          );
        });

        row.height = Math.min(
          400,
          Math.max(18, estimatedLines * 15)
        );
      }
    });

    // Keep the filename to safe characters only.
    const safeKind = kind.replace(/[^a-z0-9_-]/gi, "");

    const filename =
      `yard-${safeKind || "report"}-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;