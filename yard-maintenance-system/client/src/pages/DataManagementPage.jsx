import React from "react";
import { AlertTriangle, Search, Trash2 } from "lucide-react";
import { dateText } from "../appConstants";
import { useAppPage } from "../AppPageContext";
import { PanelHeader, StatusBadge } from "../components/AppShared";

function matchesSearch(values, query) {
  const normalizedQuery = query.toLowerCase().trim();
  return !normalizedQuery || values.some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
}

export default function DataManagementPage() {
  const { equipment, jobs, deleteSearch, setDeleteSearch, deletingKey, deleteEquipmentRecord, deleteJobRecord } = useAppPage();
  const filteredEquipment = equipment.filter((item) => matchesSearch([
    item.technicalObjectNumber,
    item.vehicleNumber,
    item.equipmentName,
    item.equipmentType,
    item.make,
    item.model
  ], deleteSearch));
  const filteredJobs = jobs.filter((job) => matchesSearch([
    job.jobCardNumber,
    job.technicalObjectNumber,
    job.vehicleNumber,
    job.inwardGatepassNumber,
    job.sapMaintenanceOrderNumber,
    job.maintenanceOrderNumber,
    job.mrNumber,
    job.stpoNumber
  ], deleteSearch));

  return (
    <div className="data-management-page">
      <section className="panel">
        <PanelHeader title="Delete vehicle records" subtitle="Search equipment and delete a vehicle with its maintenance history" />
        <div className="danger-callout">
          <AlertTriangle size={18} />
          <span><b>Permanent deletion:</b> deleting a vehicle removes its associated job cards and inward records. Export any records you need before continuing.</span>
        </div>
        <div className="toolbar">
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Search technical object, vehicle, make or model..."
              value={deleteSearch}
              onChange={(event) => setDeleteSearch(event.target.value)}
            />
          </div>
          <span className="result-count">{filteredEquipment.length} vehicles</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Technical object</th><th>Vehicle / equipment</th><th>Job cards</th><th>Current status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredEquipment.map((item) => {
                const linkedJobs = jobs.filter(
                  (job) => job.equipment === item._id || job.equipment?._id === item._id || job.technicalObjectNumber === item.technicalObjectNumber
                );
                const active = linkedJobs.some((job) => job.status !== "Exited");
                return (
                  <tr key={item._id}>
                    <td><b className="mono">{item.technicalObjectNumber}</b></td>
                    <td>{item.vehicleNumber || item.equipmentName || item.equipmentType}<small className="cell-sub">{[item.make, item.model].filter(Boolean).join(" · ")}</small></td>
                    <td>{linkedJobs.length}</td>
                    <td><StatusBadge status={active ? "In Progress" : "Exited"} /></td>
                    <td>
                      <button
                        type="button"
                        className="btn tiny danger"
                        disabled={deletingKey === `equipment-${item._id}`}
                        onClick={() => deleteEquipmentRecord(item)}
                      >
                        <Trash2 size={14} />{deletingKey === `equipment-${item._id}` ? "Deleting..." : "Delete vehicle + history"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredEquipment.length === 0 && <tr><td colSpan={5}>No matching vehicles found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Delete an individual job card" subtitle="Delete one visit while retaining the vehicle master record" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Job card</th><th>Technical object</th><th>Inward date / gatepass</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job._id}>
                  <td><b className="mono">{job.jobCardNumber}</b></td>
                  <td>{job.technicalObjectNumber}<small className="cell-sub">{job.vehicleNumber || job.equipmentType}</small></td>
                  <td>{dateText(job.inDateTime)}<small className="cell-sub">GP: {job.inwardGatepassNumber || "—"}</small></td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>
                    <button
                      type="button"
                      className="btn tiny danger"
                      disabled={deletingKey === `job-${job._id}`}
                      onClick={() => deleteJobRecord(job)}
                    >
                      <Trash2 size={14} />{deletingKey === `job-${job._id}` ? "Deleting..." : "Delete visit"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && <tr><td colSpan={5}>No matching job cards found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
