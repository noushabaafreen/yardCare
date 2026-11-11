import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LeaveSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: "AttendanceEmployee", required: true, index: true },
  employeeCode: { type: String, trim: true, default: "" },
  employeeName: { type: String, required: true, trim: true },
  designation: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  leaveType: { type: String, enum: ["Casual Leave", "Sick Leave", "Earned Leave", "Other"], default: "Casual Leave" },
  fromDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  toDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  reason: { type: String, trim: true, default: "" },
  approvedBy: { type: String, trim: true, default: "" },
  remarks: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["Approved"], default: "Approved" },
}, { timestamps: true });

LeaveSchema.index({ fromDate: 1, toDate: 1 });
export const Leave = mongoose.models.Leave || model("Leave", LeaveSchema);
