import React from "react";
import { Plus, Search, Trash2, Wrench, X } from "lucide-react";
import { useAppPage } from "../AppPageContext";
import { PanelHeader } from "../components/AppShared";

export default function PartsCataloguePage() {
  const {
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
    openCatalogPart
  } = useAppPage();

  return (
    <section className="panel">
      <PanelHeader
        title="Parts Catalogue"
        subtitle={`${catalogParts.length.toLocaleString()} material records · Stored in the backend JSON catalogue`}
        action={<button className="btn primary" onClick={() => setShowAddPart((value) => !value)}><Plus size={16} /> Add Part</button>}
      />
      {showAddPart && (
        <form className="catalog-add-form" onSubmit={addCatalogPart}>
          <label>Material Code<input required value={newPart.materialCode} onChange={(event) => setNewPart({ ...newPart, materialCode: event.target.value })} /></label>
          <label>Material Name<input required value={newPart.materialName} onChange={(event) => setNewPart({ ...newPart, materialName: event.target.value })} /></label>
          <label>Company<input required list="catalog-company-options" value={newPart.company} onChange={(event) => setNewPart({ ...newPart, company: event.target.value })} placeholder="e.g. Tata" /></label>
          <datalist id="catalog-company-options">{catalogCompanies.map((company) => <option key={company} value={company} />)}</datalist>
          <button className="btn primary" type="submit" disabled={savingPart}>{savingPart ? "Saving…" : "Save Part"}</button>
        </form>
      )}
      <div className="catalog-toolbar">
        <label className="catalog-filter">
          <span>Company</span>
          <select value={catalogCompany} onChange={(event) => setCatalogCompany(event.target.value)}>
            <option value="all">All companies</option>
            {catalogCompanies.map((company) => <option key={company} value={company}>{company}</option>)}
          </select>
        </label>
        <label className="catalog-search">
          <span>Search material code or name</span>
          <div className="search-input-wrap">
            <Search size={17} />
            <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Enter material code or part name…" />
          </div>
        </label>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Material Code</th><th>Material Name</th><th>Company</th></tr></thead>
          <tbody>
            {catalogLoading ? <tr><td colSpan="3">Loading catalogue…</td></tr> : filteredCatalogParts.slice(0, 500).map((part, index) => (
              <tr
                key={`${part.materialCode}-${part.company}-${index}`}
                className="catalog-clickable-row"
                tabIndex={0}
                role="button"
                onClick={() => openCatalogPart(part)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openCatalogPart(part); }}
                title="Click to view or edit part details"
              >
                <td><code>{part.materialCode}</code></td><td>{part.materialName}</td><td>{part.company}</td>
              </tr>
            ))}
            {!catalogLoading && filteredCatalogParts.length === 0 && <tr><td colSpan="3">No matching parts found.</td></tr>}
          </tbody>
        </table>
      </div>
      {selectedCatalogPart && (
        <div className="catalog-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCatalogPart(null); }}>
          <section className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
            <header className="catalog-modal-header">
              <div><h2 id="catalog-modal-title">{catalogEditMode ? "Edit Part" : "Part Details"}</h2><p>Material catalogue record</p></div>
              <button className="icon-btn" type="button" onClick={() => setSelectedCatalogPart(null)} aria-label="Close"><X size={18} /></button>
            </header>
            {catalogEditMode ? (
              <form className="catalog-detail-form" onSubmit={saveCatalogPart}>
                <label>Material Code<input required value={catalogEditForm.materialCode} onChange={(event) => setCatalogEditForm({ ...catalogEditForm, materialCode: event.target.value })} /></label>
                <label>Material Name<input required value={catalogEditForm.materialName} onChange={(event) => setCatalogEditForm({ ...catalogEditForm, materialName: event.target.value })} /></label>
                <label>Company<input required value={catalogEditForm.company} onChange={(event) => setCatalogEditForm({ ...catalogEditForm, company: event.target.value })} /></label>
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
  );
}
