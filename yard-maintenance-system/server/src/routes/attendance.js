import { Router } from "express";
import { AttendanceEmployee, AttendanceMonth } from "../models/Attendance.js";
import ExcelJS from "exceljs";

const router = Router();

const VALID = new Set(["P", "A", "H", "OFF", ""]);
const clean = (v) => String(v ?? "").trim();
const validMonth = (m) => /^\d{4}-\d{2}$/.test(String(m || ""));

const asPlainDays = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value.toObject === "function") return value.toObject();
  return { ...value };
};

const getMonthDayKeys = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(year, monthNumber, 0).getDate();

  return Array.from({ length: count }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`
  );
};

const attendanceCounts = (days = {}) => {
  const values = Object.values(days);

  return {
    present: values.filter(v => v === "P").length,
    half: values.filter(v => v === "H").length,
    absent: values.filter(v => v === "A").length,
    off: values.filter(v => v === "OFF").length,
    total: values.filter(v => ["P", "H", "A", "OFF"].includes(v)).length,
  };
};

// Original employee list from OCT-26 workbook.
const INITIAL_EMPLOYEES = [
  ["AP00240", "Subasis Sur"],
  ["TS06599", "Vishal Roy"],
  ["AP00090", "Mukesh Yadav"],
  ["AP00110", "Md. Irsad"],
  ["AP00282", "Firoj Khan (Mech)"],
  ["AP00076", "Utku Sagar"],
  ["AP00047", "Badan Das"],
  ["AP00216", "Pappu Mistry"],
  ["AP00193", "Santosh Kumar"],
  ["AP00183", "Goutam Namta"],
  ["AP00256", "Bhaskar Patnaik"],
  ["AP00197", "Bharat Bhusan"],
  ["", "Rahul Singh Munda"],
  ["AP00249", "Paresh Mardi"],
  ["", "Md. Shyam Khan"],
  ["AP00009", "Durga Charan Munda"],
  ["AP00244", "Gopi Kumar"],
  ["AP00215", "Firoj Khan (Dental)"],
  ["AP00288", "Murteja Saich"],
  ["AP00194", "Ratmuni Hembram"],
  ["AP00281", "Rachna Soy"],
  ["AP00280", "Narayan Goup"],
  ["AP00302", "Rohit Munda"],
  ["AP00248", "Mongal Kolburto"],
  ["AP00293", "Paresh Chandra Das"],
  ["AP00295", "Faizan Khan"],
  ["AP00294", "Saim Kaji"],
  ["AP00297", "Ujjal Mahato"],
  ["AP00299", "Indrajit Das"],
  ["", "Pradeep Pathak"],
  //["GM00463", "Sunil Berua"],
  ["JMD00033", "Chandrashekhar Kr."],
  ["", "Sahil Singh"],
  ["", "Rajesh Kr. Patnayak"],
  ["JMD00035", "Jaydev Namata"],
  ["GM00347", "Manish Kumar"],
  ["AP00225", "Sukhdayal Singh"],
  ["JMD00024", "Badal Pradhan"],
  ["JMD00025", "Gurdeep Singh"],
  ["JMD00026", "Motilal Munda"],
  ["TS06007", "Sudhir Sharma"],
  ["JMD00027", "Md Noor Hasan"],
  ["JMD00003", "Kameshwar Singh"],
  ["TS06598", "Raj Thakur"],
  ["JMD00001", "Pradeep Kumar Mondal"],
  ["", "Md Istiak Khan"],
  ["", "Rajendra Singh"],
  ["", "Pritam Singh"],
  ["GM00478", "Doctar Mahato"],
  ["", "Jeevan Mukharjee"],
  ["", "Govind Parsad Yadav"],
  ["", "Dukhhiya Hemrom"],
].map(([employeeCode, employeeName], index) => ({
  employeeCode,
  employeeName,
  designation: "",
  active: true,
  sortOrder: index + 1,
}));

export async function ensureRoster() {
  const count = await AttendanceEmployee.countDocuments();

  if (!count) {
    await AttendanceEmployee.insertMany(INITIAL_EMPLOYEES);
  }
}

// GET EMPLOYEE LIST
router.get("/employees", async (_req, res) => {
  try {
    await ensureRoster();

    const employees = await AttendanceEmployee.find({ active: true })
      .sort({ sortOrder: 1, employeeName: 1 })
      .lean();

    res.json(employees);
  } catch (error) {
    console.error("ATTENDANCE EMPLOYEE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ADD NEW EMPLOYEE
router.post("/employees", async (req, res) => {
  try {
    await ensureRoster();

    const employeeName = clean(req.body?.employeeName);
    const employeeCode = clean(req.body?.employeeCode);
    const designation = clean(req.body?.designation);

    if (!employeeName) {
      return res.status(400).json({
        message: "Employee name is required.",
      });
    }

    if (employeeCode) {
      const duplicate = await AttendanceEmployee.findOne({
        employeeCode,
        active: true,
      });

      if (duplicate) {
        return res.status(409).json({
          message: "This punching code is already assigned.",
        });
      }
    }

    const lastEmployee = await AttendanceEmployee.findOne()
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();

    const employee = await AttendanceEmployee.create({
      employeeName,
      employeeCode,
      designation,
      active: true,
      sortOrder: (lastEmployee?.sortOrder || 0) + 1,
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("ADD EMPLOYEE ERROR:", error);
    res.status(400).json({
      message: error.message || "Unable to add employee.",
    });
  }
});

// EDIT EMPLOYEE / PUNCHING CODE
router.patch("/employees/:id", async (req, res) => {
  try {
    const updates = {};

    if (req.body?.employeeCode !== undefined) {
      const code = clean(req.body.employeeCode);

      if (code) {
        const duplicate = await AttendanceEmployee.findOne({
          employeeCode: code,
          active: true,
          _id: { $ne: req.params.id },
        });

        if (duplicate) {
          return res.status(409).json({
            message: "This punching code is already assigned.",
          });
        }
      }

      updates.employeeCode = code;
    }

    if (req.body?.employeeName !== undefined) {
      updates.employeeName = clean(req.body.employeeName);
    }

    if (req.body?.designation !== undefined) {
      updates.designation = clean(req.body.designation);
    }

    const employee = await AttendanceEmployee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.json(employee);
  } catch (error) {
    console.error("UPDATE EMPLOYEE ERROR:", error);
    res.status(400).json({ message: error.message });
  }
});

// EXPORT MONTHLY ATTENDANCE TO EXCEL
router.get("/:month/export", async (req, res) => {
  try {
    const { month } = req.params;

    if (!validMonth(month)) {
      return res.status(400).json({
        message: "Month must be YYYY-MM.",
      });
    }

    await ensureRoster();

    const [employees, monthDoc] = await Promise.all([
      AttendanceEmployee.find({ active: true })
        .sort({ sortOrder: 1, employeeName: 1 })
        .lean(),
      AttendanceMonth.findOne({ month }).lean(),
    ]);

    const saved = new Map(
      (monthDoc?.entries || []).map(entry => [
        String(entry.employee),
        asPlainDays(entry.days),
      ])
    );

    const dayKeys = getMonthDayKeys(month);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Yard Maintenance System";

    const sheet = workbook.addWorksheet(month, {
      views: [{ state: "frozen", ySplit: 1, xSplit: 4 }],
    });

    sheet.addRow([
      "SL NO",
      "PUNCHING CODE",
      "EMPLOYEE NAME",
      "DESIGNATION",
      ...dayKeys.map((_, index) => String(index + 1)),
      "DAYS",
      "HALF DAY",
      "ABSENT",
      "OFF",
      "TOTAL",
    ]);

    employees.forEach((employee, index) => {
      const days = saved.get(String(employee._id)) || {};
      const counts = attendanceCounts(days);

      sheet.addRow([
        index + 1,
        employee.employeeCode || "",
        employee.employeeName,
        employee.designation || "",
        ...dayKeys.map(key => days[key] || ""),
        counts.present,
        counts.half,
        counts.absent,
        counts.off,
        counts.total,
      ]);
    });

    const header = sheet.getRow(1);
    header.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17365D" },
    };
    header.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    header.height = 24;

    sheet.columns.forEach((column, index) => {
      column.width =
        index === 2 ? 28 :
        index === 1 ? 18 :
        index === 3 ? 18 : 10;
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: "middle",
          horizontal: "center",
        };

        row.getCell(3).alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Attendance_${month}.xlsx"`
    );

    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("ATTENDANCE EXPORT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// LOAD MONTHLY ATTENDANCE
router.get("/:month", async (req, res) => {
  try {
    const { month } = req.params;

    if (!validMonth(month)) {
      return res.status(400).json({
        message: "Month must be YYYY-MM.",
      });
    }

    await ensureRoster();

    const [employees, monthDoc] = await Promise.all([
      AttendanceEmployee.find({ active: true })
        .sort({ sortOrder: 1, employeeName: 1 })
        .lean(),
      AttendanceMonth.findOne({ month }).lean(),
    ]);

    const saved = new Map(
      (monthDoc?.entries || []).map(entry => [
        String(entry.employee),
        asPlainDays(entry.days),
      ])
    );

    res.json({
      month,
      employees: employees.map(employee => ({
        ...employee,
        days: saved.get(String(employee._id)) || {},
      })),
    });
  } catch (error) {
    console.error("ATTENDANCE LOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// SAVE MONTHLY ATTENDANCE
router.put("/:month", async (req, res) => {
  try {
    const { month } = req.params;

    if (!validMonth(month)) {
      return res.status(400).json({
        message: "Month must be YYYY-MM.",
      });
    }

    const entries = Array.isArray(req.body?.entries)
      ? req.body.entries
      : [];

    const normalized = entries.map(row => {
      const days = {};

      for (const [date, status] of Object.entries(row.days || {})) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !VALID.has(status) ||
          date.slice(0, 7) !== month
        ) {
          throw new Error("Invalid attendance date or status.");
        }

        days[date] = status;
      }

      return {
        employee: row.employee,
        days,
      };
    });

    const doc = await AttendanceMonth.findOneAndUpdate(
      { month },
      { $set: { entries: normalized } },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      month: doc.month,
      message: "Attendance saved successfully.",
    });
  } catch (error) {
    console.error("ATTENDANCE SAVE ERROR:", error);
    res.status(400).json({ message: error.message });
  }
});

export default router;