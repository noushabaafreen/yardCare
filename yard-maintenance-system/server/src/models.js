import mongoose from "mongoose";

const { Schema, model } = mongoose;

const EquipmentSchema = new Schema(
  {
    technicalObjectNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    vehicleNumber: { type: String, trim: true, default: "" },
    equipmentName: { type: String, trim: true, default: "" },
    equipmentType: { type: String, required: true, trim: true },
    make: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    gatepassNumber: {
      type: String,
      trim: true,
      default: "",
    },
    inDate: {
      type: Date,
      default: null,
    },
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const InwardSchema = new Schema(
  {
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    technicalObjectNumber: { type: String, required: true, trim: true, index: true },
    vehicleNumber: { type: String, trim: true, default: "" },
    equipmentType: { type: String, required: true, trim: true },
    make: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    gatepassNumber: { type: String, required: true, trim: true, index: true },
    inDateTime: { type: Date, required: true, index: true },
    complaint: { type: String, trim: true, default: "" },
    enteredBy: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },
    exited: { type: Boolean, default: false, index: true },
    exitDateTime: { type: Date, default: null },
  },
  { timestamps: true }
);

InwardSchema.index({ exited: 1, inDateTime: -1 });

const PartItemSchema = new Schema(
  {
    materialCode: { type: String, trim: true, default: "" },
    partName: { type: String, trim: true, default: "" },
    shortText: { type: String, trim: true, default: "" },
    quantityRequested: { type: Number, min: 0, default: 0 },
    quantityOrdered: { type: Number, min: 0, default: 0 },
    deletionIndicator: { type: Boolean, default: false },
  },
  { _id: true }
);

const PartsLotSchema = new Schema(
  {
    lotName: { type: String, trim: true, default: "" },
    prNumber: { type: String, trim: true, default: "" },
    prDate: { type: Date, default: null },
    poNumber: { type: String, trim: true, default: "" },
    poDate: { type: Date, default: null },
    parts: { type: [PartItemSchema], default: [] },
  },
  { _id: true }
);

const JobSchema = new Schema(
  {
    jobCardNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    inward: { type: Schema.Types.ObjectId, ref: "Inward", required: true, index: true },
    technicalObjectNumber: { type: String, required: true, trim: true, index: true },
    vehicleNumber: { type: String, trim: true, default: "" },
    equipmentType: { type: String, required: true, trim: true },
    make: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    inDateTime: { type: Date, required: true },
    outDateTime: { type: Date, default: null },
    inwardGatepassNumber: { type: String, required: true, trim: true },
    expectedOutDate: { type: Date, default: null, index: true },
    problems: { type: String, trim: true, default: "" },
    actionTaken: { type: String, trim: true, default: "" },
    partsRequired: { type: String, trim: true, default: "" },
    partsChanged: { type: String, trim: true, default: "" },
    mechanicNames: { type: String, trim: true, default: "" },

    // Retained for backward compatibility
    sapMaintenanceOrderNumber: { type: String, trim: true, default: "", index: true },

    // Material Reservation (MR) details
    mrNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    mrDate: {
      type: Date,
      default: null,
    },

    // Maintenance order & lot structure
    maintenanceOrderNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    maintenanceOrderDate: {
      type: Date,
      default: null,
    },
    partsLots: {
      type: [PartsLotSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["Awaiting Job Card", "In Progress", "Waiting for Parts", "Completed", "Exited"],
      default: "In Progress",
      index: true,
    },
    jobCompletedDateTime: { type: Date, default: null },
    completedByMechanic: { type: String, trim: true, default: "" },
    exitGatepassNumber: { type: String, trim: true, default: "" },
    exitDateTime: { type: Date, default: null },
    finalRemarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

JobSchema.index({ "partsLots.prNumber": 1 }, { sparse: true });
JobSchema.index({ "partsLots.poNumber": 1 }, { sparse: true });
JobSchema.index({ "partsLots.parts.materialCode": 1 }, { sparse: true });
JobSchema.index({ equipment: 1, status: 1 });
JobSchema.index({ status: 1, inDateTime: -1 });

export const Equipment = model("Equipment", EquipmentSchema);
export const Inward = model("Inward", InwardSchema);
export const Job = model("Job", JobSchema);



const ScrapVehicleSchema = new Schema(
  {
    vehicleNumber: { type: String, required: true, trim: true },
    technicalNumber: { type: String, required: true, trim: true },
    issue: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    makeCompany: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ScrapVehicleSchema.index({ vehicleNumber: 1, technicalNumber: 1 });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["superadmin", "user"], default: "user" },
  permissions: { type: Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const User = mongoose.models.User || model("User", UserSchema);
export const ScrapVehicle = mongoose.models.ScrapVehicle || model("ScrapVehicle", ScrapVehicleSchema);
