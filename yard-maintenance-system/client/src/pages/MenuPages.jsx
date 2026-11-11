import React from "react";
import { useAppPage } from "../AppPageContext";
import AttendancePage from "./AttendancePage";
import LeaveManagementPage from "./LeaveManagementPage";
import DashboardPage from "./DashboardPage";
import DataManagementPage from "./DataManagementPage";
import DetailSearchPage from "./DetailSearchPage";
import EquipmentMasterPage from "./EquipmentMasterPage";
import InwardEntryPage from "./InwardEntryPage";
import JobCardsPage from "./JobCardsPage";
import PartsCataloguePage from "./PartsCataloguePage";
import ReportsPage from "./ReportsPage";
import Scrap from "./Scrap";
import UserManagement from "./UserManagement";
import VehicleHistoryPage from "./VehicleHistoryPage";
import VehiclePresentationPage from "./VehiclePresentationPage";

const MENU_PAGES = {
  Dashboard: DashboardPage,
  "Equipment Master": EquipmentMasterPage,
  "Inward Entry": InwardEntryPage,
  "Job Cards": JobCardsPage,
  "Detail Search": DetailSearchPage,
  "Data Management": DataManagementPage,
  Attendance: AttendancePage,
  "Leave Management": LeaveManagementPage,
  "Parts Catalogue": PartsCataloguePage,
  "Vehicle History": VehicleHistoryPage,
  "Vehicle Presentation": VehiclePresentationPage,
  "Reports & MIS": ReportsPage,
  Scrap,
  "User Management": UserManagement
};

export default function MenuPages() {
  const { page, role, canView } = useAppPage();

  if (page === "User Management" && role !== "superadmin") return null;

  if (page !== "User Management" && !canView(page)) {
    return (
      <section className="panel">
        <h2>Access restricted</h2>
        <p>Your account does not have permission to view this section. Contact the Super Admin.</p>
      </section>
    );
  }

  const Page = MENU_PAGES[page];
  return Page ? <Page /> : null;
}
