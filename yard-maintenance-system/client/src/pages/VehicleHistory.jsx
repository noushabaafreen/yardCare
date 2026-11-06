import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./VehicleHistory.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const text = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
};

const dateOnly = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

export default function VehicleHistory() {
  const [equipment, setEquipment] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [equipmentResponse, jobsResponse] = await Promise.all([
          api.get("/api/equipment"),
          api.get("/api/jobs"),
        ]);

        if (!active) return;

        setEquipment(Array.isArray(equipmentResponse.data) ? equipmentResponse.data : []);
        setJobs(Array.isArray(jobsResponse.data) ? jobsResponse.data : []);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load vehicle history. Check the backend connection and login."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return equipment;

    return equipment.filter((item) =>
      [
        item.vehicleNumber,
        item.technicalObjectNumber,
        item.equipmentName,
        item.equipmentType,
        item.make,
        item.model,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [equipment, search]);

  const selectedVehicle = equipment.find((item) => item._id === selectedId);

  const vehicleJobs = useMemo(() => {
    if (!selectedVehicle) return [];

    return jobs
      .filter((job) => {
        const equipmentId =
          typeof job.equipment === "object" ? job.equipment?._id : job.equipment;

        return (
          String(equipmentId || "") === String(selectedVehicle._id) ||
          job.technicalObjectNumber === selectedVehicle.technicalObjectNumber
        );
      })
      .sort((a, b) => new Date(b.inDateTime || 0) - new Date(a.inDateTime || 0));
  }, [jobs, selectedVehicle]);

  const totalParts = vehicleJobs.reduce(
    (total, job) =>
      total +
      (job.partsLots || []).reduce(
        (lotTotal, lot) => lotTotal + (lot.parts || []).filter((part) => !part.deletionIndicator).length,
        0
      ),
    0
  );

  function downloadPdf() {
    if (!selectedVehicle) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Vehicle History & Maintenance Report", 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [["Vehicle Information", "Details"]],
      body: [
        ["Vehicle Number", text(selectedVehicle.vehicleNumber)],
        ["Technical Object", text(selectedVehicle.technicalObjectNumber)],
        ["Equipment Name", text(selectedVehicle.equipmentName)],
        ["Equipment Type", text(selectedVehicle.equipmentType)],
        ["Make / Model", `${text(selectedVehicle.make)} / ${text(selectedVehicle.model)}`],
        ["Gatepass Number", text(selectedVehicle.gatepassNumber)],
        ["In Date", dateOnly(selectedVehicle.inDate)],
        ["Remarks", text(selectedVehicle.remarks)],
      ],
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: pageWidth - 56 } },
    });

    let y = doc.lastAutoTable.finalY + 8;

    vehicleJobs.forEach((job, index) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(12);
      doc.text(`Job Card ${index + 1}: ${text(job.jobCardNumber)}`, 14, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Field", "Details"]],
        body: [
          ["Status", text(job.status)],
          ["Inward Gatepass", text(job.inwardGatepassNumber)],
          ["In Date / Time", date(job.inDateTime)],
          ["Expected Out", dateOnly(job.expectedOutDate)],
          ["Out Date / Time", date(job.outDateTime || job.exitDateTime)],
          ["Problems", text(job.problems)],
          ["Action Taken", text(job.actionTaken)],
          ["Parts Required", text(job.partsRequired)],
          ["Parts Changed", text(job.partsChanged)],
          ["Mechanics", text(job.mechanicNames)],
          ["Maintenance Order", text(job.maintenanceOrderNumber || job.sapMaintenanceOrderNumber)],
          ["Maintenance Order Date", dateOnly(job.maintenanceOrderDate)],
          ["MR Number / Date", `${text(job.mrNumber)} / ${dateOnly(job.mrDate)}`],
          ["Completed By", text(job.completedByMechanic)],
          ["Completion Date", date(job.jobCompletedDateTime)],
          ["Exit Gatepass", text(job.exitGatepassNumber)],
          ["Final Remarks", text(job.finalRemarks)],
        ],
        styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: pageWidth - 56 } },
      });

      y = doc.lastAutoTable.finalY + 5;

      (job.partsLots || []).forEach((lot) => {
        if (y > 245) {
          doc.addPage();
          y = 18;
        }

        doc.setFontSize(10);
        doc.text(
          `${text(lot.lotName)} | PR: ${text(lot.prNumber)} (${dateOnly(lot.prDate)}) | PO: ${text(lot.poNumber)} (${dateOnly(lot.poDate)})`,
          14,
          y
        );
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [["Material Code", "Part Name", "Description", "Requested", "Ordered"]],
          body: (lot.parts || [])
            .filter((part) => !part.deletionIndicator)
            .map((part) => [
              text(part.materialCode),
              text(part.partName),
              text(part.shortText),
              text(part.quantityRequested),
              text(part.quantityOrdered),
            ]),
          styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
          margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 6;
      });

      y += 4;
    });

    doc.save(`${selectedVehicle.vehicleNumber || selectedVehicle.technicalObjectNumber}-history.pdf`);
  }

  return (
    <div className="vehicle-history-page">
      <div className="vehicle-history-header">
        <div>
          <h1>Vehicle History & Maintenance</h1>
          <p>View job cards, maintenance work, parts, and procurement records for a vehicle.</p>
        </div>

        <button
          className="vh-download-button"
          onClick={downloadPdf}
          disabled={!selectedVehicle || loading}
        >
          Download PDF
        </button>
      </div>

      {error && <div className="vh-error">{error}</div>}

      <section className="vh-selector">
        <label htmlFor="vehicle-search">Search vehicle</label>
        <input
          id="vehicle-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Vehicle number or technical object..."
        />

        <label htmlFor="vehicle-select">Select vehicle</label>
        <select
          id="vehicle-select"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">Choose a vehicle</option>
          {filteredEquipment.map((item) => (
            <option key={item._id} value={item._id}>
              {text(item.vehicleNumber)} — {text(item.technicalObjectNumber)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <p className="vh-empty">Loading vehicle records…</p>
      ) : !selectedVehicle ? (
        <p className="vh-empty">Select a vehicle to view its history.</p>
      ) : (
        <>
          <section className="vh-summary-grid">
            <div className="vh-summary-card">
              <span>Job Cards</span>
              <strong>{vehicleJobs.length}</strong>
            </div>
            <div className="vh-summary-card">
              <span>Parts Listed</span>
              <strong>{totalParts}</strong>
            </div>
            <div className="vh-summary-card">
              <span>Latest Status</span>
              <strong>{text(vehicleJobs[0]?.status || "No job cards")}</strong>
            </div>
          </section>

          <section className="vh-panel">
            <h2>Vehicle Details</h2>
            <div className="vh-details-grid">
              <div><span>Vehicle Number</span><strong>{text(selectedVehicle.vehicleNumber)}</strong></div>
              <div><span>Technical Object</span><strong>{text(selectedVehicle.technicalObjectNumber)}</strong></div>
              <div><span>Equipment Name</span><strong>{text(selectedVehicle.equipmentName)}</strong></div>
              <div><span>Equipment Type</span><strong>{text(selectedVehicle.equipmentType)}</strong></div>
              <div><span>Make / Model</span><strong>{text(selectedVehicle.make)} / {text(selectedVehicle.model)}</strong></div>
              <div><span>Gatepass Number</span><strong>{text(selectedVehicle.gatepassNumber)}</strong></div>
              <div><span>In Date</span><strong>{dateOnly(selectedVehicle.inDate)}</strong></div>
              <div className="vh-full-width"><span>Remarks</span><p>{text(selectedVehicle.remarks)}</p></div>
            </div>
          </section>

          <section className="vh-panel">
            <h2>Maintenance History</h2>

            {vehicleJobs.length === 0 ? (
              <p className="vh-empty">No job cards found for this vehicle.</p>
            ) : (
              vehicleJobs.map((job) => (
                <article className="vh-job-card" key={job._id}>
                  <div className="vh-job-heading">
                    <div>
                      <h3>{text(job.jobCardNumber)}</h3>
                      <span>{date(job.inDateTime)}</span>
                    </div>
                    <span className="vh-status">{text(job.status)}</span>
                  </div>

                  <div className="vh-details-grid">
                    <div><span>Inward Gatepass</span><strong>{text(job.inwardGatepassNumber)}</strong></div>
                    <div><span>Expected Out</span><strong>{dateOnly(job.expectedOutDate)}</strong></div>
                    <div><span>Out / Exit Date</span><strong>{date(job.outDateTime || job.exitDateTime)}</strong></div>
                    <div><span>Mechanics</span><strong>{text(job.mechanicNames)}</strong></div>
                    <div><span>Maintenance Order</span><strong>{text(job.maintenanceOrderNumber || job.sapMaintenanceOrderNumber)}</strong></div>
                    <div><span>MO Date</span><strong>{dateOnly(job.maintenanceOrderDate)}</strong></div>
                    <div><span>MR Number / Date</span><strong>{text(job.mrNumber)} / {dateOnly(job.mrDate)}</strong></div>
                    <div><span>Completed By</span><strong>{text(job.completedByMechanic)}</strong></div>
                    <div className="vh-full-width"><span>Problems</span><p>{text(job.problems)}</p></div>
                    <div className="vh-full-width"><span>Action Taken</span><p>{text(job.actionTaken)}</p></div>
                    <div className="vh-full-width"><span>Parts Required</span><p>{text(job.partsRequired)}</p></div>
                    <div className="vh-full-width"><span>Parts Changed</span><p>{text(job.partsChanged)}</p></div>
                    <div className="vh-full-width"><span>Final Remarks</span><p>{text(job.finalRemarks)}</p></div>
                  </div>

                  {(job.partsLots || []).length > 0 && (
                    <div className="vh-parts-section">
                      <h4>Parts & Procurement</h4>
                      {job.partsLots.map((lot, index) => (
                        <div className="vh-lot" key={lot._id || index}>
                          <div className="vh-lot-heading">
                            <strong>{text(lot.lotName)}</strong>
                            <span>PR: {text(lot.prNumber)} ({dateOnly(lot.prDate)})</span>
                            <span>PO: {text(lot.poNumber)} ({dateOnly(lot.poDate)})</span>
                          </div>

                          <div className="vh-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Material Code</th>
                                  <th>Part Name</th>
                                  <th>Description</th>
                                  <th>Requested</th>
                                  <th>Ordered</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lot.parts?.filter((part) => !part.deletionIndicator).map((part) => (
                                  <tr key={part._id}>
                                    <td>{text(part.materialCode)}</td>
                                    <td>{text(part.partName)}</td>
                                    <td>{text(part.shortText)}</td>
                                    <td>{text(part.quantityRequested)}</td>
                                    <td>{text(part.quantityOrdered)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}