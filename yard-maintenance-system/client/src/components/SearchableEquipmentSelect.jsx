import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export default function SearchableEquipmentSelect({ equipment, jobs, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedEquipment = useMemo(
    () => equipment.find((item) => item._id === selectedId) || null,
    [equipment, selectedId]
  );

  useEffect(() => {
    if (selectedEquipment) {
      setQuery(`${selectedEquipment.technicalObjectNumber} - ${selectedEquipment.vehicleNumber || selectedEquipment.equipmentType}`);
    } else if (!selectedId) {
      setQuery("");
    }
  }, [selectedEquipment, selectedId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return equipment
      .map((item) => {
        const history = jobs.filter(
          (job) => job.equipment === item._id || job.equipment?._id === item._id || job.technicalObjectNumber === item.technicalObjectNumber
        );
        return {
          ...item,
          isInside: history.some((job) => job.status !== "Exited"),
          totalVisits: history.length
        };
      })
      .filter((item) => !normalizedQuery || [
        item.technicalObjectNumber,
        item.vehicleNumber,
        item.equipmentName,
        item.equipmentType,
        item.make,
        item.model
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
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
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (selectedId) onSelect("");
          }}
          onFocus={() => setOpen(true)}
          required={!selectedId}
        />
        {query && (
          <button type="button" className="combobox-clear-btn" onClick={handleClear} title="Clear selection" aria-label="Clear selection">
            <X size={15} />
          </button>
        )}
      </div>
      {open && (
        <ul className="combobox-dropdown">
          {filtered.length === 0 ? (
            <li className="combobox-dropdown-empty">No equipment found matching "{query}"</li>
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
                  <span className="combobox-item-sub">{[item.make, item.model].filter(Boolean).join(" · ")} · {item.totalVisits} visit(s)</span>
                </div>
                {item.isInside ? <span className="combobox-badge inside">CURRENTLY INSIDE</span> : <span className="combobox-badge available">Available</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
