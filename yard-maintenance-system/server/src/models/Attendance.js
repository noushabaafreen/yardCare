import mongoose from "mongoose";
const { Schema, model } = mongoose;

const AttendanceEmployeeSchema = new Schema({
  employeeCode: { type: String, trim: true, default: "" },
  employeeName: { type: String, required: true, trim: true },
  designation: { type: String, default: "" },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const AttendanceMonthSchema = new Schema({
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/, unique: true, index: true },
  entries: [{
    employee: { type: Schema.Types.ObjectId, ref: "AttendanceEmployee", required: true },
    days: { type: Map, of: String, default: {} },
  }],
}, { timestamps: true });

export const AttendanceEmployee = mongoose.models.AttendanceEmployee ||
  model("AttendanceEmployee", AttendanceEmployeeSchema);
export const AttendanceMonth = mongoose.models.AttendanceMonth ||
  model("AttendanceMonth", AttendanceMonthSchema);
