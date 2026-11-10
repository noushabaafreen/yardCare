import React from "react";
import { Search, X } from "lucide-react";
import { blankEquipment, blankInward, localDateTime } from "../appConstants";
import { useAppPage } from "../AppPageContext";
import { EmptyState, EquipmentTable, JobsTable, PanelHeader } from "../components/AppShared";

export default function DetailSearchPage() {
  const {
    detailSearch,
    setDetailSearch,
    detailQuery,
    detailEquipmentResults,
    detailJobResults,
    jobs,
    setHistoryEquipment,
    setSelectedEquipment,
    setEquipmentEditForm,
    setEquipmentEditMode,
    setInwardForm,
    setPage,
    setJobEdit,
    setCompletion,
    setExitForm
  } = useAppPage();

  return (
    <section className="panel">
      <PanelHeader title="Detail Search" subtitle="Search, view and update equipment and maintenance records" />
      <div className="toolbar">
        <div className="searchbox" style={{ flex: 1 }}>
          <Search size={18} />
          <input
            placeholder="Enter vehicle number, technical object, job card, MO, MR, PR, PO, material code..."
            value={detailSearch}
            onChange={(event) => setDetailSearch(event.target.value)}
          />
          {detailSearch && (
            <button type="button" className="icon-btn" onClick={() => setDetailSearch("")} title="Clear search" aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <span className="result-count">{detailQuery ? `${detailEquipmentResults.length} equipment · ${detailJobResults.length} job cards` : "Type to search"}</span>
      </div>
      {!detailQuery ? (
        <EmptyState title="Start typing to search" body="Search across equipment, job cards, gatepasses, MO / MR / STPO, PR / PO, material codes, problems and remarks." />
      ) : (
        <>
          <div className="table-heading"><b>Equipment</b><span>{detailEquipmentResults.length} matching</span></div>
          <EquipmentTable
            rows={detailEquipmentResults}
            jobs={jobs}
            onViewHistory={setHistoryEquipment}
            onSelectEquipment={(equipment) => {
              setSelectedEquipment(equipment);
              setEquipmentEditForm({ ...blankEquipment, ...equipment });
              setEquipmentEditMode(false);
            }}
            onNewInward={(equipmentId) => {
              setInwardForm({ ...blankInward, equipmentId, inDateTime: localDateTime() });
              setPage("Inward Entry");
            }}
          />
          <div className="table-heading"><b>Job cards</b><span>{detailJobResults.length} matching</span></div>
          <JobsTable rows={detailJobResults} setJobEdit={setJobEdit} setCompletion={setCompletion} setExitForm={setExitForm} />
        </>
      )}
    </section>
  );
}
