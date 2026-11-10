export const TYPES = [
  "Aerial Work Platform",
  "Ambulance",
  "Backhoe Loader",
  "Bus",
  "Camper",
  "Compressor",
  "Container Mounted Truck",
  "Crane",
  "Diesel Tanker",
  "Dozer / Bulldozer",
  "Excavator",
  "Fuel Bowser",
  "Forklift",
  "Generator",
  "Hydra",
  "Hyva",
  "Mixer",
  "Motor Grader",
  "Other",
  "Palfinger",
  "Pickup / Utility Vehicle",
  "Reach Stacker",
  "Road Roller / Compactor",
  "Skid Steer Loader",
  "Tipper",
  "Tractor",
  "Trailer",
  "Water Tanker",
  "Wheel Loader",
  "Others"
];

export const MAKES = [
  "ACE",
  "Ashok Leyland",
  "Hindustan",
  "BharatBenz",
  "Bobcat",
  "Caterpillar",
  "DAF",
  "Eicher",
  "Force",
  "Hitachi",
  "Hyundai",
  "Isuzu",
  "John Deere",
  "JCB",
  "Kobelco",
  "Komatsu",
  "Liebherr",
  "Mahindra",
  "MAN",
  "Maruti Suzuki",
  "New Holland",
  "Palfinger",
  "SANY",
  "Scania",
  "SML Isuzu",
  "Tata",
  "UD Trucks",
  "Volvo",
  "XCMG",
  "Zoomlion",
  "Manitou",
  "Other"
];

export const STATUSES = [
  "Awaiting Job Card",
  "Inspection Pending",
  "Inspection Done",
  "Diagnosis Pending",
  "In Progress",
  "Repair In Progress",
  "Waiting for Parts",
  "Quality Check Pending",
  "Quality Check Done",
  "Ready for Delivery",
  "Completed",
  "Exited"
];

export const STATUS_TONES = {
  "Awaiting Job Card": "red",
  "Inspection Pending": "orange",
  "Inspection Done": "blue",
  "Diagnosis Pending": "orange",
  "In Progress": "blue",
  "Repair In Progress": "blue",
  "Waiting for Parts": "orange",
  "Quality Check Pending": "orange",
  "Quality Check Done": "blue",
  "Ready for Delivery": "green",
  Completed: "green",
  Exited: "green"
};

export const blankEquipment = {
  technicalObjectNumber: "",
  vehicleNumber: "",
  equipmentName: "",
  equipmentType: "Hydra",
  make: "",
  model: "",
  gatepassNumber: "",
  inDate: "",
  remarks: ""
};

export function localDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export const blankInward = {
  equipmentId: "",
  gatepassNumber: "",
  inDateTime: localDateTime(),
  complaint: "",
  enteredBy: "",
  expectedOutDate: "",
  remarks: ""
};

export function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function dateOnly(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
