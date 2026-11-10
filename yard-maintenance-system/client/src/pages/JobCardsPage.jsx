import React from "react";
import { Search } from "lucide-react";
import { useAppPage } from "../AppPageContext";
import { JobsTable, PanelHeader } from "../components/AppShared";

export default function JobCardsPage() {
  const { filteredJobs, jobSearch, setJobSearch, setJobEdit, setCompletion, setExitForm } = useAppPage();

  return (
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
            onChange={(event) => setJobSearch(event.target.value)}
          />
        </div>
        <span className="result-count">{filteredJobs.length} records</span>
      </div>
      <JobsTable rows={filteredJobs} setJobEdit={setJobEdit} setCompletion={setCompletion} setExitForm={setExitForm} />
    </section>
  );
}
