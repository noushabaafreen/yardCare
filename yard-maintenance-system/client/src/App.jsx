import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Presentation as PresentationIcon,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Truck,
  Wrench,
  X,
  Recycle,
  CalendarCheck
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import { AppPageProvider } from "./AppPageContext";
import AppDialogs from "./components/AppDialogs";
import { blankEquipment, blankInward, localDateTime } from "./appConstants";
import SearchableEquipmentSelect from "./components/SearchableEquipmentSelect";
import MenuPages from "./pages/MenuPages";
import LoginPage from "./pages/LoginPage";

const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Equipment Master", Truck],
  ["Inward Entry", DoorOpen],
  ["Job Cards", ClipboardList],
  ["Detail Search", Search],
  ["Data Management", Trash2],
  ["Attendance", CalendarDays],
  ["Leave Management", CalendarCheck],
  ["Parts Catalogue", Boxes],
  ["Vehicle History", ClipboardList],
  ["Vehicle Presentation", PresentationIcon],
  ["Reports & MIS", FileSpreadsheet],
  ["Scrap", Recycle],
  ["User Management", Settings2]
];

const MENU_PATHS = {
  Dashboard: "/dashboard",
  "Equipment Master": "/equipment-master",
  "Inward Entry": "/inward-entry",
  "Job Cards": "/job-cards",
  "Detail Search": "/detail-search",
  "Data Management": "/data-management",
  Attendance: "/attendance",
  "Leave Management": "/leave-management",
  "Parts Catalogue": "/parts-catalogue",
  "Vehicle History": "/vehicle-history",
  "Vehicle Presentation": "/vehicle-presentation",
  "Reports & MIS": "/reports",
  Scrap: "/scrap",
  "User Management": "/user-management"
};
const PATH_MENUS = Object.fromEntries(
  Object.entries(MENU_PATHS).map(([menu, path]) => [path, menu])
);
const SESSION_MAX_AGE_SECONDS = 2 * 60 * 60;

function getSessionExpiration(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    const issuedAt = Number(claims.iat);
    const expiresAt = Number(claims.exp);

    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return 0;
    return Math.min(expiresAt, issuedAt + SESSION_MAX_AGE_SECONDS) * 1000;
  } catch {
    return 0;
  }
}

function errMsg(e) {
  return e.response?.data?.message || e.message || "Something went wrong.";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const page = PATH_MENUS[location.pathname] || "Dashboard";
  const setPage = useCallback((menu) => {
    const path = MENU_PATHS[menu];
    if (!path) throw new Error(`Unknown menu page: ${menu}`);
    navigate(path);
  }, [navigate]);
  const [token, setToken] = useState(localStorage.getItem("yard_token"));
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem("yard_token")));
  const [authCheckError, setAuthCheckError] = useState("");
  const [authCheckAttempt, setAuthCheckAttempt] = useState(0);
  const [admin, setAdmin] = useState(localStorage.getItem("yard_admin") || "admin");
  const [role, setRole] = useState(localStorage.getItem("yard_role") || "superadmin");
  const [permissions, setPermissions] = useState(() => { try { return JSON.parse(localStorage.getItem("yard_permissions") || "{}"); } catch { return {}; } });
  const canView = (menu) => role === "superadmin" || Boolean(permissions[menu]);
  const canEdit = (menu) => role === "superadmin" || permissions[menu] === "edit";
  const [login, setLogin] = useState({ username: "admin", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
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

  useEffect(() => {
    if (!PATH_MENUS[location.pathname]) {
      navigate(MENU_PATHS.Dashboard, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = getSessionExpiration(token);
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      window.dispatchEvent(new Event("yard-session-expired"));
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => window.dispatchEvent(new Event("yard-session-expired")),
      delay
    );
    return () => window.clearTimeout(timeoutId);
  }, [token]);
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
      const tasks = [];
      if (canView("Reports & MIS")) tasks.push(loadSummary());
      if (canView("Equipment Master")) tasks.push(loadEquipment());
      if (canView("Inward Entry")) tasks.push(loadInwards());
      if (canView("Job Cards") || canView("Detail Search") || canView("Vehicle History") || canView("Vehicle Presentation")) tasks.push(loadJobs());
      await Promise.all(tasks);
      if (requestId !== refreshIdRef.current) return;
    } catch (e) {
      if (requestId !== refreshIdRef.current) return;
      flash("error", errMsg(e));
    } finally {
      if (requestId === refreshIdRef.current) {
        setLoading(false);
      }
    }
  }, [token, flash, loadSummary, loadEquipment, loadInwards, loadJobs, role, permissions]);

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
      localStorage.removeItem("yard_token");
      localStorage.removeItem("yard_admin");
      localStorage.removeItem("yard_role");
      localStorage.removeItem("yard_permissions");
      setToken(null);
      setRole("user");
      setPermissions({});
      setAuthChecking(false);
      setAuthCheckError("");
      setLoginError("Session expired. Please sign in again.");
      setNotice({ type: "error", text: "Session expired. Please sign in again." });
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
    window.addEventListener("yard-session-expired", handler);
    return () => window.removeEventListener("yard-session-expired", handler);
  }, []);

  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return undefined;
    }

    let active = true;
    setAuthChecking(true);
    setAuthCheckError("");

    api.get("/api/auth/me")
      .then(({ data }) => {
        if (!active) return;
        setAdmin(data.username);
        setRole(data.role || "user");
        setPermissions(data.permissions || {});
        setAuthChecking(false);
      })
      .catch((error) => {
        if (!active || error.response?.status === 401) return;
        setAuthCheckError("Unable to verify your session. Check the server connection and retry.");
        setAuthChecking(false);
      });

    return () => {
      active = false;
    };
  }, [token, authCheckAttempt]);

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
      if (report.kind === "pending" && ["Completed", "Exited"].includes(j.status)) return false;
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
      setAuthCheckError("");
      setAuthChecking(true);
      setToken(r.data.token);
      setAdmin(r.data.username);
      setRole(r.data.role || "superadmin");
      setPermissions(r.data.permissions || {});
      localStorage.setItem("yard_role", r.data.role || "superadmin");
      localStorage.setItem("yard_permissions", JSON.stringify(r.data.permissions || {}));
      setPage("Dashboard");
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
    localStorage.removeItem("yard_role");
    localStorage.removeItem("yard_permissions");
    setPermissions({});
    setRole("user");
    setToken(null);
    setAuthChecking(false);
    setAuthCheckError("");
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

  const pageContextValue = {
    page,
    role,
    canView,
    summary,
    jobs,
    equipment,
    inwards,
    setPage,
    setJobEdit,
    setCompletion,
    setExitForm,
    filteredEquipment,
    equipmentSearch,
    setEquipmentSearch,
    setEquipmentModal,
    setHistoryEquipment,
    setSelectedEquipment,
    setEquipmentEditForm,
    setEquipmentEditMode,
    setInwardForm,
    inwardForm,
    saveInward,
    SearchableEquipmentSelect,
    filteredJobs,
    jobSearch,
    setJobSearch,
    detailSearch,
    setDetailSearch,
    detailQuery,
    detailEquipmentResults,
    detailJobResults,
    report,
    setReport,
    reportRows,
    exportReport,
    deleteSearch,
    setDeleteSearch,
    deletingKey,
    deleteEquipmentRecord,
    deleteJobRecord,
    catalogParts,
    catalogCompanies,
    filteredCatalogParts,
    catalogLoading,
    catalogCompany,
    setCatalogCompany,
    catalogQuery,
    setCatalogQuery,
    showAddPart,
    setShowAddPart,
    newPart,
    setNewPart,
    savingPart,
    addCatalogPart,
    selectedCatalogPart,
    setSelectedCatalogPart,
    catalogEditMode,
    setCatalogEditMode,
    catalogEditForm,
    setCatalogEditForm,
    saveCatalogPart,
    deleteCatalogPart,
    catalogPartBusy,
    openCatalogPart,
    selectedEquipment,
    equipmentEditMode,
    equipmentEditForm,
    equipmentEditBusy,
    saveEquipmentEdit,
    equipmentModal,
    equipmentForm,
    setEquipmentForm,
    saveEquipment,
    historyEquipment,
    saveJob,
    completeJob,
    exitJob,
    jobEdit,
    completion,
    exitForm,
  };

  return (
    <AppPageProvider value={pageContextValue}>
    <div className={authChecking || authCheckError || !token ? "login-shell" : "app-shell"}>
      {authChecking ? (
        <div className="session-checking" role="status" aria-live="polite">
          Verifying your session...
        </div>
      ) : authCheckError ? (
        <div className="session-checking" role="alert">
          <p>{authCheckError}</p>
          <div className="session-checking-actions">
            <button
              className="btn primary"
              onClick={() => {
                setAuthChecking(true);
                setAuthCheckAttempt((attempt) => attempt + 1);
              }}
            >
              Retry
            </button>
            <button className="btn secondary" onClick={logout}>Sign in</button>
          </div>
        </div>
      ) : !token ? (
        <LoginPage
          login={login}
          setLogin={setLogin}
          loginError={loginError}
          loginLoading={loginLoading}
          onSubmit={handleLogin}
        />
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
              {NAV.filter(([label]) => label === "User Management" ? role === "superadmin" : canView(label)).map(([label, Icon]) => (
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
                <div className="user-meta"><b>{admin}</b><small>{role === "superadmin" ? "Super Admin" : "User"}</small></div>
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
              <MenuPages />
            </div>
            <footer className="app-footer">
              <span>YardCare <i>•</i> Equipment Maintenance MIS</span>
              <span>Local workspace <i>•</i> Admin access</span>
            </footer>
          </main>
        </>
      )}

      <AppDialogs />
    </div>
    </AppPageProvider>
  );
}
