
import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../api";

const EMPTY = {
  vehicleNumber: "",
  technicalNumber: "",
  issue: "",
  vehicleType: "",
  makeCompany: "",
};

const TYPES = [
  "Aerial Work Platform",
  "Road Sweeper Machine",
  "Ambulance",
  "Backhoe Loader",
  "Bus / Coach",
  "Bus",
  "Camper",
  "Compressor",
  "Container Mounted Truck",
  "Crane",
  "Diesel Tanker",
  "Dozer / Bulldozer",
  "Excavator",
  "Fuel Bowser",
  "Forklift",
  "Generator",
  "Hydra",
  "Hyva",
  "Mixer",
  "Motor Grader",
  "Other",
  "Palfinger",
  "Pickup / Utility Vehicle",
  "Reach Stacker",
  "Road Roller / Compactor",
  "Skid Steer Loader",
  "Tipper",
  "Tractor",
  "Trailer",
  "Water Tanker",
  "Wheel Loader",
  "Others"
];

const MAKES = [
  "ACE",
  "DULEVO",
  "Ashok Leyland",
  //"Bajaj",
  "Sonalika",
  "Hindustan",
  "BharatBenz",
  "Bobcat",
  "Caterpillar",
  "DAF",
  // "Doosan",
  "Eicher",
  "Force",
  "Hitachi",
  "Hyundai",
  "Isuzu",
  // "JBM",
  "John Deere",
  "JCB",
  "Kobelco",
  "Komatsu",
  "Liebherr",
  "Mahindra",
  "MAN",
  "Maruti Suzuki",
  // "Bharat-Benz",
  "New Holland",
  // "Olectra",
  "Palfinger",
  // "Piaggio",
  "SANY",
  "Scania",
  "SML Isuzu",
  "Tata",
  "UD Trucks",
  "Volvo",
  "XCMG",
  "Zoomlion",
  "Manitou",
  "Other"
];;

export default function Scrap() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const response = await api.get("/api/scrap");
      setRecords(response.data.records || []);
      setError(false);
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Unable to load scrap records."
      );
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return records;

    return records.filter((r) =>
      [
        r.vehicleNumber,
        r.technicalNumber,
        r.issue,
        r.vehicleType,
        r.makeCompany,
      ].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [records, query]);

  function startEdit(record) {
    setEditing(record._id);

    setForm({
      vehicleNumber: record.vehicleNumber || "",
      technicalNumber: record.technicalNumber || "",
      issue: record.issue || "",
      vehicleType: record.vehicleType || "",
      makeCompany: record.makeCompany || "",
    });

    setMessage("");
    setError(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
  }

  async function save(e) {
    e.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      if (editing) {
        await api.patch(`/api/scrap/${editing}`, form);
      } else {
        await api.post("/api/scrap", form);
      }

      const wasEditing = Boolean(editing);

      reset();
      await load();

      setMessage(
        wasEditing
          ? "Scrap vehicle updated successfully."
          : "Scrap vehicle added successfully."
      );

      setError(false);
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Unable to save scrap vehicle."
      );
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(record) {
    if (
      !window.confirm(
        `Delete scrap record for ${record.vehicleNumber}?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/scrap/${record._id}`);

      if (editing === record._id) reset();

      await load();

      setMessage("Scrap record deleted successfully.");
      setError(false);
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Unable to delete record."
      );
      setError(true);
    }
  }

  async function exportExcel() {
    try {
      const response = await api.get("/api/scrap/export", {
        responseType: "blob",
      });

      const url = URL.createObjectURL(
        new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = "Scrap_Vehicles.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Excel export failed."
      );
      setError(true);
    }
  }

  return (
    <div className="scrap-page">

      {/* ADD / EDIT SCRAP VEHICLE */}
      <section className="panel scrap-panel">

        <div className="scrap-section-head">
          <div>
            <span className="scrap-eyebrow">
              VEHICLE MANAGEMENT
            </span>

            <h2>
              {editing ? "Edit Scrap Vehicle" : "Add Scrap Vehicle"}
            </h2>

            <p>
              Maintain a separate register of scrap vehicles
              currently inside the yard.
            </p>
          </div>

          <button
            className="btn secondary"
            type="button"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <form className="scrap-form" onSubmit={save}>

          <label className="scrap-field">
            <span>Vehicle Number <i>*</i></span>

            <input
              required
              type="text"
              value={form.vehicleNumber}
              onChange={(e) =>
                setForm({ ...form, vehicleNumber: e.target.value })
              }
              placeholder="Enter vehicle number"
            />
          </label>

          <label className="scrap-field">
            <span>Technical Number <i>*</i></span>

            <input
              required
              type="text"
              value={form.technicalNumber}
              onChange={(e) =>
                setForm({ ...form, technicalNumber: e.target.value })
              }
              placeholder="Enter technical number"
            />
          </label>

          <label className="scrap-field">
            <span>Type of Vehicle <i>*</i></span>

            <select
              required
              value={form.vehicleType}
              onChange={(e) =>
                setForm({ ...form, vehicleType: e.target.value })
              }
            >
              <option value="">Select vehicle type</option>

              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="scrap-field">
            <span>Make / Company <i>*</i></span>

            <select
              required
              value={form.makeCompany}
              onChange={(e) =>
                setForm({ ...form, makeCompany: e.target.value })
              }
            >
              <option value="">Select make / company</option>

              {MAKES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="scrap-field scrap-issue-field">
            <span>Issue of Vehicle <i>*</i></span>

            <textarea
              required
              rows={3}
              value={form.issue}
              onChange={(e) =>
                setForm({ ...form, issue: e.target.value })
              }
              placeholder="Describe the vehicle issue / scrap condition"
            />
          </label>

          <div className="scrap-form-actions">
            <button
              className="btn primary"
              type="submit"
              disabled={busy}
            >
              <Plus size={16} />

              {busy
                ? "Saving..."
                : editing
                ? "Update Scrap Vehicle"
                : "Save Scrap Vehicle"}
            </button>

            {editing && (
              <button
                className="btn secondary"
                type="button"
                onClick={reset}
                disabled={busy}
              >
                <X size={16} />
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && (
          <div className={error ? "notice-box error" : "notice-box"}>
            {message}
          </div>
        )}
      </section>

      {/* SCRAP VEHICLE REGISTER */}
      <section className="panel scrap-panel scrap-register-panel">

        <div className="scrap-section-head scrap-register-head">
          <div>
            <span className="scrap-eyebrow">
              RECORD MANAGEMENT
            </span>

            <h2>Scrap Vehicle Register</h2>

            <p>
              {records.length} scrap vehicle record(s) ·
              Separate from Reports &amp; MIS
            </p>
          </div>

          <button
            className="btn primary"
            type="button"
            onClick={exportExcel}
            disabled={!records.length}
          >
            <Download size={15} />
            Export Excel
          </button>
        </div>

        <div className="scrap-toolbar">
          <div className="scrap-search">
            <Search size={17} />

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicle, technical number, issue..."
            />
          </div>
        </div>

        {loading ? (
          <div className="scrap-loading">
            Loading scrap records...
          </div>
        ) : (
          <div className="scrap-table-wrap">
            <table className="scrap-table">
              <thead>
                <tr>
                  <th>SL NO</th>
                  <th>VEHICLE NUMBER</th>
                  <th>TECHNICAL NUMBER</th>
                  <th>ISSUE OF VEHICLE</th>
                  <th>TYPE OF VEHICLE</th>
                  <th>MAKE / COMPANY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r._id}>
                    <td>{i + 1}</td>

                    <td>
                      <b>{r.vehicleNumber}</b>
                    </td>

                    <td className="mono">
                      {r.technicalNumber}
                    </td>

                    <td className="scrap-issue-cell">
                      {r.issue}
                    </td>

                    <td>{r.vehicleType}</td>

                    <td>{r.makeCompany}</td>

                    <td>
                      <div className="scrap-row-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title="Edit"
                          onClick={() => startEdit(r)}
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          className="icon-btn danger"
                          type="button"
                          title="Delete"
                          onClick={() => remove(r)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filtered.length && (
              <div className="empty-state">
                {records.length
                  ? "No matching scrap vehicles."
                  : "No scrap vehicles added yet."}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
