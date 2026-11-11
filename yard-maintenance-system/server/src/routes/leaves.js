import { Router } from "express";
import ExcelJS from "exceljs";
import mongoose from "mongoose";
import { Leave } from "../models/Leave.js";
import { AttendanceEmployee } from "../models/Attendance.js";
import { ensureRoster } from "./attendance.js";

const router = Router();
const clean = value => String(value ?? "").trim();
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T00:00:00`));

// Use the same employee roster as Attendance without requiring Attendance menu access.
router.get("/employees", async (_req, res) => {
  await ensureRoster();
  const employees = await AttendanceEmployee.find({ active: true })
    .sort({ sortOrder: 1, employeeName: 1 }).lean();
  res.json(employees);
});

router.get("/", async (req, res) => {
  const { from = "", to = "", q = "" } = req.query;
  const filter = {};
  if (from || to) {
    filter.fromDate = { ...(from ? { $lte: to || "9999-12-31" } : {}), ...(to ? {} : {}) };
    filter.toDate = { $gte: from || "0000-01-01" };
    if (to) filter.fromDate.$lte = to;
  }
  if (q) filter.$or = [
    { employeeName: { $regex: String(q), $options: "i" } },
    { employeeCode: { $regex: String(q), $options: "i" } },
    { department: { $regex: String(q), $options: "i" } },
  ];
  const records = await Leave.find(filter).sort({ fromDate: -1, employeeName: 1 }).lean();
  res.json({ records });
});

router.get("/absent", async (req, res) => {
  const date = clean(req.query.date);
  if (!validDate(date)) return res.status(400).json({ message: "A valid date (YYYY-MM-DD) is required." });
  const records = await Leave.find({ fromDate: { $lte: date }, toDate: { $gte: date } }).sort({ employeeName: 1 }).lean();
  res.json({ date, records });
});

router.post("/", async (req, res) => {
  const employeeId = clean(req.body?.employee);
  const fromDate = clean(req.body?.fromDate);
  const toDate = clean(req.body?.toDate);
  if (!mongoose.isValidObjectId(employeeId)) return res.status(400).json({ message: "Select a valid employee." });
  if (!validDate(fromDate) || !validDate(toDate) || toDate < fromDate) return res.status(400).json({ message: "Enter valid leave dates. To Date cannot be before From Date." });
  const employee = await AttendanceEmployee.findOne({ _id: employeeId, active: true }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found or inactive." });
  const overlap = await Leave.findOne({ employee: employeeId, fromDate: { $lte: toDate }, toDate: { $gte: fromDate } });
  if (overlap) return res.status(409).json({ message: `Leave overlaps an existing approved leave (${overlap.fromDate} to ${overlap.toDate}).` });
  const record = await Leave.create({
    employee: employee._id, employeeCode: employee.employeeCode, employeeName: employee.employeeName,
    designation: employee.designation, department: clean(req.body?.department),
    leaveType: clean(req.body?.leaveType) || "Casual Leave", fromDate, toDate,
    reason: clean(req.body?.reason), approvedBy: clean(req.body?.approvedBy), remarks: clean(req.body?.remarks), status: "Approved"
  });
  res.status(201).json({ record });
});

router.patch("/:id", async (req, res) => {
  const record = await Leave.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Leave record not found." });
  const fromDate = clean(req.body?.fromDate ?? record.fromDate);
  const toDate = clean(req.body?.toDate ?? record.toDate);
  if (!validDate(fromDate) || !validDate(toDate) || toDate < fromDate) return res.status(400).json({ message: "Enter valid leave dates." });
  const overlap = await Leave.findOne({ _id: { $ne: record._id }, employee: record.employee, fromDate: { $lte: toDate }, toDate: { $gte: fromDate } });
  if (overlap) return res.status(409).json({ message: `Leave overlaps an existing approved leave (${overlap.fromDate} to ${overlap.toDate}).` });
  for (const key of ["fromDate", "toDate", "leaveType", "department", "reason", "approvedBy", "remarks"]) {
    if (req.body?.[key] !== undefined) record[key] = clean(req.body[key]);
  }
  await record.save();
  res.json({ record });
});

router.delete("/:id", async (req, res) => {
  const record = await Leave.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ message: "Leave record not found." });
  res.json({ success: true });
});

router.get("/export.xlsx", async (req, res) => {
  const { from = "", to = "" } = req.query;
  const filter = {};
  if (from || to) {
    filter.fromDate = { $lte: to || "9999-12-31" };
    filter.toDate = { $gte: from || "0000-01-01" };
  }
  const records = await Leave.find(filter).sort({ fromDate: 1, employeeName: 1 }).lean();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Yard Maintenance System";
  const sheet = workbook.addWorksheet("Approved Leaves");
  sheet.columns = [
    { header: "SL NO", key: "sl", width: 9 }, { header: "EMPLOYEE ID", key: "code", width: 16 },
    { header: "EMPLOYEE NAME", key: "name", width: 26 }, { header: "DESIGNATION", key: "designation", width: 20 },
    { header: "DEPARTMENT", key: "department", width: 20 }, { header: "LEAVE TYPE", key: "type", width: 18 },
    { header: "FROM DATE", key: "from", width: 15 }, { header: "TO DATE", key: "to", width: 15 },
    { header: "TOTAL DAYS", key: "days", width: 13 }, { header: "REASON", key: "reason", width: 30 },
    { header: "APPROVED BY", key: "approvedBy", width: 20 }, { header: "STATUS", key: "status", width: 14 },
    { header: "REMARKS", key: "remarks", width: 28 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF062B5B" } };
  records.forEach((r, i) => {
    const days = Math.round((new Date(`${r.toDate}T00:00:00`) - new Date(`${r.fromDate}T00:00:00`)) / 86400000) + 1;
    sheet.addRow({ sl: i + 1, code: r.employeeCode, name: r.employeeName, designation: r.designation, department: r.department, type: r.leaveType, from: r.fromDate, to: r.toDate, days, reason: r.reason, approvedBy: r.approvedBy, status: r.status, remarks: r.remarks });
  });
  sheet.autoFilter = { from: "A1", to: "M1" };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Approved_Leave_Register.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
