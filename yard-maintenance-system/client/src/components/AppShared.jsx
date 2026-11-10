import React from "react";
import { Boxes, History, X } from "lucide-react";
import { dateOnly, dateText, localDateTime } from "../appConstants";

export function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="panel-header">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {action}
    </div>
  );
}

export function Field({ label, required, wide, children }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}{required && <i> *</i>}</span>
      {children}
    </label>
  );
}

export function Modal({ title, subtitle, close, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, detail, Icon, tone, warning }) {
  return (
    <div className={`stat-card ${warning ? "warning" : ""}`}>
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}</b>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  const tone = status === "Exited" ? "green" : status === "Completed" ? "blue" : status === "Waiting for Parts" ? "orange" : status === "In Progress" ? "purple" : "gray";
  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {status || "Unknown"}
    </span>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Boxes /></div>
      <b>{title}</b>
      <p>{body}</p>
      {action && <button className="btn secondary" onClick={action}>Get started</button>}
    </div>
  );
}

export function EquipmentTable({ rows, jobs, onViewHistory, onSelectEquipment, onNewInward }) {
  if (!rows.length) return <EmptyState title="No equipment found" body="Add equipment to create your permanent technical object register." />;
  return (
    <div className="table-scroll-region">
      <p className="table-scroll-hint">Swipe sideways to view the remaining columns.</p>
      <div
        className="table-wrap"
        tabIndex={0}
        aria-label="Equipment register. Scroll horizontally to view all columns."
      >
        <table>
          <thead>
            <tr>
              <th>Technical object</th>
              <th>Vehicle / machine</th>
              <th>Equipment type</th>
              <th>Make / model</th>
              <th>Visits</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((equipment) => {
              const visits = jobs.filter(
                (job) => job.equipment === equipment._id || job.equipment?._id === equipment._id || job.technicalObjectNumber === equipment.technicalObjectNumber
              );
              const active = visits.some((job) => job.status !== "Exited");
              return (
                <tr key={equipment._id} className="clickable-row" onClick={() => onSelectEquipment(equipment)} title="Click to view equipment details">
                  <td><b className="mono">{equipment.technicalObjectNumber}</b></td>
                  <td>{equipment.vehicleNumber || equipment.equipmentName || "—"}</td>
                  <td>{equipment.equipmentType}</td>
                  <td>{[equipment.make, equipment.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td><b>{visits.length}</b><small className="cell-sub">{active ? "Currently inside" : "Not in yard"}</small></td>
                  <td>{dateOnly(equipment.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn tiny secondary" onClick={(event) => { event.stopPropagation(); onViewHistory(equipment); }}><History size={14} /> History</button>
                      {!active && <button className="btn tiny primary" onClick={(event) => { event.stopPropagation(); onNewInward(equipment._id); }}>New inward</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function JobsTable({ rows, setJobEdit, setCompletion, setExitForm }) {
  if (!rows.length) return <EmptyState title="No job cards match" body="Try changing the search or filters, or register a new inward entry." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Job card / SAP order</th>
            <th>Technical object</th>
            <th>Vehicle / type</th>
            <th>Inward / gatepass</th>
            <th>Parts Lots</th>
            <th>Expected out</th>
            <th>Mechanic(s)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => {
            const lotCount = (job.partsLots || []).length;
            const partCount = (job.partsLots || []).reduce((count, lot) => count + (lot.parts?.length || 0), 0);

            return (
              <tr key={job._id}>
                <td>
                  <b className="mono">{job.jobCardNumber}</b>
                  <small className="cell-sub">MO: {job.maintenanceOrderNumber || "Pending"}</small>
                  {job.mrNumber && <small className="cell-sub">MR: {job.mrNumber}</small>}
                  {job.stpoNumber && <small className="cell-sub">STPO: {job.stpoNumber}</small>}
                  {job.sapMaintenanceOrderNumber && <small className="cell-sub">Legacy: {job.sapMaintenanceOrderNumber}</small>}
                </td>
                <td><b className="mono">{job.technicalObjectNumber}</b></td>
                <td>{job.vehicleNumber || "—"}<small className="cell-sub">{job.equipmentType} · {[job.make, job.model].filter(Boolean).join(" ")}</small></td>
                <td>{dateText(job.inDateTime)}<small className="cell-sub">GP: {job.inwardGatepassNumber}</small></td>
                <td><b>{lotCount} {lotCount === 1 ? "Lot" : "Lots"}</b><small className="cell-sub">{partCount} total {partCount === 1 ? "part" : "parts"}</small></td>
                <td>{dateOnly(job.expectedOutDate)}</td>
                <td>{job.mechanicNames || "—"}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>
                  <div className="row-actions">
                    <button className="btn tiny secondary" onClick={() => setJobEdit({ ...job })}>Edit</button>
                    {!["Completed", "Exited"].includes(job.status) && (
                      <button
                        className="btn tiny success"
                        onClick={() => setCompletion({ ...job, jobCompletedDateTime: localDateTime(), completedByMechanic: job.mechanicNames || "", finalRemarks: job.finalRemarks || "" })}
                      >
                        Complete
                      </button>
                    )}
                    {job.status === "Completed" && (
                      <button
                        className="btn tiny primary"
                        onClick={() => setExitForm({ ...job, exitDateTime: localDateTime(), exitGatepassNumber: job.exitGatepassNumber || "" })}
                      >
                        Exit pass
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
