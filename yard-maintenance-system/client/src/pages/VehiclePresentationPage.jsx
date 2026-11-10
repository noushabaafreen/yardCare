import React from "react";
import VehiclePresentation from "../components/VehiclePresentation";
import { useAppPage } from "../AppPageContext";

export default function VehiclePresentationPage() {
  const { equipment, jobs, inwards } = useAppPage();
  return <VehiclePresentation equipment={equipment} jobs={jobs} inwardRecords={inwards} />;
}
