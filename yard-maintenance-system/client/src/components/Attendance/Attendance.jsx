import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Save,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import "./Attendance.css";

const STATUSES = ["", "P", "A", "H", "OFF"];

const STATUS_LABEL = {
  "": "Not marked",
  P: "Present",
  A: "Absent",
  H: "Half Day",
  OFF: "Weekly off / holiday",
};

function getMonthDays(month) {
  const [year, mm] = month.split("-").map(Number);

  return Array.from(
    { length: new Date(year, mm, 0).getDate() },
    (_, i) => {
      const day = i + 1;
      const date = new Date(year, mm - 1, day);

      return {
        key: `${month}-${String(day).padStart(2, "0")}`,
        day,
        weekday: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
      };
    }
  );
}

function totals(days = {}) {
  const values = Object.values(days);

  return {
    present: values.filter(v => v === "P").length,
    half: values.filter(v => v === "H").length,
    absent: values.filter(v => v === "A").length,
    off: values.filter(v => v === "OFF").length,
    total: values.filter(v => ["P", "H", "A", "OFF"].includes(v)).length,
  };
}

export default function Attendance() {
  const [month, setMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    employeeName: "",
    employeeCode: "",
  });

  const days = useMemo(() => getMonthDays(month), [month]);

  // LOAD ATTENDANCE
  const load = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.get(
        `/api/attendance/${month}`
      );

      setEmployees(data.employees || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Unable to load attendance. Check the server connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  // UPDATE EMPLOYEE IN SCREEN
  const updateEmployee = (id, patch) => {
    setEmployees(old =>
      old.map(emp =>
        emp._id === id ? { ...emp, ...patch } : emp
      )
    );
  };

  // UPDATE DAILY ATTENDANCE
  const updateStatus = (id, date, status) => {
    setEmployees(old =>
      old.map(emp =>
        emp._id === id
          ? {
              ...emp,
              days: {
                ...(emp.days || {}),
                [date]: status,
              },
            }
          : emp
      )
    );
  };

  // ADD NEW EMPLOYEE
  const addEmployee = async (e) => {
    e.preventDefault();

    const employeeName = newEmployee.employeeName.trim();
    const employeeCode = newEmployee.employeeCode.trim();

    if (!employeeName) {
      setError("Please enter employee name.");
      return;
    }

    setAddingEmployee(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post(
        "/api/attendance/employees",
        {
          employeeName,
          employeeCode,
          designation: "",
        }
      );

      setEmployees(old => [
        ...old,
        {
          ...data,
          days: {},
        },
      ]);

      setNewEmployee({
        employeeName: "",
        employeeCode: "",
      });

      setShowAddEmployee(false);
      setNotice(`${employeeName} added successfully.`);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Unable to add employee."
      );
    } finally {
      setAddingEmployee(false);
    }
  };

  // SAVE EMPLOYEE WEEKLY-OFF ALLOWANCE
  const saveWeeklyOffAllowance = async (emp) => {
    try {
      const { data } = await api.patch(`/api/attendance/employees/${emp._id}`, {
        weeklyOffAllowance: Number(emp.weeklyOffAllowance || 0),
      });
      updateEmployee(emp._id, { weeklyOffAllowance: data.weeklyOffAllowance });
      setNotice(`Weekly-off allowance saved for ${emp.employeeName}.`);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save weekly-off allowance.");
    }
  };

  // SAVE PUNCHING CODE
  const saveCode = async (emp) => {
    try {
      const { data } = await api.patch(
        `/api/attendance/employees/${emp._id}`,
        {
          employeeCode: emp.employeeCode || "",
        }
      );

      updateEmployee(emp._id, {
        employeeCode: data.employeeCode,
      });

      setNotice(
        `Punching code saved for ${emp.employeeName}.`
      );
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Unable to save punching code."
      );
    }
  };

  // SAVE MONTHLY ATTENDANCE
  const saveAttendance = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.put(`/api/attendance/${month}`, {
        entries: employees.map(emp => ({
          employee: emp._id,
          days: emp.days || {},
        })),
      });

      setNotice("Attendance saved successfully.");
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  // EXPORT COMPLETE EXCEL
  const exportExcel = async () => {
    setExporting(true);
    setError("");

    try {
      // Save current screen values before export.
      await api.put(`/api/attendance/${month}`, {
        entries: employees.map(emp => ({
          employee: emp._id,
          days: emp.days || {},
        })),
      });

      const response = await api.get(
        `/api/attendance/${month}/export`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `Attendance_${month}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setNotice("Attendance Excel exported successfully.");
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Unable to export attendance."
      );
    } finally {
      setExporting(false);
    }
  };

  const filtered = employees.filter(emp =>
    `${emp.employeeName} ${emp.employeeCode || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="attendance-page">

      {/* HEADER */}
      <div className="attendance-heading">
        <div>
          <div className="attendance-eyebrow">
            <CalendarDays size={14} />
            WORKFORCE MANAGEMENT
          </div>

          <h1>Attendance Register</h1>

          <p>
            Monthly attendance · Separate from Maintenance MIS and Reports
          </p>
        </div>

        <div className="attendance-actions">

          <label>
            Month
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
          </label>

          <button
            className="att-btn att-primary"
            onClick={() => {
              setError("");
              setNotice("");
              setShowAddEmployee(true);
            }}
          >
            <UserPlus size={15} />
            Add Employee
          </button>

          <button
            className="att-btn att-light"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            className="att-btn att-primary"
            onClick={saveAttendance}
            disabled={saving || loading}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Attendance"}
          </button>

          <button
            className="att-btn att-export"
            onClick={exportExcel}
            disabled={exporting || loading}
          >
            <Download size={15} />
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* ADD EMPLOYEE FORM */}
      {showAddEmployee && (
        <div className="att-add-employee">
          <div className="att-add-header">
            <div>
              <h3>Add New Employee</h3>
              <p>Enter employee details to add them to the register.</p>
            </div>

            <button
              type="button"
              className="att-close"
              onClick={() => setShowAddEmployee(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={addEmployee}>
            <div className="att-form-grid">

              <label>
                Employee Name *
                <input
                  type="text"
                  required
                  value={newEmployee.employeeName}
                  onChange={e =>
                    setNewEmployee(old => ({
                      ...old,
                      employeeName: e.target.value,
                    }))
                  }
                  placeholder="Enter employee name"
                />
              </label>

              <label>
                Punching Code
                <input
                  type="text"
                  value={newEmployee.employeeCode}
                  onChange={e =>
                    setNewEmployee(old => ({
                      ...old,
                      employeeCode: e.target.value,
                    }))
                  }
                  placeholder="Enter punching code"
                />
              </label>

              <label>
                Designation
                <input
                  type="text"
                  value=""
                  disabled
                  placeholder="Intentionally left blank"
                />
              </label>

            </div>

            <div className="att-form-actions">
              <button
                type="submit"
                className="att-btn att-primary"
                disabled={addingEmployee}
              >
                {addingEmployee ? "Adding Employee..." : "Save Employee"}
              </button>

              <button
                type="button"
                className="att-btn att-light"
                onClick={() => setShowAddEmployee(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH AND LEGEND */}
      <div className="attendance-toolbar">
        <div className="att-search">
          <Search size={16} />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or punching code"
          />
        </div>

        <div className="att-legend">
          <span><b className="legend-p">P</b> Present</span>
          <span><b className="legend-a">A</b> Absent</span>
          <span><b className="legend-h">H</b> Half Day</span>
          <span><b className="legend-off">OFF</b> Weekly off / holiday</span>
        </div>
      </div>

      {/* MESSAGES */}
      {error && (
        <div className="att-message att-error">
          {error}
        </div>
      )}

      {notice && (
        <div className="att-message att-success">
          {notice}
        </div>
      )}

      {/* ATTENDANCE TABLE */}
      {loading ? (
        <div className="att-empty">
          Loading attendance register...
        </div>
      ) : (
        <div className="attendance-table-wrap">
          <table className="attendance-table">

            <thead>
              <tr>
                <th className="sticky-sl">SL</th>
                <th className="sticky-code">
                  Punching Code
                  <small>Editable</small>
                </th>
                <th className="sticky-name">Employee Name</th>
                <th>Designation</th>
                <th>Week Off</th>

                {days.map(d => (
                  <th key={d.key}>
                    {d.day}
                    <small>{d.weekday}</small>
                  </th>
                ))}

                <th>Days</th>
                <th>Half Day</th>
                <th>Absent</th>
                <th>OFF</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((emp, idx) => {
                const t = totals(emp.days);

                return (
                  <tr key={emp._id}>
                    <td className="sticky-sl">{idx + 1}</td>

                    <td className="sticky-code">
                      <input
                        className="att-code-input"
                        value={emp.employeeCode || ""}
                        placeholder="Punch code"
                        onChange={e =>
                          updateEmployee(emp._id, {
                            employeeCode: e.target.value,
                          })
                        }
                        onBlur={() => saveCode(emp)}
                      />
                    </td>

                    <td className="sticky-name att-emp-name">
                      {emp.employeeName}
                    </td>

                    <td></td>
                    <td>
                      <select
                        className="att-allowance-select"
                        aria-label={`${emp.employeeName} weekly-off allowance`}
                        value={emp.weeklyOffAllowance ?? 0}
                        onChange={e => updateEmployee(emp._id, { weeklyOffAllowance: Number(e.target.value) })}
                        onBlur={() => saveWeeklyOffAllowance(emp)}
                      >
                        <option value={0}>0</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </td>

                    {days.map(d => (
                      <td key={d.key}>
                        <select
                          aria-label={`${emp.employeeName} ${d.key}`}
                          title={
                            STATUS_LABEL[
                              emp.days?.[d.key] || ""
                            ]
                          }
                          className={`att-day att-${(
                            emp.days?.[d.key] || "blank"
                          ).toLowerCase()}`}
                          value={emp.days?.[d.key] || ""}
                          onChange={e =>
                            updateStatus(
                              emp._id,
                              d.key,
                              e.target.value
                            )
                          }
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>
                              {s || "—"}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}

                    <td>{t.present}</td>
                    <td>{t.half}</td>
                    <td>{t.absent}</td>
                    <td>{t.off}</td>
                    <td className="att-total">{t.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="att-note">
        Total = Present + Half Day + Absent + OFF. Each marked day counts as one; blank dates are not counted.
        Week Off is each employee’s company-paid monthly allowance (0, 3, or 4); mark actual company weekly-off dates as OFF. Designation is intentionally blank.
      </p>

    </section>
  );
}