import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Download, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import api from "../api";
import "./LeaveManagement.css";

const today = () => new Date().toLocaleDateString("en-CA");
const EMPTY = { employee: "", leaveType: "Casual Leave", fromDate: today(), toDate: today(), department: "", reason: "", approvedBy: "", remarks: "" };
const messageOf = e => e.response?.data?.message || e.message || "Something went wrong.";
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1;
const fmt = d => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function LeaveManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [absent, setAbsent] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [absentDate, setAbsentDate] = useState(today());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [empRes, leaveRes, absentRes] = await Promise.all([
        api.get("/api/leaves/employees"),
        api.get("/api/leaves", { params: { from, to, q: query } }),
        api.get("/api/leaves/absent", { params: { date: absentDate } }),
      ]);
      setEmployees(empRes.data || []);
      setRecords(leaveRes.data.records || []);
      setAbsent(absentRes.data.records || []);
    } catch (e) { setError(messageOf(e)); }
    finally { setLoading(false); }
  }, [from, to, query, absentDate]);

  useEffect(() => { load(); }, [load]);
  const selectedEmployee = useMemo(() => employees.find(e => e._id === form.employee), [employees, form.employee]);
  const totalDays = form.fromDate && form.toDate && form.toDate >= form.fromDate ? daysBetween(form.fromDate, form.toDate) : 0;
  const activeToday = absentDate === today();

  const startEdit = record => {
    setEditing(record._id);
    setForm({ employee: record.employee, leaveType: record.leaveType, fromDate: record.fromDate, toDate: record.toDate, department: record.department || "", reason: record.reason || "", approvedBy: record.approvedBy || "", remarks: record.remarks || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setEditing(null); setForm({ ...EMPTY, fromDate: today(), toDate: today() }); };

  async function save(e) {
    e.preventDefault();
    if (!editing && !form.employee) return setError("Please select an employee.");
    if (form.toDate < form.fromDate) return setError("To Date cannot be before From Date.");
    setBusy(true); setError(""); setNotice("");
    try {
      if (editing) {
        const { employee, ...updates } = form;
        const r = await api.patch(`/api/leaves/${editing}`, updates);
        setRecords(old => old.map(x => x._id === editing ? r.data.record : x));
        setNotice("Approved leave updated successfully.");
      } else {
        const r = await api.post("/api/leaves", form);
        setRecords(old => [r.data.record, ...old]);
        setNotice("Approved leave added successfully.");
      }
      reset(); await load();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }

  async function remove(record) {
    if (!window.confirm(`Delete approved leave for ${record.employeeName} (${fmt(record.fromDate)} to ${fmt(record.toDate)})?`)) return;
    try { await api.delete(`/api/leaves/${record._id}`); setNotice("Leave record deleted."); await load(); }
    catch (e) { setError(messageOf(e)); }
  }

  async function exportExcel() {
    try {
      const response = await api.get("/api/leaves/export.xlsx", { params: { from, to }, responseType: "blob" });
      const url = URL.createObjectURL(response.data); const a = document.createElement("a");
      a.href = url; a.download = "Approved_Leave_Register.xlsx"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(`Excel export failed. ${messageOf(e)}`); }
  }

  return <div className="leave-page">
    <div className="leave-intro"><div><span className="leave-eyebrow">PEOPLE & ATTENDANCE</span><h2><CalendarCheck size={22}/> Leave Management</h2><p>Register approved employee leaves and check who is away on any date.</p></div><button className="btn secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="leave-alert error">{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
    {notice && <div className="leave-alert success">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}

    <div className="leave-stats">
      <div className="leave-stat"><span>Employees on leave {activeToday ? "today" : "on selected date"}</span><strong>{absent.length}</strong><small>{fmt(absentDate)}</small></div>
      <div className="leave-stat"><span>Approved leave records</span><strong>{records.length}</strong><small>Based on current filters</small></div>
      <div className="leave-stat"><span>Active employees</span><strong>{employees.length}</strong><small>From Attendance employee list</small></div>
    </div>

    <section className="leave-card">
      <div className="leave-card-head"><div><h3>{editing ? "Edit Approved Leave" : "Add Approved Leave"}</h3><p>Employee details are selected from your existing Attendance roster.</p></div>{editing && <button className="btn secondary" onClick={reset}><X size={15}/> Cancel edit</button>}</div>
      <form className="leave-form" onSubmit={save}>
        <label className="leave-field"><span>Employee *</span><select value={form.employee} disabled={Boolean(editing)} required onChange={e => setForm({ ...form, employee: e.target.value })}><option value="">Select employee</option>{employees.map(emp => <option key={emp._id} value={emp._id}>{emp.employeeName}{emp.employeeCode ? ` — ${emp.employeeCode}` : ""}</option>)}</select></label>
        <label className="leave-field"><span>Leave Type</span><select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}>{["Casual Leave", "Sick Leave", "Earned Leave", "Other"].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="leave-field"><span>From Date *</span><input type="date" required value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })}/></label>
        <label className="leave-field"><span>To Date *</span><input type="date" min={form.fromDate} required value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })}/></label>
        <label className="leave-field"><span>Total Days</span><input readOnly value={totalDays || 0}/></label>
        <label className="leave-field"><span>Department</span><input value={form.department} placeholder="Enter department" onChange={e => setForm({ ...form, department: e.target.value })}/></label>
        <label className="leave-field"><span>Approved By</span><input value={form.approvedBy} placeholder="Approver name" onChange={e => setForm({ ...form, approvedBy: e.target.value })}/></label>
        <label className="leave-field"><span>Reason</span><input value={form.reason} placeholder="Reason for leave" onChange={e => setForm({ ...form, reason: e.target.value })}/></label>
        <label className="leave-field leave-wide"><span>Remarks</span><textarea rows="2" value={form.remarks} placeholder="Additional remarks" onChange={e => setForm({ ...form, remarks: e.target.value })}/></label>
        <div className="leave-form-actions"><span className="leave-approved-label">Status: Approved</span><button className="btn primary" disabled={busy}>{busy ? "Saving..." : <><Plus size={16}/>{editing ? "Update Leave" : "Save Approved Leave"}</>}</button></div>
      </form>
    </section>

    <section className="leave-card">
      <div className="leave-card-head"><div><h3>Absent Employees</h3><p>Employees whose approved leave includes the selected date.</p></div><label className="leave-date-filter"><span>Check date</span><input type="date" value={absentDate} onChange={e => setAbsentDate(e.target.value)}/></label></div>
      {absent.length ? <div className="leave-table-wrap"><table className="leave-table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Leave Type</th><th>Leave Period</th><th>Reason</th><th>Approved By</th></tr></thead><tbody>{absent.map(r => <tr key={r._id}><td><b>{r.employeeName}</b><small>{r.designation || "—"}</small></td><td>{r.employeeCode || "—"}</td><td>{r.leaveType}</td><td>{fmt(r.fromDate)} – {fmt(r.toDate)}</td><td>{r.reason || "—"}</td><td>{r.approvedBy || "—"}</td></tr>)}</tbody></table></div> : <div className="leave-empty">No approved leaves found for {fmt(absentDate)}.</div>}
    </section>

    <section className="leave-card">
      <div className="leave-card-head"><div><h3>Approved Leave Register</h3><p>Search, filter, edit and export leave records.</p></div><button className="btn primary" onClick={exportExcel}><Download size={16}/> Download Excel</button></div>
      <div className="leave-toolbar"><label className="leave-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search employee, ID or department"/></label><label className="leave-date-filter"><span>From</span><input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label className="leave-date-filter"><span>To</span><input type="date" value={to} onChange={e => setTo(e.target.value)}/></label><button className="btn secondary" onClick={() => { setFrom(""); setTo(""); setQuery(""); }}>Clear filters</button></div>
      {loading ? <div className="leave-empty">Loading leave records...</div> : records.length ? <div className="leave-table-wrap"><table className="leave-table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map(r => <tr key={r._id}><td><b>{r.employeeName}</b><small>{r.designation || "—"}</small></td><td>{r.employeeCode || "—"}</td><td>{r.department || "—"}</td><td>{r.leaveType}</td><td>{fmt(r.fromDate)}</td><td>{fmt(r.toDate)}</td><td>{daysBetween(r.fromDate, r.toDate)}</td><td><span className="leave-status">Approved</span></td><td><div className="leave-actions"><button title="Edit" onClick={() => startEdit(r)}><Edit3 size={15}/></button><button title="Delete" onClick={() => remove(r)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : <div className="leave-empty">No approved leave records match your filters.</div>}
    </section>
  </div>;
}
