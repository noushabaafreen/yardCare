import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Truck,
  Wrench,
  X
} from "lucide-react";
import api from "./api";
import Attendance from "./components/Attendance/Attendance";

const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Equipment Master", Truck],
  ["Inward Entry", DoorOpen],
  ["Job Cards", ClipboardList],
  ["Detail Search", Search],
  ["Data Management", Trash2],
  ["Attendance", CalendarDays],
  ["Parts Catalogue", Boxes],
  ["Reports & MIS", FileSpreadsheet]
];

const TYPES = [
  "Aerial Work Platform",
  "Ambulance",
  "Backhoe Loader",
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
  "Ashok Leyland",
  //"Bajaj",
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
];

const STATUSES = ["In Progress", "Waiting for Parts", "Completed", "Exited"];

const blankEquipment = {
  technicalObjectNumber: "",
  vehicleNumber: "",
  equipmentName: "",
  equipmentType: "Hydra",
  make: "",
  model: "",
  gatepassNumber: "",
  inDate: "",
  remarks: ""
};

const blankInward = {
  equipmentId: "",
  gatepassNumber: "",
  inDateTime: localDateTime(),
  complaint: "",
  enteredBy: "",
  expectedOutDate: "",
  remarks: ""
};

function localDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function dateText(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function dateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function errMsg(e) {
  return e.response?.data?.message || e.message || "Something went wrong.";
}

function parseBulkParts(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let columns;
      if (line.includes("\t")) columns = line.split("\t");
      else if (line.includes("|")) columns = line.split("|");
      else if (line.includes(",")) columns = line.split(",");
      else columns = line.split(/\s{2,}/);

      if (columns.length < 2) {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (match) columns = [match[1], match[2]];
      }

      const materialCode = String(columns[0] || "").trim();
      const partName = columns.slice(1).join(" ").trim();
      if (!materialCode || !partName) return null;
      if (/^(material\s*code|materialcode)$/i.test(materialCode) &&
        /^(part\s*name|description)$/i.test(partName)) return null;

      return {
        materialCode,
        partName,
        shortText: "",
        quantityRequested: 0,
        quantityOrdered: 0
      };
    })
    .filter(Boolean);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SearchableEquipmentSelect({ equipment, jobs, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedEquipment = useMemo(() => {
    return equipment.find((e) => e._id === selectedId) || null;
  }, [equipment, selectedId]);

  useEffect(() => {
    if (selectedEquipment) {
      setQuery(`${selectedEquipment.technicalObjectNumber} - ${selectedEquipment.vehicleNumber || selectedEquipment.equipmentType}`);
    } else if (!selectedId) {
      setQuery("");
    }
  }, [selectedEquipment, selectedId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return equipment
      .map((item) => {
        const history = jobs.filter(
          (j) => j.equipment === item._id || j.equipment?._id === item._id || j.technicalObjectNumber === item.technicalObjectNumber
        );
        const isInside = history.some((j) => j.status !== "Exited");
        return { ...item, isInside, totalVisits: history.length };
      })
      .filter((item) => {
        if (!q) return true;
        return [item.technicalObjectNumber, item.vehicleNumber, item.equipmentName, item.equipmentType, item.make, item.model]
          .some((v) => String(v || "").toLowerCase().includes(q));
      });
  }, [equipment, jobs, query]);

  function handleSelect(item) {
    if (item.isInside) return;
    onSelect(item._id);
    setQuery(`${item.technicalObjectNumber} - ${item.vehicleNumber || item.equipmentType}`);
    setOpen(false);
  }

  function handleClear() {
    onSelect("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="searchable-combobox" ref={containerRef}>
      <div className="searchbox">
        <Search size={16} className="combobox-search-icon" />
        <input
          type="text"
          value={query}
          placeholder="Type number (e.g. 1000... or vehicle reg)..."
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selectedId) onSelect("");
          }}
          onFocus={() => setOpen(true)}
          required={!selectedId}
        />
        {query && (
          <button
            type="button"
            className="combobox-clear-btn"
            onClick={handleClear}
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && (
        <ul className="combobox-dropdown">
          {filtered.length === 0 ? (
            <li className="combobox-dropdown-empty">
              No equipment found matching "{query}"
            </li>
          ) : (
            filtered.map((item) => (
              <li
                key={item._id}
                onClick={() => handleSelect(item)}
                className={`combobox-item ${item.isInside ? "disabled" : ""} ${item._id === selectedId ? "selected" : ""}`}
              >
                <div className="combobox-item-info">
                  <div className="combobox-item-title">
                    <b>{item.technicalObjectNumber}</b>
                    <span>{item.vehicleNumber || item.equipmentName || item.equipmentType}</span>
                  </div>
                  <span className="combobox-item-sub">
                    {[item.make, item.model].filter(Boolean).join(" · ")} · {item.totalVisits} visit(s)
                  </span>
                </div>
                {item.isInside ? (
                  <span className="combobox-badge inside">CURRENTLY INSIDE</span>
                ) : (
                  <span className="combobox-badge available">Available</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("yard_token"));
  const [admin, setAdmin] = useState(localStorage.getItem("yard_admin") || "admin");
  const [login, setLogin] = useState({ username: "admin", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [page, setPage] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [summary, setSummary] = useState({ equipment: 0, inside: 0, activeJobs: 0, completedToday: 0, overdue: 0, totalJobs: 0 });
  const [equipment, setEquipment] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [deleteSearch, setDeleteSearch] = useState("");
  const [deletingKey, setDeletingKey] = useState("");
  const [report, setReport] = useState({ kind: "inside", from: "", to: "", type: "all", status: "all", q: "" });
  const [equipmentModal, setEquipmentModal] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState(blankEquipment);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentEditMode, setEquipmentEditMode] = useState(false);
  const [equipmentEditForm, setEquipmentEditForm] = useState(blankEquipment);
  const [equipmentEditBusy, setEquipmentEditBusy] = useState(false);
  const [inwardForm, setInwardForm] = useState(blankInward);
  const [jobEdit, setJobEdit] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [exitForm, setExitForm] = useState(null);
  const [historyEquipment, setHistoryEquipment] = useState(null);
  const [catalogParts, setCatalogParts] = useState([]);
  const [catalogCompany, setCatalogCompany] = useState("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const refreshIdRef = useRef(0);
  const toastTimeoutRef = useRef(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({ materialCode: "", materialName: "", company: "" });
  const [savingPart, setSavingPart] = useState(false);
  const [selectedCatalogPart, setSelectedCatalogPart] = useState(null);
  const [catalogEditForm, setCatalogEditForm] = useState({ materialCode: "", materialName: "", company: "" });
  const [catalogEditMode, setCatalogEditMode] = useState(false);
  const [catalogPartBusy, setCatalogPartBusy] = useState(false);

  useEffect(() => {
    if (page !== "Parts Catalogue" || catalogParts.length) return;
    let cancelled = false;
    setCatalogLoading(true);
    api.get("/api/parts-catalog")
      .then((r) => { if (!cancelled) setCatalogParts(r.data.parts || []); })
      .catch((e) => { if (!cancelled) flash("error", "Could not load parts catalogue. " + errMsg(e)); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [page, catalogParts.length]);

  const catalogCompanies = useMemo(
    () => [...new Set(catalogParts.map((p) => p.company))].sort(),
    [catalogParts]
  );
  const filteredCatalogParts = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return catalogParts.filter((part) =>
      (catalogCompany === "all" || part.company === catalogCompany) &&
      (!q || part.materialCode.toLowerCase().includes(q) || part.materialName.toLowerCase().includes(q))
    );
  }, [catalogParts, catalogCompany, catalogQuery]);

  function openCatalogPart(part) {
    setSelectedCatalogPart(part);
    setCatalogEditForm({ materialCode: part.materialCode, materialName: part.materialName, company: part.company });
    setCatalogEditMode(false);
  }

  async function saveCatalogPart(e) {
    e.preventDefault();
    if (!selectedCatalogPart) return;
    setCatalogPartBusy(true);
    try {
      const old = selectedCatalogPart;
      const url = `/api/parts-catalog/${encodeURIComponent(old.materialCode)}/${encodeURIComponent(old.company)}`;
      const response = await api.put(url, catalogEditForm);
      setCatalogParts(current => current.map(p =>
        p.materialCode === old.materialCode && p.company === old.company ? response.data.part : p
      ));
      setSelectedCatalogPart(response.data.part);
      setCatalogEditForm(response.data.part);
      setCatalogEditMode(false);
      flash("success", "Part updated.");
    } catch (error) {
      flash("error", errMsg(error));
    } finally {
      setCatalogPartBusy(false);
    }
  }

  async function deleteCatalogPart() {
    if (!selectedCatalogPart) return;
    const part = selectedCatalogPart;
    if (!window.confirm(`Delete ${part.materialCode} — ${part.materialName} (${part.company})? This cannot be undone.`)) return;
    setCatalogPartBusy(true);
    try {
      const url = `/api/parts-catalog/${encodeURIComponent(part.materialCode)}/${encodeURIComponent(part.company)}`;
      await api.delete(url);
      setCatalogParts(current => current.filter(p => !(p.materialCode === part.materialCode && p.company === part.company)));
      setSelectedCatalogPart(null);
      flash("success", "Part deleted from catalogue.");
    } catch (error) {
      flash("error", errMsg(error));
    } finally {
      setCatalogPartBusy(false);
    }
  }

  async function addCatalogPart(e) {
    e.preventDefault();
    setSavingPart(true);
    try {
      const r = await api.post("/api/parts-catalog", newPart);
      setCatalogParts((current) => [...current, r.data.part]);
      setCatalogCompany("all");
      setCatalogQuery(newPart.materialCode);
      setNewPart({ materialCode: "", materialName: "", company: "" });
      setShowAddPart(false);
      flash("success", "Part added to catalogue.");
    } catch (error) {
      flash("error", errMsg(error));
    } finally {
      setSavingPart(false);
    }
  }

  const flash = useCallback((type, text) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setNotice({ type, text });
    toastTimeoutRef.current = window.setTimeout(() => {
      setNotice({ type: "", text: "" });
      toastTimeoutRef.current = null;
    }, 4500);
  }, []);

  const loadSummary = useCallback(async () => {
    const r = await api.get("/api/reports/summary");
    setSummary(r.data);
  }, []);

  const loadEquipment = useCallback(async () => {
    const r = await api.get("/api/equipment");
    setEquipment(r.data);
  }, []);

  const loadInwards = useCallback(async () => {
    const r = await api.get("/api/inwards");
    setInwards(r.data);
  }, []);

  const loadJobs = useCallback(async () => {
    const r = await api.get("/api/jobs");
    setJobs(r.data);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const requestId = ++refreshIdRef.current;
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadEquipment(), loadInwards(), loadJobs()]);
      if (requestId !== refreshIdRef.current) return;
    } catch (e) {
      if (requestId !== refreshIdRef.current) return;
      flash("error", errMsg(e));
    } finally {
      if (requestId === refreshIdRef.current) {
        setLoading(false);
      }
    }
  }, [token, flash, loadSummary, loadEquipment, loadInwards, loadJobs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      refreshIdRef.current += 1;
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      refreshIdRef.current += 1;
      setToken(null);
      setNotice({ type: "error", text: "Session expired. Please sign in again." });
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
    window.addEventListener("yard-session-expired", handler);
    return () => window.removeEventListener("yard-session-expired", handler);
  }, []);

  const filteredEquipment = useMemo(() => {
    const q = equipmentSearch.toLowerCase().trim();
    return equipment.filter(
      (x) =>
        !q ||
        [x.technicalObjectNumber, x.vehicleNumber, x.equipmentType, x.make, x.model].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
    );
  }, [equipment, equipmentSearch]);

  const matchesJobQuery = (job, query) => {
    if (!query) return true;
    const partsTokens = (job.partsLots || []).flatMap((lot) => [
      lot.lotName,
      lot.prNumber,
      lot.poNumber,
      ...(lot.parts || []).map((p) => [p.materialCode, p.partName, p.shortText].join(" "))
    ]);

    return [
      job.jobCardNumber,
      job.technicalObjectNumber,
      job.vehicleNumber,
      job.inwardGatepassNumber,
      job.sapMaintenanceOrderNumber,
      job.maintenanceOrderNumber,
      job.mrNumber,
      job.stpoNumber,
      job.mechanicNames,
      job.exitGatepassNumber,
      job.problems,
      job.actionTaken,
      job.partsRequired,
      job.partsChanged,
      job.completedByMechanic,
      job.finalRemarks,
      ...partsTokens
    ].some((v) => String(v || "").toLowerCase().includes(query));
  };

  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase().trim();
    return jobs.filter((x) => matchesJobQuery(x, q));
  }, [jobs, jobSearch]);

  const detailQuery = detailSearch.trim().toLowerCase();

  const detailEquipmentResults = useMemo(() => {
    if (!detailQuery) return [];

    return equipment.filter((item) =>
      [
        item.technicalObjectNumber,
        item.vehicleNumber,
        item.equipmentName,
        item.equipmentType,
        item.make,
        item.model,
        item.remarks
      ].some((value) =>
        String(value || "").toLowerCase().includes(detailQuery)
      )
    );
  }, [equipment, detailQuery]);

  const detailJobResults = useMemo(() => {
    if (!detailQuery) return [];

    return jobs.filter((job) => matchesJobQuery(job, detailQuery) ||
      [
        job.exitGatepassNumber,
        job.problems,
        job.actionTaken,
        job.partsRequired,
        job.partsChanged,
        job.completedByMechanic,
        job.finalRemarks,
        job.inward?.gatepassNumber
      ].some((value) =>
        String(value || "").toLowerCase().includes(detailQuery)
      )
    );
  }, [jobs, detailQuery]);

  const reportRows = useMemo(() => {
    return jobs.filter((j) => {
      if (report.kind === "inside" && j.status === "Exited") return false;
      if (report.kind === "pending" && !["Awaiting Job Card", "In Progress", "Waiting for Parts"].includes(j.status)) return false;
      if (report.kind === "completed" && !["Completed", "Exited"].includes(j.status)) return false;
      if (report.kind === "exited" && j.status !== "Exited") return false;
      if (report.status !== "all" && j.status !== report.status) return false;
      if (report.type !== "all" && j.equipmentType !== report.type) return false;
      const dt = new Date(j.inDateTime);
      if (report.from && dt < new Date(`${report.from}T00:00:00`)) return false;
      if (report.to && dt > new Date(`${report.to}T23:59:59`)) return false;
      const q = report.q.toLowerCase().trim();
      return matchesJobQuery(j, q);
    });
  }, [jobs, report]);

  async function handleLogin(e) {
    e.preventDefault();
    if (loginLoading) return;

    setLoginLoading(true);
    setLoginError("");

    try {
      const r = await api.post("/api/auth/login", login);
      localStorage.setItem("yard_token", r.data.token);
      localStorage.setItem("yard_admin", r.data.username);
      setToken(r.data.token);
      setAdmin(r.data.username);
      flash("success", "Welcome back.");
    } catch (e) {
      setLoginError(errMsg(e));
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    refreshIdRef.current += 1;
    localStorage.removeItem("yard_token");
    localStorage.removeItem("yard_admin");
    setToken(null);
    setPage("Dashboard");
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }

  async function saveEquipmentEdit(e) {
    e.preventDefault();
    if (!selectedEquipment?._id) return;
    setEquipmentEditBusy(true);
    try {
      const payload = { ...equipmentEditForm };
      delete payload.technicalObjectNumber;
      const r = await api.patch(`/api/equipment/${selectedEquipment._id}`, payload);
      setSelectedEquipment(r.data);
      setEquipmentEditMode(false);
      await loadEquipment();
      flash("success", "Equipment details updated.");
    } catch (e) {
      flash("error", errMsg(e));
    } finally {
      setEquipmentEditBusy(false);
    }
  }

  async function saveEquipment(e) {
    e.preventDefault();
    try {
      await api.post("/api/equipment", equipmentForm);
      setEquipmentModal(false);
      setEquipmentForm(blankEquipment);
      await Promise.all([loadEquipment(), loadSummary()]);
      flash("success", "Equipment saved successfully.");
    } catch (e) {
      flash("error", errMsg(e));
    }
  }

  async function saveInward(e) {
    e.preventDefault();
    if (!inwardForm.equipmentId) {
      flash("error", "Please select a valid equipment technical object from the list.");
      return;
    }
    try {
      const r = await api.post("/api/inwards", inwardForm);
      setInwardForm({ ...blankInward, inDateTime: localDateTime() });
      await refresh();
      setPage("Job Cards");
      flash("success", `Inward saved. Job card ${r.data.job.jobCardNumber} created.`);
    } catch (e) {
      flash("error", errMsg(e));
    }
  }

  async function saveJob(e) {
    e.preventDefault();
    try {
      const { _id, ...body } = jobEdit;
      await api.patch(`/api/jobs/${_id}`, body);
      setJobEdit(null);
      await refresh();
      flash("success", "Job card updated.");
    } catch (e) {
      flash("error", errMsg(e));
    }
  }

  async function completeJob(e) {
    e.preventDefault();
    try {
      const { _id, ...body } = completion;
      await api.post(`/api/jobs/${_id}/complete`, body);
      setCompletion(null);
      await refresh();
      flash("success", "Job marked completed. Vehicle remains inside until exit is recorded.");
    } catch (e) {
      flash("error", errMsg(e));
    }
  }

  async function exitJob(e) {
    e.preventDefault();
    try {
      const { _id, ...body } = exitForm;
      await api.post(`/api/jobs/${_id}/exit`, body);
      setExitForm(null);
      await refresh();
      flash("success", "Exit pass recorded and vehicle marked exited.");
    } catch (e) {
      flash("error", errMsg(e));
    }
  }

  async function deleteEquipmentRecord(item) {
    const typed = window.prompt(
      `PERMANENTLY DELETE EQUIPMENT ${item.technicalObjectNumber}?\n\n` +
      `This will delete the equipment, its linked inward records, ` +
      `and its maintenance job cards.\n\n` +
      `Type the exact technical object number to confirm:`
    );

    if (typed !== item.technicalObjectNumber) {
      if (typed !== null) {
        flash("error", "Confirmation did not match. Nothing was deleted.");
      }
      return;
    }

    setDeletingKey(`equipment-${item._id}`);

    try {
      const result = await api.delete(`/api/data-management/equipment/${item._id}`);
      await refresh();
      flash(
        "success",
        `Equipment deleted. Job cards: ${result.data.deleted.jobs}; inward records: ${result.data.deleted.inwards}.`
      );
    } catch (e) {
      flash("error", errMsg(e));
    } finally {
      setDeletingKey("");
    }
  }

  async function deleteJobRecord(job) {
    const typed = window.prompt(
      `PERMANENTLY DELETE JOB CARD ${job.jobCardNumber}?\n\n` +
      `Its linked inward record will also be deleted.\n\n` +
      `Type the exact job card number to confirm:`
    );

    if (typed !== job.jobCardNumber) {
      if (typed !== null) {
        flash("error", "Confirmation did not match. Nothing was deleted.");
      }
      return;
    }

    setDeletingKey(`job-${job._id}`);

    try {
      await api.delete(`/api/data-management/jobs/${job._id}`);
      await refresh();
      flash("success", `Job card ${job.jobCardNumber} and its linked inward record were deleted.`);
    } catch (e) {
      flash("error", errMsg(e));
    } finally {
      setDeletingKey("");
    }
  }

  async function exportReport(kind = report.kind) {
    try {
      const params = { kind, from: report.from, to: report.to, type: report.type, status: report.status, q: report.q };
      const r = await api.get("/api/reports/export.xlsx", { params, responseType: "blob" });
      downloadBlob(r.data, `yard-${kind}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      flash("error", "Excel export failed. " + errMsg(e));
    }
  }

  return (
    <div className={token ? "app-shell" : "login-shell"}>
      {!token ? (
        <>
          <div className="login-art">
            <div className="brand brand-light">
              <div className="brand-icon"><Wrench size={22} /></div>
              <div><b>YardCare</b><span>Equipment Maintenance MIS</span></div>
            </div>
            <div className="login-hero">
              <span className="eyebrow">YARD OPERATIONS · MAINTENANCE · REPORTING</span>
              <h1>Every machine.<br />Every job.<br /><em>Under control.</em></h1>
              <p>One place to manage inward gatepasses, maintenance job cards, SAP orders and daily yard reports.</p>
            </div>
            <div className="login-bottom">
              <span><ShieldDot /> Secure admin access</span>
              <span>Local-first workspace</span>
            </div>
          </div>
          <div className="login-panel">
            <form className="login-form" onSubmit={handleLogin}>
              <div className="mobile-brand"><Wrench /> YardCare</div>
              <span className="eyebrow">ADMINISTRATOR ACCESS</span>
              <h2>Welcome back</h2>
              <p className="muted">Sign in to manage your yard operations.</p>
              <label>Username</label>
              <input autoComplete="username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} required />
              <label>Password</label>
              <input type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required />
              {loginError && <div className="error-box">{loginError}</div>}
              <button
                type="submit"
                disabled={loginLoading}
                className="login-button"
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying credentials...
                  </>
                ) : (
                  "Login"
                )}
              </button>
              <div className="login-hint"><AlertTriangle size={15} /> Use the admin credentials configured in <code>server/.env</code>.</div>
            </form>
          </div>
        </>
      ) : (
        <>
          <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
            <div className="brand">
              <div className="brand-icon"><Wrench size={21} /></div>
              <div><b>YardCare</b><span>Maintenance MIS</span></div>
              <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
            </div>
            <div className="nav-caption">WORKSPACE</div>
            <nav>
              {NAV.map(([label, Icon]) => (
                <button
                  key={label}
                  className={`nav-item ${page === label ? "active" : ""}`}
                  onClick={() => {
                    setPage(label);
                    setMobileNav(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {label === "Reports & MIS" && <span className="nav-tag">MIS</span>}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="connection">
                <span className="online-dot" />
                <span><b>Local workspace</b><small>Connected session</small></span>
              </div>
              <div className="user-row">
                <div className="avatar">{admin.slice(0, 1).toUpperCase()}</div>
                <div className="user-meta"><b>{admin}</b><small>Administrator</small></div>
                <button title="Sign out" className="icon-btn" onClick={logout}><LogOut size={17} /></button>
              </div>
            </div>
          </aside>
          {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}
          <main className="main-area">
            <header className="topbar">
              <div className="topbar-left">
                <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu /></button>
                <div>
                  <div className="breadcrumbs">YARD OPERATIONS <span>/</span> <b>{page.toUpperCase()}</b></div>
                  <h1>{page}</h1>
                </div>
              </div>
              <div className="top-actions">
                <span className="today-label">
                  <CalendarDays size={15} />
                  {new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <button className="btn secondary" onClick={refresh}>
                  <RefreshCw size={16} className={loading ? "spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </header>

            {notice.text && (
              <div className={`toast ${notice.type}`}>
                <span>{notice.text}</span>
                <button onClick={() => setNotice({ type: "", text: "" })}><X size={16} /></button>
              </div>
            )}

            <div className="page-content">
              {page === "Attendance" && <Attendance />}

              {page === "Parts Catalogue" && (
                <section className="panel">
                  <PanelHeader
                    title="Parts Catalogue"
                    subtitle={`${catalogParts.length.toLocaleString()} material records · Stored in the backend JSON catalogue`}
                    action={<button className="btn primary" onClick={() => setShowAddPart((v) => !v)}><Plus size={16} /> Add Part</button>}
                  />
                  {showAddPart && (
                    <form className="catalog-add-form" onSubmit={addCatalogPart}>
                      <label>Material Code<input required value={newPart.materialCode} onChange={(e) => setNewPart({ ...newPart, materialCode: e.target.value })} /></label>
                      <label>Material Name<input required value={newPart.materialName} onChange={(e) => setNewPart({ ...newPart, materialName: e.target.value })} /></label>
                      <label>Company<input required list="catalog-company-options" value={newPart.company} onChange={(e) => setNewPart({ ...newPart, company: e.target.value })} placeholder="e.g. Tata" /></label>
                      <datalist id="catalog-company-options">{catalogCompanies.map((company) => <option key={company} value={company} />)}</datalist>
                      <button className="btn primary" type="submit" disabled={savingPart}>{savingPart ? "Saving…" : "Save Part"}</button>
                    </form>
                  )}
                  <div className="catalog-toolbar">
                    <label className="catalog-filter"><span>Company</span>
                      <select value={catalogCompany} onChange={(e) => setCatalogCompany(e.target.value)}>
                        <option value="all">All companies</option>
                        {catalogCompanies.map((company) => <option key={company} value={company}>{company}</option>)}
                      </select>
                    </label>
                    <label className="catalog-search"><span>Search material code or name</span>
                      <div className="search-input-wrap"><Search size={17} /><input value={catalogQuery} onChange={(e) => setCatalogQuery(e.target.value)} placeholder="Enter material code or part name…" /></div>
                    </label>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Material Code</th><th>Material Name</th><th>Company</th></tr></thead>
                      <tbody>
                        {catalogLoading ? <tr><td colSpan="3">Loading catalogue…</td></tr> : filteredCatalogParts.slice(0, 500).map((part, index) => (
                          <tr key={`${part.materialCode}-${part.company}-${index}`} className="catalog-clickable-row" tabIndex={0} role="button" onClick={() => openCatalogPart(part)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openCatalogPart(part); }} title="Click to view or edit part details"><td><code>{part.materialCode}</code></td><td>{part.materialName}</td><td>{part.company}</td></tr>
                        ))}
                        {!catalogLoading && filteredCatalogParts.length === 0 && <tr><td colSpan="3">No matching parts found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {selectedCatalogPart && (
                    <div className="catalog-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedCatalogPart(null); }}>
                      <section className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
                        <header className="catalog-modal-header">
                          <div><h2 id="catalog-modal-title">{catalogEditMode ? "Edit Part" : "Part Details"}</h2><p>Material catalogue record</p></div>
                          <button className="icon-btn" type="button" onClick={() => setSelectedCatalogPart(null)} aria-label="Close"><X size={18} /></button>
                        </header>
                        {catalogEditMode ? (
                          <form className="catalog-detail-form" onSubmit={saveCatalogPart}>
                            <label>Material Code<input required value={catalogEditForm.materialCode} onChange={e => setCatalogEditForm({ ...catalogEditForm, materialCode: e.target.value })} /></label>
                            <label>Material Name<input required value={catalogEditForm.materialName} onChange={e => setCatalogEditForm({ ...catalogEditForm, materialName: e.target.value })} /></label>
                            <label>Company<input required value={catalogEditForm.company} onChange={e => setCatalogEditForm({ ...catalogEditForm, company: e.target.value })} /></label>
                            <div className="catalog-modal-actions">
                              <button className="btn" type="button" onClick={() => { setCatalogEditMode(false); setCatalogEditForm(selectedCatalogPart); }}>Cancel</button>
                              <button className="btn primary" type="submit" disabled={catalogPartBusy}>{catalogPartBusy ? "Saving…" : "Save Changes"}</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <dl className="catalog-detail-list">
                              <div><dt>Material Code</dt><dd><code>{selectedCatalogPart.materialCode}</code></dd></div>
                              <div><dt>Material Name</dt><dd>{selectedCatalogPart.materialName}</dd></div>
                              <div><dt>Company</dt><dd>{selectedCatalogPart.company}</dd></div>
                            </dl>
                            <footer className="catalog-modal-actions">
                              <button className="btn danger" type="button" onClick={deleteCatalogPart} disabled={catalogPartBusy}><Trash2 size={16} /> Delete</button>
                              <span />
                              <button className="btn" type="button" onClick={() => setSelectedCatalogPart(null)}>Close</button>
                              <button className="btn primary" type="button" onClick={() => setCatalogEditMode(true)}><Wrench size={16} /> Edit</button>
                            </footer>
                          </>
                        )}
                      </section>
                    </div>
                  )}
                  <div className="catalog-footnote">Showing {Math.min(filteredCatalogParts.length, 500).toLocaleString()} of {filteredCatalogParts.length.toLocaleString()} matching records.</div>
                </section>
              )}

              {page === "Detail Search" && (
                <section className="panel">
                  <PanelHeader
                    title="Detail Search"
                    subtitle="Search, view and update equipment and maintenance records"
                  />

                  <div className="toolbar">
                    <div className="searchbox" style={{ flex: 1 }}>
                      <Search size={18} />

                      <input
                        placeholder="Enter vehicle number, technical object, job card, MO, MR, PR, PO, material code..."
                        value={detailSearch}
                        onChange={(e) => setDetailSearch(e.target.value)}
                      />

                      {detailSearch && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetailSearch("")}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <span className="result-count">
                      {detailQuery
                        ? `${detailEquipmentResults.length} equipment · ${detailJobResults.length} job cards`
                        : "Type to search"}
                    </span>
                  </div>

                  {!detailQuery ? (
                    <EmptyState
                      title="Start typing to search"
                      body="Search across equipment, job cards, gatepasses, MO / MR / STPO, PR / PO, material codes, problems and remarks."
                    />
                  ) : (
                    <>
                      <div className="table-heading">
                        <b>Equipment</b>
                        <span>{detailEquipmentResults.length} matching</span>
                      </div>
                      <EquipmentTable
                        rows={detailEquipmentResults}
                        jobs={jobs}
                        onViewHistory={setHistoryEquipment}
                        onSelectEquipment={(item) => {
                          setSelectedEquipment(item);
                          setEquipmentEditForm({ ...blankEquipment, ...item });
                          setEquipmentEditMode(false);
                        }}
                        onNewInward={(equipmentId) => {
                          setInwardForm({ ...blankInward, equipmentId, inDateTime: localDateTime() });
                          setPage("Inward Entry");
                        }}
                      />

                      <div className="table-heading">
                        <b>Job cards</b>
                        <span>{detailJobResults.length} matching</span>
                      </div>
                      <JobsTable
                        rows={detailJobResults}
                        setJobEdit={setJobEdit}
                        setCompletion={setCompletion}
                        setExitForm={setExitForm}
                      />
                    </>
                  )}
                </section>
              )}

              {page === "Dashboard" && (
                <Dashboard
                  summary={summary}
                  jobs={jobs}
                  setPage={setPage}
                  setJobEdit={setJobEdit}
                  setCompletion={setCompletion}
                  setExitForm={setExitForm}
                />
              )}

              {page === "Equipment Master" && (
                <section className="panel">
                  <PanelHeader
                    title="Equipment master"
                    subtitle="Permanent equipment register and technical object mapping"
                    action={
                      <button className="btn primary" onClick={() => setEquipmentModal(true)}>
                        <Plus size={16} /> Add equipment
                      </button>
                    }
                  />
                  <div className="toolbar">
                    <div className="searchbox">
                      <Search size={17} />
                      <input
                        placeholder="Search technical object, vehicle, model..."
                        value={equipmentSearch}
                        onChange={(e) => setEquipmentSearch(e.target.value)}
                      />
                    </div>
                    <span className="result-count">{filteredEquipment.length} records</span>
                  </div>
                  <EquipmentTable
                    rows={filteredEquipment}
                    jobs={jobs}
                    onViewHistory={setHistoryEquipment}
                    onSelectEquipment={(item) => { setSelectedEquipment(item); setEquipmentEditForm({ ...blankEquipment, ...item }); setEquipmentEditMode(false); }}
                    onNewInward={(equipmentId) => {
                      setInwardForm({ ...blankInward, equipmentId, inDateTime: localDateTime() });
                      setPage("Inward Entry");
                    }}
                  />
                </section>
              )}

              {page === "Inward Entry" && (
                <div className="two-col">
                  <section className="panel">
                    <PanelHeader
                      title="New yard inward"
                      subtitle="Register a new visit for an existing vehicle and create a separate job card"
                    />
                    <form className="form-grid" onSubmit={saveInward}>
                      <Field label="Equipment / technical object" required wide>
                        <SearchableEquipmentSelect
                          equipment={equipment}
                          jobs={jobs}
                          selectedId={inwardForm.equipmentId}
                          onSelect={(id) => setInwardForm({ ...inwardForm, equipmentId: id })}
                        />
                        <small className="muted" style={{ display: "block", marginTop: "4px" }}>
                          Search by technical object number or vehicle registration. Click a record from the dropdown to select it.
                        </small>
                      </Field>
                      <Field label="Inward gatepass number" required>
                        <input
                          required
                          value={inwardForm.gatepassNumber}
                          onChange={(e) => setInwardForm({ ...inwardForm, gatepassNumber: e.target.value })}
                          placeholder="e.g. GP-2026-001"
                        />
                      </Field>
                      <Field label="Inward date & time" required>
                        <input
                          type="datetime-local"
                          required
                          value={inwardForm.inDateTime}
                          onChange={(e) => setInwardForm({ ...inwardForm, inDateTime: e.target.value })}
                        />
                      </Field>
                      <Field label="Expected out date">
                        <input
                          type="date"
                          value={inwardForm.expectedOutDate}
                          onChange={(e) => setInwardForm({ ...inwardForm, expectedOutDate: e.target.value })}
                        />
                      </Field>
                      <Field label="Complaint / reported problem" wide>
                        <textarea
                          rows="3"
                          value={inwardForm.complaint}
                          onChange={(e) => setInwardForm({ ...inwardForm, complaint: e.target.value })}
                          placeholder="Describe the problem reported at arrival"
                        />
                      </Field>
                      <Field label="Entered by">
                        <input
                          value={inwardForm.enteredBy}
                          onChange={(e) => setInwardForm({ ...inwardForm, enteredBy: e.target.value })}
                          placeholder="Name of yard staff"
                        />
                      </Field>
                      <Field label="Initial remarks">
                        <input
                          value={inwardForm.remarks}
                          onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                        />
                      </Field>
                      <div className="form-footer">
                        <span className="muted small">A job card is created automatically after saving.</span>
                        <button className="btn primary" type="submit"><Plus size={16} /> Save inward & create job</button>
                      </div>
                    </form>
                  </section>
                  <section className="panel side-panel">
                    <div className="side-icon"><DoorOpen size={22} /></div>
                    <h3>Before registering an inward</h3>
                    <ul className="check-list">
                      <li>Confirm the technical object exists in Equipment Master.</li>
                      <li>Enter the gatepass number exactly as issued.</li>
                      <li>Record the actual arrival date and time.</li>
                      <li>Add the complaint so the mechanic can see it on the job card.</li>
                    </ul>
                    <div className="info-callout">
                      <Activity size={17} />
                      <span>The same machine cannot have two active yard entries. Record its exit before registering a new visit.</span>
                    </div>
                    <button className="btn secondary full" onClick={() => setPage("Equipment Master")}>
                      Open equipment master
                    </button>
                  </section>
                </div>
              )}

              {page === "Job Cards" && (
                <section className="panel">
                  <PanelHeader
                    title="Maintenance job cards"
                    subtitle="Track problems, actions taken, parts lots, mechanics and SAP maintenance orders"
                  />
                  <div className="toolbar">
                    <div className="searchbox">
                      <Search size={17} />
                      <input
                        placeholder="Search job card, technical object, PR, PO, material code, SAP order..."
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                      />
                    </div>
                    <span className="result-count">{filteredJobs.length} records</span>
                  </div>
                  <JobsTable
                    rows={filteredJobs}
                    setJobEdit={setJobEdit}
                    setCompletion={setCompletion}
                    setExitForm={setExitForm}
                  />
                </section>
              )}

              {page === "Reports & MIS" && (
                <section className="panel">
                  <PanelHeader
                    title="Reports & MIS"
                    subtitle="Filter yard records and export a formatted Excel workbook"
                    action={
                      <button className="btn primary" onClick={() => exportReport()}>
                        <ArrowDownToLine size={16} /> Export Excel
                      </button>
                    }
                  />
                  <div className="report-types">
                    {[
                      ["inside", "Inside yard"],
                      ["inward", "Inward register"],
                      ["pending", "Pending jobs"],
                      ["completed", "Completed jobs"],
                      ["exited", "Exit register"],
                      ["all", "Combined MIS"]
                    ].map(([key, label]) => (
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
                    <Field label="From date">
                      <input type="date" value={report.from} onChange={(e) => setReport({ ...report, from: e.target.value })} />
                    </Field>
                    <Field label="To date">
                      <input type="date" value={report.to} onChange={(e) => setReport({ ...report, to: e.target.value })} />
                    </Field>
                    <Field label="Equipment type">
                      <select value={report.type} onChange={(e) => setReport({ ...report, type: e.target.value })}>
                        <option value="all">All equipment</option>
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Job status">
                      <select value={report.status} onChange={(e) => setReport({ ...report, status: e.target.value })}>
                        <option value="all">All statuses</option>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Search records" wide>
                      <div className="searchbox">
                        <Search size={17} />
                        <input
                          placeholder="Technical object, vehicle, gatepass, SAP order, PR or PO"
                          value={report.q}
                          onChange={(e) => setReport({ ...report, q: e.target.value })}
                        />
                      </div>
                    </Field>
                  </div>
                  <div className="report-summary">
                    <div><span>Matching records</span><b>{reportRows.length}</b></div>
                    <div><span>In progress</span><b>{reportRows.filter((j) => j.status === "In Progress").length}</b></div>
                    <div><span>Waiting for parts</span><b>{reportRows.filter((j) => j.status === "Waiting for Parts").length}</b></div>
                    <div><span>Completed / exited</span><b>{reportRows.filter((j) => ["Completed", "Exited"].includes(j.status)).length}</b></div>
                  </div>
                  <div className="table-heading">
                    <b>
                      {({
                        inside: "Vehicles currently inside the yard",
                        inward: "Inward register",
                        pending: "Pending maintenance jobs",
                        completed: "Completed maintenance jobs",
                        exited: "Vehicle exit register",
                        all: "Combined vehicle and job MIS"
                      })[report.kind]}
                    </b>
                    <span>{reportRows.length} matching job records</span>
                  </div>
                  <JobsTable
                    rows={reportRows}
                    setJobEdit={setJobEdit}
                    setCompletion={setCompletion}
                    setExitForm={setExitForm}
                  />
                  <div className="export-footer">
                    <span className="muted small">Excel export uses the selected report and filters.</span>
                    <button className="btn secondary" onClick={() => exportReport()}>
                      <FileSpreadsheet size={16} /> Download .xlsx
                    </button>
                  </div>
                </section>
              )}

              {page === "Data Management" && (
                <div className="data-management-page">
                  <section className="panel">
                    <PanelHeader
                      title="Delete vehicle records"
                      subtitle="Search equipment and delete a vehicle with its maintenance history"
                    />

                    <div className="danger-callout">
                      <AlertTriangle size={18} />
                      <span>
                        <b>Permanent deletion:</b> deleting a vehicle removes its associated job cards and inward records. Export any records you need before continuing.
                      </span>
                    </div>

                    <div className="toolbar">
                      <div className="searchbox">
                        <Search size={17} />
                        <input
                          placeholder="Search technical object, vehicle, make or model..."
                          value={deleteSearch}
                          onChange={(e) => setDeleteSearch(e.target.value)}
                        />
                      </div>

                      <span className="result-count">
                        {equipment.filter((item) =>
                          !deleteSearch.trim() ||
                          [item.technicalObjectNumber, item.vehicleNumber, item.equipmentName, item.equipmentType, item.make, item.model]
                            .some((value) => String(value || "").toLowerCase().includes(deleteSearch.toLowerCase().trim()))
                        ).length} vehicles
                      </span>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Technical object</th>
                            <th>Vehicle / equipment</th>
                            <th>Job cards</th>
                            <th>Current status</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {equipment
                            .filter((item) =>
                              !deleteSearch.trim() ||
                              [item.technicalObjectNumber, item.vehicleNumber, item.equipmentName, item.equipmentType, item.make, item.model]
                                .some((value) => String(value || "").toLowerCase().includes(deleteSearch.toLowerCase().trim()))
                            )
                            .map((item) => {
                              const linkedJobs = jobs.filter(
                                (job) =>
                                  job.equipment === item._id ||
                                  job.equipment?._id === item._id ||
                                  job.technicalObjectNumber === item.technicalObjectNumber
                              );
                              const active = linkedJobs.some((job) => job.status !== "Exited");

                              return (
                                <tr key={item._id}>
                                  <td>
                                    <b className="mono">{item.technicalObjectNumber}</b>
                                  </td>
                                  <td>
                                    {item.vehicleNumber || item.equipmentName || item.equipmentType}
                                    <small className="cell-sub">
                                      {[item.make, item.model].filter(Boolean).join(" · ")}
                                    </small>
                                  </td>
                                  <td>{linkedJobs.length}</td>
                                  <td>
                                    <StatusBadge status={active ? "In Progress" : "Exited"} />
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn tiny danger"
                                      disabled={deletingKey === `equipment-${item._id}`}
                                      onClick={() => deleteEquipmentRecord(item)}
                                    >
                                      <Trash2 size={14} />
                                      {deletingKey === `equipment-${item._id}` ? "Deleting..." : "Delete vehicle + history"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                          {equipment.filter((item) =>
                            !deleteSearch.trim() ||
                            [item.technicalObjectNumber, item.vehicleNumber, item.equipmentName, item.equipmentType, item.make, item.model]
                              .some((value) => String(value || "").toLowerCase().includes(deleteSearch.toLowerCase().trim()))
                          ).length === 0 && (
                              <tr>
                                <td colSpan={5}>No matching vehicles found.</td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="panel">
                    <PanelHeader
                      title="Delete an individual job card"
                      subtitle="Delete one visit while retaining the vehicle master record"
                    />

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Job card</th>
                            <th>Technical object</th>
                            <th>Inward date / gatepass</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {jobs
                            .filter((job) =>
                              !deleteSearch.trim() ||
                              [
                                job.jobCardNumber,
                                job.technicalObjectNumber,
                                job.vehicleNumber,
                                job.inwardGatepassNumber,
                                job.sapMaintenanceOrderNumber,
                                job.maintenanceOrderNumber,
                                job.mrNumber,
                                job.stpoNumber
                              ].some((value) => String(value || "").toLowerCase().includes(deleteSearch.toLowerCase().trim()))
                            )
                            .map((job) => (
                              <tr key={job._id}>
                                <td>
                                  <b className="mono">{job.jobCardNumber}</b>
                                </td>
                                <td>
                                  {job.technicalObjectNumber}
                                  <small className="cell-sub">{job.vehicleNumber || job.equipmentType}</small>
                                </td>
                                <td>
                                  {dateText(job.inDateTime)}
                                  <small className="cell-sub">GP: {job.inwardGatepassNumber || "—"}</small>
                                </td>
                                <td>
                                  <StatusBadge status={job.status} />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn tiny danger"
                                    disabled={deletingKey === `job-${job._id}`}
                                    onClick={() => deleteJobRecord(job)}
                                  >
                                    <Trash2 size={14} />
                                    {deletingKey === `job-${job._id}` ? "Deleting..." : "Delete visit"}
                                  </button>
                                </td>
                              </tr>
                            ))}

                          {jobs.filter((job) =>
                            !deleteSearch.trim() ||
                            [
                              job.jobCardNumber,
                              job.technicalObjectNumber,
                              job.vehicleNumber,
                              job.inwardGatepassNumber,
                              job.sapMaintenanceOrderNumber,
                              job.maintenanceOrderNumber,
                              job.mrNumber,
                              job.stpoNumber
                            ].some((value) => String(value || "").toLowerCase().includes(deleteSearch.toLowerCase().trim()))
                          ).length === 0 && (
                              <tr>
                                <td colSpan={5}>No matching job cards found.</td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}
            </div>
            <footer className="app-footer">
              <span>YardCare <i>•</i> Equipment Maintenance MIS</span>
              <span>Local workspace <i>•</i> Admin access</span>
            </footer>
          </main>
        </>
      )}

      {selectedEquipment && (
        <Modal
          title={equipmentEditMode ? "Edit equipment details" : "Equipment details"}
          subtitle={`${selectedEquipment.technicalObjectNumber} · ${selectedEquipment.vehicleNumber || selectedEquipment.equipmentName || selectedEquipment.equipmentType}`}
          close={() => { setSelectedEquipment(null); setEquipmentEditMode(false); }}
        >
          {equipmentEditMode ? (
            <form className="form-grid" onSubmit={saveEquipmentEdit}>
              <Field label="Technical object number"><input value={equipmentEditForm.technicalObjectNumber || ""} disabled /></Field>
              <Field label="Vehicle / machine number"><input value={equipmentEditForm.vehicleNumber || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, vehicleNumber: e.target.value })} /></Field>
              <Field label="Equipment type" required><select required value={equipmentEditForm.equipmentType || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, equipmentType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Equipment name"><input value={equipmentEditForm.equipmentName || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, equipmentName: e.target.value })} /></Field>
              <Field label="Make"><select value={equipmentEditForm.make || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, make: e.target.value })}><option value="">Select make</option>{MAKES.map((make) => <option key={make}>{make}</option>)}</select></Field>
              <Field label="Model"><input value={equipmentEditForm.model || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, model: e.target.value })} /></Field>
              <Field label="Gatepass number">
                <input
                  value={equipmentEditForm.gatepassNumber || ""}
                  onChange={(e) =>
                    setEquipmentEditForm({
                      ...equipmentEditForm,
                      gatepassNumber: e.target.value
                    })
                  }
                  placeholder="Enter gatepass number"
                />
              </Field>
              <Field label="In date">
                <input
                  type="datetime-local"
                  value={
                    equipmentEditForm.inDate
                      ? new Date(equipmentEditForm.inDate)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setEquipmentEditForm({
                      ...equipmentEditForm,
                      inDate: e.target.value
                    })
                  }
                />
              </Field>
              <Field label="Remarks" wide><textarea rows="3" value={equipmentEditForm.remarks || ""} onChange={(e) => setEquipmentEditForm({ ...equipmentEditForm, remarks: e.target.value })} /></Field>
              <div className="form-footer"><button type="button" className="btn secondary" onClick={() => setEquipmentEditMode(false)}>Cancel</button><button type="submit" className="btn primary" disabled={equipmentEditBusy}>{equipmentEditBusy ? "Saving…" : "Save changes"}</button></div>
            </form>
          ) : (
            <div className="equipment-details">
              <div className="details-grid">
                {[ ["Technical object number", selectedEquipment.technicalObjectNumber], ["Vehicle / machine number", selectedEquipment.vehicleNumber], ["Equipment name", selectedEquipment.equipmentName], ["Equipment type", selectedEquipment.equipmentType], ["Make", selectedEquipment.make], ["Model", selectedEquipment.model], ["Gatepass number", selectedEquipment.gatepassNumber], ["In date", selectedEquipment.inDate ? dateText(selectedEquipment.inDate) : ""], ["Remarks", selectedEquipment.remarks], ["Created", selectedEquipment.createdAt ? new Date(selectedEquipment.createdAt).toLocaleString() : ""] ].map(([label, value]) => <div className="detail-item" key={label}><span>{label}</span><b>{value || "—"}</b></div>)}
              </div>
              <div className="form-footer"><button className="btn primary" onClick={() => { setEquipmentEditForm({ ...blankEquipment, ...selectedEquipment }); setEquipmentEditMode(true); }}>Edit details</button></div>
            </div>
          )}
        </Modal>
      )}

      {equipmentModal && (
        <Modal title="Add equipment" subtitle="Create a permanent vehicle / equipment record" close={() => setEquipmentModal(false)}>
          <form className="form-grid" onSubmit={saveEquipment}>
            <Field label="Technical object number" required>
              <input
                required
                value={equipmentForm.technicalObjectNumber}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, technicalObjectNumber: e.target.value })}
                placeholder="e.g. 100003465"
              />
            </Field>
            <Field label="Vehicle / machine number">
              <input
                value={equipmentForm.vehicleNumber}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, vehicleNumber: e.target.value })}
                placeholder="Registration or fleet number"
              />
            </Field>
            <Field label="Equipment type" required>
              <select
                required
                value={equipmentForm.equipmentType}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, equipmentType: e.target.value })}
              >
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Equipment name">
              <input
                value={equipmentForm.equipmentName}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, equipmentName: e.target.value })}
                placeholder="e.g. Yard Hydra 01"
              />
            </Field>
            <Field label="Make">
              <select
                value={equipmentForm.make}
                onChange={(e) =>
                  setEquipmentForm({ ...equipmentForm, make: e.target.value })
                }
              >
                <option value="">Select make</option>
                {MAKES.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <input
                value={equipmentForm.model}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                placeholder="Select or type model"
              />
            </Field>
            <Field label="Remarks" wide>
              <textarea
                rows="2"
                value={equipmentForm.remarks}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, remarks: e.target.value })}
              />
            </Field>
            <div className="form-footer">
              <button type="button" className="btn secondary" onClick={() => setEquipmentModal(false)}>Cancel</button>
              <button className="btn primary" type="submit">Save equipment</button>
            </div>
          </form>
        </Modal>
      )}

      {historyEquipment && (
        <Modal
          title={`Vehicle history · ${historyEquipment.technicalObjectNumber}`}
          subtitle={`${historyEquipment.vehicleNumber || historyEquipment.equipmentName || historyEquipment.equipmentType} · ${[historyEquipment.make, historyEquipment.model].filter(Boolean).join(" ") || "Equipment history"}`}
          close={() => setHistoryEquipment(null)}
        >
          {(() => {
            const visits = jobs
              .filter(
                (j) =>
                  j.equipment === historyEquipment._id ||
                  j.equipment?._id === historyEquipment._id ||
                  j.technicalObjectNumber === historyEquipment.technicalObjectNumber
              )
              .sort((a, b) => new Date(b.inDateTime) - new Date(a.inDateTime));
            const active = visits.some((j) => j.status !== "Exited");
            return (
              <div className="history-modal-content">
                <div className="history-summary">
                  <div><span>Total visits</span><b>{visits.length}</b></div>
                  <div><span>Currently inside</span><b>{active ? "Yes" : "No"}</b></div>
                  <div><span>Exited visits</span><b>{visits.filter((j) => j.status === "Exited").length}</b></div>
                </div>
                {visits.length === 0 ? (
                  <EmptyState title="No maintenance history yet" body="This vehicle has not had any recorded inward visits." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Visit / Job card</th>
                          <th>Inward date</th>
                          <th>Inward gatepass</th>
                          <th>Problem</th>
                          <th>Exit date / pass</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((j, i) => (
                          <tr key={j._id}>
                            <td>
                              <b className="mono">{j.jobCardNumber}</b>
                              <small className="cell-sub">Visit {visits.length - i}</small>
                            </td>
                            <td>{dateText(j.inDateTime)}</td>
                            <td>{j.inwardGatepassNumber || "—"}</td>
                            <td>{j.problems || "—"}</td>
                            <td>
                              {j.exitDateTime ? dateText(j.exitDateTime) : "—"}
                              <small className="cell-sub">{j.exitGatepassNumber ? `Pass: ${j.exitGatepassNumber}` : ""}</small>
                            </td>
                            <td><StatusBadge status={j.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="form-footer">
                  <button className="btn secondary" onClick={() => setHistoryEquipment(null)}>Close</button>
                  {!active && (
                    <button
                      className="btn primary"
                      onClick={() => {
                        setInwardForm({ ...blankInward, equipmentId: historyEquipment._id, inDateTime: localDateTime() });
                        setHistoryEquipment(null);
                        setPage("Inward Entry");
                      }}
                    >
                      Register return visit
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {jobEdit && (
        <Modal
          title={`Edit job card · ${jobEdit.jobCardNumber}`}
          subtitle={`${jobEdit.technicalObjectNumber} · ${jobEdit.vehicleNumber || jobEdit.equipmentType}`}
          close={() => setJobEdit(null)}
        >
          <form className="form-grid" onSubmit={saveJob}>
            <Field label="Expected out date">
              <input
                type="date"
                value={jobEdit.expectedOutDate ? new Date(jobEdit.expectedOutDate).toISOString().slice(0, 10) : ""}
                onChange={(e) =>
                  setJobEdit({
                    ...jobEdit,
                    expectedOutDate: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null
                  })
                }
              />
            </Field>

            <Field label="Mechanic(s) assigned" wide>
              <input
                value={jobEdit.mechanicNames || ""}
                onChange={(e) => setJobEdit({ ...jobEdit, mechanicNames: e.target.value })}
                placeholder="Names of assigned mechanics"
              />
            </Field>

            <Field label="Maintenance Order (MO) Number">
              <input
                value={jobEdit.maintenanceOrderNumber || ""}
                onChange={(e) =>
                  setJobEdit({
                    ...jobEdit,
                    maintenanceOrderNumber: e.target.value
                  })
                }
                placeholder="Enter MO number"
              />
            </Field>

            <Field label="MO Date">
              <input
                type="date"
                value={
                  jobEdit.maintenanceOrderDate
                    ? new Date(jobEdit.maintenanceOrderDate).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setJobEdit({
                    ...jobEdit,
                    maintenanceOrderDate: e.target.value
                      ? new Date(`${e.target.value}T12:00:00`).toISOString()
                      : null
                  })
                }
              />
            </Field>

            <Field label="MR Number">
              <input
                value={jobEdit.mrNumber || ""}
                onChange={(e) =>
                  setJobEdit({ ...jobEdit, mrNumber: e.target.value })
                }
                placeholder="Enter MR number"
              />
            </Field>

            <Field label="MR Date">
              <input
                type="date"
                value={
                  jobEdit.mrDate
                    ? new Date(jobEdit.mrDate).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setJobEdit({
                    ...jobEdit,
                    mrDate: e.target.value
                      ? new Date(`${e.target.value}T12:00:00`).toISOString()
                      : null
                  })
                }
              />
            </Field>

            <Field label="STPO Number">
              <input
                value={jobEdit.stpoNumber || ""}
                onChange={(e) =>
                  setJobEdit({ ...jobEdit, stpoNumber: e.target.value })
                }
                placeholder="Enter STPO number"
              />
            </Field>

            <Field label="STPO Date">
              <input
                type="date"
                value={
                  jobEdit.stpoDate
                    ? new Date(jobEdit.stpoDate).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setJobEdit({
                    ...jobEdit,
                    stpoDate: e.target.value
                      ? new Date(`${e.target.value}T12:00:00`).toISOString()
                      : null
                  })
                }
              />
            </Field>

            <div className="full-width order-section">
              <div className="parts-heading">
                <div>
                  <h3>Parts Procurement Lots</h3>
                  <p>Each lot has one common PR number and one common PO number.</p>
                </div>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setJobEdit({
                      ...jobEdit,
                      partsLots: [
                        ...(jobEdit.partsLots || []),
                        {
                          lotName: `Lot ${(jobEdit.partsLots || []).length + 1}`,
                          prNumber: "",
                          prDate: "",
                          poNumber: "",
                          poDate: "",
                          parts: [
                            {
                              materialCode: "",
                              partName: "",
                              shortText: "",
                              quantityRequested: 0,
                              quantityOrdered: 0
                            }
                          ]
                        }
                      ]
                    })
                  }
                >
                  <Plus size={16} /> Add Parts Lot
                </button>
              </div>

              {(jobEdit.partsLots || []).map((lot, lotIndex) => (
                <div className="part-card" key={lot._id || lotIndex}>
                  <div className="part-card-heading">
                    <h4>{lot.lotName || `Lot ${lotIndex + 1}`}</h4>

                    <button
                      type="button"
                      className="btn tiny danger"
                      onClick={() =>
                        setJobEdit({
                          ...jobEdit,
                          partsLots: jobEdit.partsLots.filter(
                            (_, index) => index !== lotIndex
                          )
                        })
                      }
                    >
                      <X size={15} /> Remove Lot
                    </button>
                  </div>

                  <div className="form-grid">
                    <Field label="Lot Name">
                      <input
                        value={lot.lotName || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex ? { ...l, lotName: val } : l
                            )
                          }));
                        }}
                        placeholder="Example: Lot 1"
                      />
                    </Field>

                    <Field label="PR Number (Common for this lot)">
                      <input
                        value={lot.prNumber || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex ? { ...l, prNumber: val } : l
                            )
                          }));
                        }}
                        placeholder="Enter PR number"
                      />
                    </Field>

                    <Field label="PR Date">
                      <input
                        type="date"
                        value={lot.prDate ? new Date(lot.prDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => {
                          const val = e.target.value
                            ? new Date(`${e.target.value}T12:00:00`).toISOString()
                            : null;
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex ? { ...l, prDate: val } : l
                            )
                          }));
                        }}
                      />
                    </Field>

                    <Field label="PO Number (Common for this lot)">
                      <input
                        value={lot.poNumber || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex ? { ...l, poNumber: val } : l
                            )
                          }));
                        }}
                        placeholder="Enter PO number"
                      />
                    </Field>

                    <Field label="PO Date">
                      <input
                        type="date"
                        value={lot.poDate ? new Date(lot.poDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => {
                          const val = e.target.value
                            ? new Date(`${e.target.value}T12:00:00`).toISOString()
                            : null;
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex ? { ...l, poDate: val } : l
                            )
                          }));
                        }}
                      />
                    </Field>
                  </div>

                  <div className="bulk-parts-entry">
                    <div className="parts-heading">
                      <div>
                        <h4>Bulk Parts Entry · Notepad</h4>
                        <p>Paste one part per line. Separate Material Code and Part Name with a TAB, |, comma, or at least two spaces.</p>
                      </div>
                      <button
                        type="button"
                        className="btn tiny secondary"
                        onClick={() => {
                          const parsed = parseBulkParts(lot.bulkPartsText);
                          if (!parsed.length) {
                            window.alert("No valid parts found. Enter each line as Material Code followed by Part Name.");
                            return;
                          }
                          setJobEdit((prev) => ({
                            ...prev,
                            partsLots: prev.partsLots.map((l, i) =>
                              i === lotIndex
                                ? {
                                  ...l,
                                  parts: [...(l.parts || []), ...parsed],
                                  bulkPartsText: ""
                                }
                                : l
                            )
                          }));
                        }}
                      >
                        <Plus size={14} /> Add all lines to this lot
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={lot.bulkPartsText || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobEdit((prev) => ({
                          ...prev,
                          partsLots: prev.partsLots.map((l, i) =>
                            i === lotIndex ? { ...l, bulkPartsText: val } : l
                          )
                        }));
                      }}
                      placeholder={"Material Code    Part Name\n1101AAA02020N    TIE ROD ASSEMBLY\n1103AAA01311N    DRAGLINK ASSEMBLY\n7603AAC00080N    KINGPIN"}
                      style={{ width: "100%", minHeight: 130, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }}
                    />
                    <small>{parseBulkParts(lot.bulkPartsText).length} valid part line(s) detected. Parts will share this lot's PR and PO numbers.</small>
                  </div>

                  <div className="parts-heading">
                    <h4>Parts in this lot</h4>

                    <button
                      type="button"
                      className="btn tiny secondary"
                      onClick={() => {
                        setJobEdit((prev) => ({
                          ...prev,
                          partsLots: prev.partsLots.map((l, i) =>
                            i === lotIndex
                              ? {
                                ...l,
                                parts: [
                                  ...(l.parts || []),
                                  {
                                    materialCode: "",
                                    partName: "",
                                    shortText: "",
                                    quantityRequested: 0,
                                    quantityOrdered: 0
                                  }
                                ]
                              }
                              : l
                          )
                        }));
                      }}
                    >
                      <Plus size={14} /> Add Part
                    </button>
                  </div>

                  {(lot.parts || []).map((part, partIndex) => (
                    <div className="part-row" key={part._id || partIndex}>
                      <div className="part-row-title">
                        <b>Part {partIndex + 1}</b>

                        <button
                          type="button"
                          className="icon-btn"
                          title="Remove part"
                          onClick={() => {
                            setJobEdit((prev) => ({
                              ...prev,
                              partsLots: prev.partsLots.map((l, i) =>
                                i === lotIndex
                                  ? {
                                    ...l,
                                    parts: l.parts.filter((_, idx) => idx !== partIndex)
                                  }
                                  : l
                              )
                            }));
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="form-grid">
                        <Field label="Material Code">
                          <input
                            value={part.materialCode || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJobEdit((prev) => ({
                                ...prev,
                                partsLots: prev.partsLots.map((l, i) =>
                                  i === lotIndex
                                    ? {
                                      ...l,
                                      parts: l.parts.map((p, pi) =>
                                        pi === partIndex ? { ...p, materialCode: val } : p
                                      )
                                    }
                                    : l
                                )
                              }));
                            }}
                          />
                        </Field>

                        <Field label="Part Name">
                          <input
                            value={part.partName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJobEdit((prev) => ({
                                ...prev,
                                partsLots: prev.partsLots.map((l, i) =>
                                  i === lotIndex
                                    ? {
                                      ...l,
                                      parts: l.parts.map((p, pi) =>
                                        pi === partIndex ? { ...p, partName: val } : p
                                      )
                                    }
                                    : l
                                )
                              }));
                            }}
                          />
                        </Field>

                        <Field label="Short Text" wide>
                          <input
                            value={part.shortText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJobEdit((prev) => ({
                                ...prev,
                                partsLots: prev.partsLots.map((l, i) =>
                                  i === lotIndex
                                    ? {
                                      ...l,
                                      parts: l.parts.map((p, pi) =>
                                        pi === partIndex ? { ...p, shortText: val } : p
                                      )
                                    }
                                    : l
                                )
                              }));
                            }}
                          />
                        </Field>

                        <Field label="Quantity Requested">
                          <input
                            type="number"
                            min="0"
                            value={part.quantityRequested ?? 0}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setJobEdit((prev) => ({
                                ...prev,
                                partsLots: prev.partsLots.map((l, i) =>
                                  i === lotIndex
                                    ? {
                                      ...l,
                                      parts: l.parts.map((p, pi) =>
                                        pi === partIndex ? { ...p, quantityRequested: val } : p
                                      )
                                    }
                                    : l
                                )
                              }));
                            }}
                          />
                        </Field>

                        <Field label="Quantity Ordered">
                          <input
                            type="number"
                            min="0"
                            value={part.quantityOrdered ?? 0}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setJobEdit((prev) => ({
                                ...prev,
                                partsLots: prev.partsLots.map((l, i) =>
                                  i === lotIndex
                                    ? {
                                      ...l,
                                      parts: l.parts.map((p, pi) =>
                                        pi === partIndex ? { ...p, quantityOrdered: val } : p
                                      )
                                    }
                                    : l
                                )
                              }));
                            }}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {(!jobEdit.partsLots || jobEdit.partsLots.length === 0) && (
                <p className="parts-empty">
                  No parts lots added. Click Add Parts Lot to begin.
                </p>
              )}
            </div>

            <Field label="Problem / complaint" wide>
              <textarea
                rows="2"
                value={jobEdit.problems || ""}
                onChange={(e) => setJobEdit({ ...jobEdit, problems: e.target.value })}
              />
            </Field>

            <Field label="Action taken" wide>
              <textarea
                rows="3"
                value={jobEdit.actionTaken || ""}
                onChange={(e) => setJobEdit({ ...jobEdit, actionTaken: e.target.value })}
              />
            </Field>

            <Field label="Status">
              <select
                value={jobEdit.status}
                onChange={(e) => setJobEdit({ ...jobEdit, status: e.target.value })}
              >
                {["In Progress", "Waiting for Parts"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Final remarks" wide>
              <textarea
                rows="2"
                value={jobEdit.finalRemarks || ""}
                onChange={(e) => setJobEdit({ ...jobEdit, finalRemarks: e.target.value })}
              />
            </Field>

            <div className="form-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setJobEdit(null)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit">
                Save job card
              </button>
            </div>
          </form>
        </Modal>
      )}

      {completion && (
        <Modal
          title={`Complete job · ${completion.jobCardNumber}`}
          subtitle="This records maintenance completion; it does not record vehicle exit."
          close={() => setCompletion(null)}
        >
          <form className="form-grid" onSubmit={completeJob}>
            <Field label="Job completed date & time" required>
              <input
                type="datetime-local"
                required
                value={completion.jobCompletedDateTime}
                onChange={(e) => setCompletion({ ...completion, jobCompletedDateTime: e.target.value })}
              />
            </Field>
            <Field label="Mechanic name" required>
              <input
                required
                value={completion.completedByMechanic}
                onChange={(e) => setCompletion({ ...completion, completedByMechanic: e.target.value })}
              />
            </Field>
            <Field label="Final remarks" wide>
              <textarea
                rows="3"
                value={completion.finalRemarks || ""}
                onChange={(e) => setCompletion({ ...completion, finalRemarks: e.target.value })}
              />
            </Field>
            <div className="form-footer">
              <button type="button" className="btn secondary" onClick={() => setCompletion(null)}>Cancel</button>
              <button className="btn primary" type="submit"><CheckCircle2 size={16} /> Mark completed</button>
            </div>
          </form>
        </Modal>
      )}

      {exitForm && (
        <Modal
          title={`Vehicle exit pass · ${exitForm.jobCardNumber}`}
          subtitle="Record the physical exit after the maintenance job is completed."
          close={() => setExitForm(null)}
        >
          <form className="form-grid" onSubmit={exitJob}>
            <Field label="Exit gatepass number" required>
              <input
                required
                value={exitForm.exitGatepassNumber}
                onChange={(e) => setExitForm({ ...exitForm, exitGatepassNumber: e.target.value })}
                placeholder="Enter exit pass number"
              />
            </Field>
            <Field label="Exit date & time" required>
              <input
                type="datetime-local"
                required
                value={exitForm.exitDateTime}
                onChange={(e) => setExitForm({ ...exitForm, exitDateTime: e.target.value })}
              />
            </Field>
            <Field label="Completed by mechanic"><input disabled value={exitForm.completedByMechanic || ""} /></Field>
            <Field label="Inward gatepass"><input disabled value={exitForm.inwardGatepassNumber || ""} /></Field>
            <div className="info-callout wide">
              <BadgeCheck size={17} />
              <span>Saving this pass changes the job status to Exited and removes the vehicle from the current yard register.</span>
            </div>
            <div className="form-footer">
              <button type="button" className="btn secondary" onClick={() => setExitForm(null)}>Cancel</button>
              <button className="btn primary" type="submit"><DoorOpen size={16} /> Record exit</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ShieldDot() {
  return <span className="shield-dot"><BadgeCheck size={15} /></span>;
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="panel-header">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {action}
    </div>
  );
}

function Field({ label, required, wide, children }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}{required && <i> *</i>}</span>
      {children}
    </label>
  );
}

function Modal({ title, subtitle, close, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
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

function StatCard({ label, value, detail, Icon, tone, warning }) {
  return (
    <div className={`stat-card ${warning ? "warning" : ""}`}>
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}</b>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = status === "Exited" ? "green" : status === "Completed" ? "blue" : status === "Waiting for Parts" ? "orange" : status === "In Progress" ? "purple" : "gray";
  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {status || "Unknown"}
    </span>
  );
}

function Dashboard({ summary, jobs, setPage, setJobEdit, setCompletion, setExitForm }) {
  const recent = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  const overdue = jobs.filter(
    (j) => j.expectedOutDate && new Date(j.expectedOutDate) < new Date() && !["Completed", "Exited"].includes(j.status)
  );
  const statusGroups = [
    { label: "In progress", count: jobs.filter((j) => ["In Progress", "In progress", "Open"].includes(j.status)).length, tone: "blue" },
    { label: "Awaiting parts", count: jobs.filter((j) => String(j.status || "").toLowerCase().includes("part")).length, tone: "orange" },
    { label: "Completed", count: jobs.filter((j) => ["Completed", "Exited"].includes(j.status)).length, tone: "green" },
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
        <button className="btn primary" onClick={() => setPage("Inward Entry")}>
          <Plus size={16} /> Register inward
        </button>
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
            <EmptyState
              title="No job cards yet"
              body="Register an inward entry to create the first job card."
              action={() => setPage("Inward Entry")}
            />
          ) : (
            <div className="recent-list">
              {recent.map((j) => (
                <div className="recent-row" key={j._id}>
                  <div className="recent-icon"><Wrench size={17} /></div>
                  <div className="recent-main">
                    <b>{j.jobCardNumber}</b>
                    <span>{j.technicalObjectNumber} · {j.vehicleNumber || j.equipmentType}</span>
                  </div>
                  <div className="recent-meta">
                    <StatusBadge status={j.status} />
                    <small>{dateOnly(j.inDateTime)}</small>
                  </div>
                  <button className="icon-btn" title="Edit job card" onClick={() => setJobEdit({ ...j })}>
                    <Settings2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHeader title="Quick actions" subtitle="Common yard workflows" />
          <div className="quick-actions">
            <button onClick={() => setPage("Equipment Master")}>
              <span className="quick-icon blue"><Truck /></span>
              <span><b>Add equipment</b><small>Register a technical object</small></span>
              <span className="quick-arrow">→</span>
            </button>
            <button onClick={() => setPage("Inward Entry")}>
              <span className="quick-icon teal"><DoorOpen /></span>
              <span><b>Vehicle inward</b><small>Gatepass and arrival details</small></span>
              <span className="quick-arrow">→</span>
            </button>
            <button onClick={() => setPage("Job Cards")}>
              <span className="quick-icon purple"><ClipboardList /></span>
              <span><b>Update job card</b><small>Mechanics, parts lots and SAP order</small></span>
              <span className="quick-arrow">→</span>
            </button>
            <button onClick={() => setPage("Reports & MIS")}>
              <span className="quick-icon orange"><FileSpreadsheet /></span>
              <span><b>Daily MIS report</b><small>Filter and export to Excel</small></span>
              <span className="quick-arrow">→</span>
            </button>
          </div>
        </section>
      </div>
      <div className="dashboard-grid bottom-grid">
        <section className="panel">
          <PanelHeader title="Overdue attention" subtitle="Open jobs past their expected out date" />
          {overdue.length === 0 ? (
            <div className="clear-state">
              <CheckCircle2 size={22} />
              <div>
                <b>No overdue jobs detected</b>
                <span>Jobs with a past expected date will appear here.</span>
              </div>
            </div>
          ) : (
            <div className="overdue-list">
              {overdue.slice(0, 5).map((j) => (
                <div key={j._id} className="overdue-row">
                  <AlertTriangle size={17} />
                  <div>
                    <b>{j.technicalObjectNumber} · {j.jobCardNumber}</b>
                    <span>Expected {dateOnly(j.expectedOutDate)} · {j.vehicleNumber || j.equipmentType}</span>
                  </div>
                  <button className="text-btn" onClick={() => setJobEdit({ ...j })}>Review</button>
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
            ].map(([n, t, d], i) => (
              <div className="workflow-step" key={n}>
                <span className={`workflow-num n${i}`}>{n}</span>
                <div><b>{t}</b><small>{d}</small></div>
                {i < 3 && <span className="workflow-line" />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Boxes /></div>
      <b>{title}</b>
      <p>{body}</p>
      {action && <button className="btn secondary" onClick={action}>Get started</button>}
    </div>
  );
}

function EquipmentTable({ rows, jobs, onViewHistory, onSelectEquipment, onNewInward }) {
  if (!rows.length) return <EmptyState title="No equipment found" body="Add equipment to create your permanent technical object register." />;
  return (
    <div className="table-wrap">
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
          {rows.map((x) => {
            const visits = jobs.filter(
              (j) => j.equipment === x._id || j.equipment?._id === x._id || j.technicalObjectNumber === x.technicalObjectNumber
            );
            const active = visits.some((j) => j.status !== "Exited");
            return (
              <tr key={x._id} className="clickable-row" onClick={() => onSelectEquipment(x)} title="Click to view equipment details">
                <td><b className="mono">{x.technicalObjectNumber}</b></td>
                <td>{x.vehicleNumber || x.equipmentName || "—"}</td>
                <td>{x.equipmentType}</td>
                <td>{[x.make, x.model].filter(Boolean).join(" / ") || "—"}</td>
                <td><b>{visits.length}</b><small className="cell-sub">{active ? "Currently inside" : "Not in yard"}</small></td>
                <td>{dateOnly(x.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn tiny secondary" onClick={(e) => { e.stopPropagation(); onViewHistory(x); }}><History size={14} /> History</button>
                    {!active && <button className="btn tiny primary" onClick={(e) => { e.stopPropagation(); onNewInward(x._id); }}>New inward</button>}
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

function JobsTable({ rows, setJobEdit, setCompletion, setExitForm }) {
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
          {rows.map((j) => {
            const lotCount = (j.partsLots || []).length;
            const partCount = (j.partsLots || []).reduce((acc, lot) => acc + (lot.parts?.length || 0), 0);

            return (
              <tr key={j._id}>
                <td>
                  <b className="mono">{j.jobCardNumber}</b>
                  <small className="cell-sub">
                    MO: {j.maintenanceOrderNumber || "Pending"}
                  </small>
                  {j.mrNumber && (
                    <small className="cell-sub">
                      MR: {j.mrNumber}
                    </small>
                  )}
                  {j.stpoNumber && (
                    <small className="cell-sub">
                      STPO: {j.stpoNumber}
                    </small>
                  )}
                  {j.sapMaintenanceOrderNumber && (
                    <small className="cell-sub">
                      Legacy: {j.sapMaintenanceOrderNumber}
                    </small>
                  )}
                </td>
                <td><b className="mono">{j.technicalObjectNumber}</b></td>
                <td>{j.vehicleNumber || "—"}<small className="cell-sub">{j.equipmentType} · {[j.make, j.model].filter(Boolean).join(" ")}</small></td>
                <td>{dateText(j.inDateTime)}<small className="cell-sub">GP: {j.inwardGatepassNumber}</small></td>
                <td>
                  <b>{lotCount} {lotCount === 1 ? "Lot" : "Lots"}</b>
                  <small className="cell-sub">{partCount} total {partCount === 1 ? "part" : "parts"}</small>
                </td>
                <td>{dateOnly(j.expectedOutDate)}</td>
                <td>{j.mechanicNames || "—"}</td>
                <td><StatusBadge status={j.status} /></td>
                <td>
                  <div className="row-actions">
                    <button className="btn tiny secondary" onClick={() => setJobEdit({ ...j })}>Edit</button>
                    {!["Completed", "Exited"].includes(j.status) && (
                      <button
                        className="btn tiny success"
                        onClick={() => setCompletion({ ...j, jobCompletedDateTime: localDateTime(), completedByMechanic: j.mechanicNames || "", finalRemarks: j.finalRemarks || "" })}
                      >
                        Complete
                      </button>
                    )}
                    {j.status === "Completed" && (
                      <button
                        className="btn tiny primary"
                        onClick={() => setExitForm({ ...j, exitDateTime: localDateTime(), exitGatepassNumber: j.exitGatepassNumber || "" })}
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