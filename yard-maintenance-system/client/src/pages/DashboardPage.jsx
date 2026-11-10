import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  Plus,
  Settings2,
  Truck,
  Wrench
} from "lucide-react";
import { dateOnly } from "../appConstants";
import { useAppPage } from "../AppPageContext";
import { EmptyState, PanelHeader, StatCard, StatusBadge } from "../components/AppShared";

export default function DashboardPage() {
  const { summary, jobs, setPage, setJobEdit } = useAppPage();
  const recent = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  const overdue = jobs.filter(
    (job) => job.expectedOutDate && new Date(job.expectedOutDate) < new Date() && !["Completed", "Exited"].includes(job.status)
  );
  const statusGroups = [
    { label: "In progress", count: jobs.filter((job) => ["In Progress", "In progress", "Open"].includes(job.status)).length, tone: "blue" },
    { label: "Awaiting parts", count: jobs.filter((job) => String(job.status || "").toLowerCase().includes("part")).length, tone: "orange" },
    { label: "Completed", count: jobs.filter((job) => ["Completed", "Exited"].includes(job.status)).length, tone: "green" },
  ];
  const totalStatusJobs = statusGroups.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="dashboard">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">YARD OPERATIONS OVERVIEW</span>
          <h2>Good work starts with visibility.</h2>
          <p>Here's the current picture of your equipment yard and maintenance activity.</p>
        </div>
        <button className="btn primary" onClick={() => setPage("Inward Entry")}><Plus size={16} /> Register inward</button>
      </div>
      <div className="stat-grid">
        <StatCard label="Vehicles in yard" value={summary.inside} detail="Active inward entries" Icon={Truck} tone="blue" />
        <StatCard label="Active maintenance" value={summary.activeJobs} detail="In progress or awaiting parts" Icon={Wrench} tone="purple" />
        <StatCard label="Completed today" value={summary.completedToday} detail="Ready for exit or already released" Icon={CheckCircle2} tone="green" />
        <StatCard label="Overdue jobs" value={summary.overdue} detail="Past expected out date" Icon={AlertTriangle} tone="orange" warning={summary.overdue > 0} />
      </div>
      <section className="dashboard-status-panel" aria-label="Job status overview">
        <div className="dashboard-status-heading">
          <div><b>Job status overview</b><span>Current workload across {jobs.length} job cards</span></div>
          <button className="text-btn" onClick={() => setPage("Job Cards")}>Open job cards →</button>
        </div>
        <div className="dashboard-status-items">
          {statusGroups.map((item) => (
            <div className={`dashboard-status-item ${item.tone}`} key={item.label}>
              <span className="status-dot" />
              <span>{item.label}</span>
              <b>{item.count}</b>
              <div className="status-track"><span style={{ width: `${totalStatusJobs ? (item.count / totalStatusJobs) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeader
            title="Recent job cards"
            subtitle="Latest maintenance activity"
            action={<button className="text-btn" onClick={() => setPage("Job Cards")}>View all <span>→</span></button>}
          />
          {recent.length === 0 ? (
            <EmptyState title="No job cards yet" body="Register an inward entry to create the first job card." action={() => setPage("Inward Entry")} />
          ) : (
            <div className="recent-list">
              {recent.map((job) => (
                <div className="recent-row" key={job._id}>
                  <div className="recent-icon"><Wrench size={17} /></div>
                  <div className="recent-main">
                    <b>{job.jobCardNumber}</b>
                    <span>{job.technicalObjectNumber} · {job.vehicleNumber || job.equipmentType}</span>
                  </div>
                  <div className="recent-meta">
                    <StatusBadge status={job.status} />
                    <small>{dateOnly(job.inDateTime)}</small>
                  </div>
                  <button className="icon-btn" title="Edit job card" onClick={() => setJobEdit({ ...job })}><Settings2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHeader title="Quick actions" subtitle="Common yard workflows" />
          <div className="quick-actions">
            <button onClick={() => setPage("Equipment Master")}><span className="quick-icon blue"><Truck /></span><span><b>Add equipment</b><small>Register a technical object</small></span><span className="quick-arrow">→</span></button>
            <button onClick={() => setPage("Inward Entry")}><span className="quick-icon teal"><DoorOpen /></span><span><b>Vehicle inward</b><small>Gatepass and arrival details</small></span><span className="quick-arrow">→</span></button>
            <button onClick={() => setPage("Job Cards")}><span className="quick-icon purple"><ClipboardList /></span><span><b>Update job card</b><small>Mechanics, parts lots and SAP order</small></span><span className="quick-arrow">→</span></button>
            <button onClick={() => setPage("Reports & MIS")}><span className="quick-icon orange"><FileSpreadsheet /></span><span><b>Daily MIS report</b><small>Filter and export to Excel</small></span><span className="quick-arrow">→</span></button>
          </div>
        </section>
      </div>
      <div className="dashboard-grid bottom-grid">
        <section className="panel">
          <PanelHeader title="Overdue attention" subtitle="Open jobs past their expected out date" />
          {overdue.length === 0 ? (
            <div className="clear-state"><CheckCircle2 size={22} /><div><b>No overdue jobs detected</b><span>Jobs with a past expected date will appear here.</span></div></div>
          ) : (
            <div className="overdue-list">
              {overdue.slice(0, 5).map((job) => (
                <div key={job._id} className="overdue-row">
                  <AlertTriangle size={17} />
                  <div><b>{job.technicalObjectNumber} · {job.jobCardNumber}</b><span>Expected {dateOnly(job.expectedOutDate)} · {job.vehicleNumber || job.equipmentType}</span></div>
                  <button className="text-btn" onClick={() => setJobEdit({ ...job })}>Review</button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHeader title="Yard workflow" subtitle="Keep each visit traceable" />
          <div className="workflow-mini">
            {[
              ["01", "Register inward", "Gatepass + timestamp"],
              ["02", "Maintain job card", "Problem, action, parts lots, mechanic"],
              ["03", "Record completion", "Completion date + mechanic"],
              ["04", "Record exit", "Exit pass + timestamp"]
            ].map(([number, title, description], index) => (
              <div className="workflow-step" key={number}>
                <span className={`workflow-num n${index}`}>{number}</span>
                <div><b>{title}</b><small>{description}</small></div>
                {index < 3 && <span className="workflow-line" />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
