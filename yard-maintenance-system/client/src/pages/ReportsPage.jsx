import React from "react";
import { ArrowDownToLine, FileSpreadsheet, Search } from "lucide-react";
import { STATUSES, TYPES } from "../appConstants";
import { useAppPage } from "../AppPageContext";
import { Field, JobsTable, PanelHeader } from "../components/AppShared";

const REPORT_TYPES = [
  ["inside", "Inside yard"],
  ["inward", "Inward register"],
  ["pending", "Pending jobs"],
  ["completed", "Completed jobs"],
  ["exited", "Exit register"],
  ["all", "Combined MIS"]
];

const REPORT_TITLES = {
  inside: "Vehicles currently inside the yard",
  inward: "Inward register",
  pending: "Pending maintenance jobs",
  completed: "Completed maintenance jobs",
  exited: "Vehicle exit register",
  all: "Combined vehicle and job MIS"
};

export default function ReportsPage() {
  const { report, setReport, reportRows, exportReport, setJobEdit, setCompletion, setExitForm } = useAppPage();

  return (
    <section className="panel">
      <PanelHeader
        title="Reports & MIS"
        subtitle="Filter yard records and export a formatted Excel workbook"
        action={<button className="btn primary" onClick={() => exportReport()}><ArrowDownToLine size={16} /> Export Excel</button>}
      />
      <div className="report-types">
        {REPORT_TYPES.map(([key, label]) => (
          <button
            key={key}
            className={`report-type ${report.kind === key ? "selected" : ""}`}
            onClick={() => setReport({ ...report, kind: key })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="filter-grid">
        <Field label="From date"><input type="date" value={report.from} onChange={(event) => setReport({ ...report, from: event.target.value })} /></Field>
        <Field label="To date"><input type="date" value={report.to} onChange={(event) => setReport({ ...report, to: event.target.value })} /></Field>
        <Field label="Equipment type">
          <select value={report.type} onChange={(event) => setReport({ ...report, type: event.target.value })}>
            <option value="all">All equipment</option>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Job status">
          <select value={report.status} onChange={(event) => setReport({ ...report, status: event.target.value })}>
            <option value="all">All statuses</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Search records" wide>
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Technical object, vehicle, gatepass, SAP order, PR or PO"
              value={report.q}
              onChange={(event) => setReport({ ...report, q: event.target.value })}
            />
          </div>
        </Field>
      </div>
      <div className="report-summary">
        <div><span>Matching records</span><b>{reportRows.length}</b></div>
        <div><span>In progress</span><b>{reportRows.filter((job) => job.status === "In Progress").length}</b></div>
        <div><span>Waiting for parts</span><b>{reportRows.filter((job) => job.status === "Waiting for Parts").length}</b></div>
        <div><span>Completed / exited</span><b>{reportRows.filter((job) => ["Completed", "Exited"].includes(job.status)).length}</b></div>
      </div>
      <div className="table-heading">
        <b>{REPORT_TITLES[report.kind]}</b>
        <span>{reportRows.length} matching job records</span>
      </div>
      <JobsTable rows={reportRows} setJobEdit={setJobEdit} setCompletion={setCompletion} setExitForm={setExitForm} />
      <div className="export-footer">
        <span className="muted small">Excel export uses the selected report and filters.</span>
        <button className="btn secondary" onClick={() => exportReport()}><FileSpreadsheet size={16} /> Download .xlsx</button>
      </div>
    </section>
  );
}
