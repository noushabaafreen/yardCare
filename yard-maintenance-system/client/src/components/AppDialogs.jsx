import React from "react";
import { BadgeCheck, CheckCircle2, DoorOpen, Plus, X } from "lucide-react";
import { useAppPage } from "../AppPageContext";
import { blankEquipment, blankInward, dateText, localDateTime, MAKES, TYPES } from "../appConstants";
import { EmptyState, Field, Modal, StatusBadge } from "./AppShared";
import parseBulkParts from "../utils/parseBulkParts";

export default function AppDialogs() {
  const {
    equipmentEditBusy, equipmentEditForm, equipmentEditMode, equipmentForm, equipmentModal,
    exitForm, historyEquipment, jobEdit, jobs, selectedEquipment, completion,
    setEquipmentEditForm, setEquipmentEditMode, setEquipmentForm, setEquipmentModal,
    setExitForm, setHistoryEquipment, setInwardForm, setJobEdit, setPage,
    setSelectedEquipment, setCompletion, saveEquipment, saveEquipmentEdit, saveJob,
    completeJob, exitJob
  } = useAppPage();

  return (
    <>
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
    </>
  );
}
