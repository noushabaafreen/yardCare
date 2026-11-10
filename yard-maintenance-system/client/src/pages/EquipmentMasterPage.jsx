import React from "react";
import { Plus, Search } from "lucide-react";
import { blankEquipment, blankInward, localDateTime } from "../appConstants";
import { useAppPage } from "../AppPageContext";
import { EquipmentTable, PanelHeader } from "../components/AppShared";

export default function EquipmentMasterPage() {
  const {
    filteredEquipment,
    equipmentSearch,
    setEquipmentSearch,
    setEquipmentModal,
    jobs,
    setHistoryEquipment,
    setSelectedEquipment,
    setEquipmentEditForm,
    setEquipmentEditMode,
    setInwardForm,
    setPage
  } = useAppPage();

  return (
    <section className="panel">
      <PanelHeader
        title="Equipment master"
        subtitle="Permanent equipment register and technical object mapping"
        action={<button className="btn primary" onClick={() => setEquipmentModal(true)}><Plus size={16} /> Add equipment</button>}
      />
      <div className="toolbar">
        <div className="searchbox">
          <Search size={17} />
          <input
            placeholder="Search technical object, vehicle, model..."
            value={equipmentSearch}
            onChange={(event) => setEquipmentSearch(event.target.value)}
          />
        </div>
        <span className="result-count">{filteredEquipment.length} records</span>
      </div>
      <EquipmentTable
        rows={filteredEquipment}
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
    </section>
  );
}
