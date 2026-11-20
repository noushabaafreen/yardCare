import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRightLeft, Download, Plus, RefreshCw, Search, Trash2, Truck, X } from "lucide-react";
import api from "../api";
import "./FleetControlCenter.css";

const STAGES = ["Inside Yard", "Work in Progress", "Waiting for Parts", "Inspection Pending", "Work Completed"];
const EMPTY = { vehicleNumber: "", technicalObject: "", category: "Other", makeModel: "", gatePassNumber: "", entryDate: new Date().toISOString().slice(0, 10), problem: "", priority: "Medium", notes: "" };
const messageOf = e => e.response?.data?.message || e.message || "Something went wrong.";

export default function FleetControlCenter() {
  const [data, setData] = useState({ vehicles: [], categories: [], summary: {}, stageCounts: {}, categoryCounts: [] });
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setBusy(true); setError("");
    try { const r = await api.get("/api/fleet-control"); setData(r.data); }
    catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  const inside = useMemo(() => data.vehicles.filter(v => !v.exitDate), [data.vehicles]);
  const exited = useMemo(() => data.vehicles.filter(v => v.exitDate), [data.vehicles]);
  const visible = useMemo(() => (tab === "exited" ? exited : inside).filter(v => {
    const q = query.trim().toLowerCase();
    return (!q || [v.vehicleNumber, v.technicalObject, v.category, v.makeModel, v.gatePassNumber].some(x => String(x || "").toLowerCase().includes(q))) &&
      (categoryFilter === "all" || v.category === categoryFilter) &&
      (stageFilter === "all" || v.stage === stageFilter);
  }), [tab, inside, exited, query, categoryFilter, stageFilter]);

  const flash = text => { setNotice(text); window.setTimeout(() => setNotice(""), 3000); };
  const startAdd = () => { setEditing(null); setForm({ ...EMPTY, category: data.categories[0] || "Other" }); setShowForm(true); };
  const startEdit = v => { setEditing(v); setForm({ ...EMPTY, ...v }); setShowForm(true); };
  const save = async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (editing) await api.put(`/api/fleet-control/vehicles/${editing.id}`, form);
      else await api.post("/api/fleet-control/vehicles", form);
      setShowForm(false); setEditing(null); await load(); flash(editing ? "Vehicle details updated." : "Vehicle added to yard.");
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };
  const updateStage = async (vehicle, stage) => {
    try { await api.put(`/api/fleet-control/vehicles/${vehicle.id}`, { stage }); await load(); }
    catch (e) { setError(messageOf(e)); }
  };
  const remove = async v => {
    if (!window.confirm(`Delete ${v.vehicleNumber} from Fleet Control Center?`)) return;
    try { await api.delete(`/api/fleet-control/vehicles/${v.id}`); await load(); flash("Vehicle record deleted."); }
    catch (e) { setError(messageOf(e)); }
  };
  const exit = async v => {
    const by = window.prompt("Completed / exit processed by:");
    if (by === null) return;
    try { await api.post(`/api/fleet-control/vehicles/${v.id}/exit`, { completedBy: by }); await load(); flash(`${v.vehicleNumber} moved to Exited Vehicles.`); }
    catch (e) { setError(messageOf(e)); }
  };
  const reEnter = async v => {
    const gatePassNumber = window.prompt("New gate pass number (optional):", "");
    if (gatePassNumber === null) return;
    try { await api.post(`/api/fleet-control/vehicles/${v.id}/re-enter`, { gatePassNumber }); await load(); setTab("inside"); flash(`${v.vehicleNumber} moved back to Inside Yard.`); }
    catch (e) { setError(messageOf(e)); }
  };
  const addCategory = async e => {
    e.preventDefault();
    try { const r = await api.post("/api/fleet-control/categories", { category: categoryName }); setData(d => ({ ...d, categories: r.data.categories })); setCategoryName(""); flash("Vehicle category added."); }
    catch (e) { setError(messageOf(e)); }
  };
  const deleteCategory = async category => {
    if (!window.confirm(`Delete category "${category}"?`)) return;
    try { const r = await api.delete(`/api/fleet-control/categories/${encodeURIComponent(category)}`); setData(d => ({ ...d, categories: r.data.categories })); flash("Category deleted."); }
    catch (e) { setError(messageOf(e)); }
  };
  const exportExcel = async kind => {
    try {
      const r = await api.get(`/api/fleet-control/export/${kind}`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data); const a = document.createElement("a");
      a.href = url; a.download = `fleet-control-${kind}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(messageOf(e)); }
  };
  const days = date => Math.max(0, Math.floor((new Date(new Date().toDateString()) - new Date(`${date}T00:00:00`)) / 86400000));
  const kpis = [
    ["Inside Yard", data.summary.inside || 0, "truck"],
    ["Work in Progress", data.summary.workInProgress || 0, "activity"],
    ["Waiting for Parts", data.summary.waitingForParts || 0, "parts"],
    ["Inspection Pending", data.summary.inspectionPending || 0, "inspection"],
    ["Work Completed", data.summary.workCompleted || 0, "done"],
    ["Exited Vehicles", data.summary.exited || 0, "exit"]
  ];
  return <div className="fcc-page">
    <div className="fcc-heading">
      <div><div className="fcc-eyebrow">YARD OPERATIONS / CONTROL</div><h2>Fleet Control Center</h2><p>Track vehicles from yard entry through maintenance, inspection and exit.</p></div>
      <div className="fcc-heading-actions"><button className="fcc-btn ghost" onClick={load}><RefreshCw size={16}/> Refresh</button><button className="fcc-btn primary" onClick={startAdd}><Plus size={17}/> Add Vehicle</button></div>
    </div>
    {error && <div className="fcc-alert error">{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
    {notice && <div className="fcc-alert success">{notice}</div>}
    <div className="fcc-tabs">
      {[["overview","Dashboard Overview"],["inside","Inside Yard"],["exited","Exited Vehicles"],["categories","Vehicle Types"],["exports","Excel Export"]].map(([key,label]) => <button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab === "overview" && <>
      <div className="fcc-kpis">{kpis.map(([label,value])=><div className="fcc-kpi" key={label}><span>{label}</span><strong>{value}</strong><small>Current records</small></div>)}</div>
      <div className="fcc-overview-grid">
        <section className="fcc-card"><div className="fcc-card-title"><div><h3>Maintenance Stage Distribution</h3><p>Vehicles currently inside the yard</p></div><Activity size={19}/></div>
          {STAGES.map(stage=>{const count=data.stageCounts?.[stage]||0; const max=Math.max(1,...Object.values(data.stageCounts||{})); return <div className="fcc-bar-row" key={stage}><span>{stage}</span><div className="fcc-bar-track"><i style={{width:`${count/max*100}%`}}/></div><b>{count}</b></div>})}
        </section>
        <section className="fcc-card"><div className="fcc-card-title"><div><h3>Vehicle Category Summary</h3><p>Inside and exited fleet records</p></div><Truck size={19}/></div>
          {data.categoryCounts?.length ? data.categoryCounts.map(c=><div className="fcc-category-row" key={c.category}><span>{c.category}</span><b>{c.inside} inside</b><small>{c.exited} exited</small></div>) : <div className="fcc-empty">No categories available.</div>}
        </section>
      </div>
      <section className="fcc-card fcc-watch"><div className="fcc-card-title"><div><h3>Priority Watchlist</h3><p>High-priority vehicles and vehicles staying over 30 days</p></div><AlertTriangle size={19}/></div>
        {inside.filter(v=>v.priority==="High"||days(v.entryDate)>30).length ? inside.filter(v=>v.priority==="High"||days(v.entryDate)>30).sort((a,b)=>days(b.entryDate)-days(a.entryDate)).slice(0,8).map(v=><div className="fcc-watch-row" key={v.id}><div><b>{v.vehicleNumber}</b><small>{v.category} · {v.stage}</small></div><span>{days(v.entryDate)} days</span><em className={v.priority.toLowerCase()}>{v.priority} priority</em><button className="fcc-btn small" onClick={()=>startEdit(v)}>View / Edit</button></div>) : <div className="fcc-empty">No vehicles currently require priority attention.</div>}
      </section>
    </>}

    {(tab === "inside" || tab === "exited") && <>
      <div className="fcc-list-toolbar"><div className="fcc-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search vehicle, technical object, gate pass..."/></div>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{data.categories.map(c=><option key={c}>{c}</option>)}</select>
        {tab==="inside" && <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{STAGES.map(s=><option key={s}>{s}</option>)}</select>}
      </div>
      <div className="fcc-table-wrap"><table className="fcc-table"><thead><tr><th>Vehicle / Technical Object</th><th>Category / Model</th><th>Gate Pass</th><th>Entry Date</th>{tab==="inside"?<><th>Days in Yard</th><th>Maintenance Stage</th><th>Priority</th></>:<><th>Exit Date</th><th>Completed By</th><th>Turnaround</th></>}<th>Actions</th></tr></thead>
        <tbody>{visible.map(v=><tr key={v.id}><td><b>{v.vehicleNumber}</b><small>{v.technicalObject||"No technical object"}</small></td><td>{v.category}<small>{v.makeModel||"—"}</small></td><td>{v.gatePassNumber||"—"}</td><td>{v.entryDate||"—"}</td>{tab==="inside"?<><td><b className={days(v.entryDate)>30?"fcc-danger":""}>{days(v.entryDate)}</b></td><td><select className="fcc-stage-select" value={v.stage} onChange={e=>updateStage(v,e.target.value)}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></td><td><span className={`fcc-priority ${v.priority.toLowerCase()}`}>{v.priority}</span></td></>:<><td>{v.exitDate}</td><td>{v.exitCompletedBy||"—"}</td><td>{Math.max(0,Math.floor((new Date(`${v.exitDate}T00:00:00`)-new Date(`${v.entryDate}T00:00:00`))/86400000))} days</td></>}<td><div className="fcc-actions"><button onClick={()=>startEdit(v)}>Edit</button>{tab==="inside"?<button onClick={()=>exit(v)}>Exit</button>:<button onClick={()=>reEnter(v)}>Re-enter</button>}<button className="danger" title="Delete" onClick={()=>remove(v)}><Trash2 size={15}/></button></div></td></tr>)}
          {!visible.length&&<tr><td colSpan="9"><div className="fcc-empty">No matching vehicle records found.</div></td></tr>}
        </tbody></table></div>
    </>}

    {tab === "categories" && <div className="fcc-card"><div className="fcc-card-title"><div><h3>Vehicle Types Manager</h3><p>Add or remove vehicle categories. Categories in use cannot be deleted.</p></div></div>
      <form className="fcc-category-form" onSubmit={addCategory}><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="Enter new vehicle category" required/><button className="fcc-btn primary"><Plus size={16}/> Add Category</button></form>
      <div className="fcc-category-list">{data.categories.map(c=><div key={c}><b>{c}</b><span>{inside.filter(v=>v.category===c).length} inside · {exited.filter(v=>v.category===c).length} exited</span><button onClick={()=>deleteCategory(c)}><Trash2 size={15}/></button></div>)}</div>
    </div>}

    {tab === "exports" && <div className="fcc-export-grid"><div className="fcc-card"><FileBadge/><h3>Inside Yard Register</h3><p>Download all vehicles currently inside the yard with their stage, priority and entry details.</p><button className="fcc-btn primary" onClick={()=>exportExcel("inside")}><Download size={16}/> Download Excel</button></div><div className="fcc-card"><ArrowRightLeft size={23}/><h3>Exited Vehicles Register</h3><p>Download exit dates, completed-by details and vehicle turnaround days.</p><button className="fcc-btn primary" onClick={()=>exportExcel("exited")}><Download size={16}/> Download Excel</button></div></div>}

    {showForm && <div className="fcc-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="fcc-modal" onSubmit={save}><div className="fcc-modal-head"><div><h3>{editing?"Edit Vehicle Record":"Add Vehicle to Yard"}</h3><p>Fleet Control Center records are stored separately from the main MIS database.</p></div><button type="button" onClick={()=>setShowForm(false)}><X/></button></div>
      <div className="fcc-form-grid">
        <label>Vehicle Number *<input required value={form.vehicleNumber} onChange={e=>setForm(f=>({...f,vehicleNumber:e.target.value}))}/></label>
        <label>Technical Object<input value={form.technicalObject} onChange={e=>setForm(f=>({...f,technicalObject:e.target.value}))}/></label>
        <label>Vehicle Category<select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{data.categories.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Make / Model<input value={form.makeModel} onChange={e=>setForm(f=>({...f,makeModel:e.target.value}))}/></label>
        <label>Gate Pass Number<input value={form.gatePassNumber} onChange={e=>setForm(f=>({...f,gatePassNumber:e.target.value}))}/></label>
        <label>Entry Date<input type="date" value={form.entryDate} onChange={e=>setForm(f=>({...f,entryDate:e.target.value}))}/></label>
        <label>Priority<select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}><option>High</option><option>Medium</option><option>Low</option></select></label>
        {editing && <label>Maintenance Stage<select value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></label>}
        <label className="wide">Problem / Work Requirement<textarea rows="3" value={form.problem} onChange={e=>setForm(f=>({...f,problem:e.target.value}))}/></label>
        <label className="wide">Notes<textarea rows="2" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></label>
      </div><div className="fcc-modal-actions"><button type="button" className="fcc-btn ghost" onClick={()=>setShowForm(false)}>Cancel</button><button className="fcc-btn primary" disabled={busy}>{busy?"Saving...":"Save Vehicle"}</button></div>
    </form></div>}
  </div>;
}

function FileBadge(){ return <Download size={23}/>; }
