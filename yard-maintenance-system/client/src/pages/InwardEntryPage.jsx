import React from "react";
import { Activity, DoorOpen, Plus } from "lucide-react";
import { useAppPage } from "../AppPageContext";
import { Field, PanelHeader } from "../components/AppShared";

export default function InwardEntryPage() {
  const { equipment, jobs, inwardForm, setInwardForm, saveInward, setPage, SearchableEquipmentSelect } = useAppPage();

  return (
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
              onSelect={(equipmentId) => setInwardForm({ ...inwardForm, equipmentId })}
            />
            <small className="muted" style={{ display: "block", marginTop: "4px" }}>
              Search by technical object number or vehicle registration. Click a record from the dropdown to select it.
            </small>
          </Field>
          <Field label="Inward gatepass number" required>
            <input required value={inwardForm.gatepassNumber} onChange={(event) => setInwardForm({ ...inwardForm, gatepassNumber: event.target.value })} placeholder="e.g. GP-2026-001" />
          </Field>
          <Field label="Inward date & time" required>
            <input type="datetime-local" required value={inwardForm.inDateTime} onChange={(event) => setInwardForm({ ...inwardForm, inDateTime: event.target.value })} />
          </Field>
          <Field label="Expected out date">
            <input type="date" value={inwardForm.expectedOutDate} onChange={(event) => setInwardForm({ ...inwardForm, expectedOutDate: event.target.value })} />
          </Field>
          <Field label="Complaint / reported problem" wide>
            <textarea rows="3" value={inwardForm.complaint} onChange={(event) => setInwardForm({ ...inwardForm, complaint: event.target.value })} placeholder="Describe the problem reported at arrival" />
          </Field>
          <Field label="Entered by">
            <input value={inwardForm.enteredBy} onChange={(event) => setInwardForm({ ...inwardForm, enteredBy: event.target.value })} placeholder="Name of yard staff" />
          </Field>
          <Field label="Initial remarks">
            <input value={inwardForm.remarks} onChange={(event) => setInwardForm({ ...inwardForm, remarks: event.target.value })} />
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
        <button className="btn secondary full" onClick={() => setPage("Equipment Master")}>Open equipment master</button>
      </section>
    </div>
  );
}
