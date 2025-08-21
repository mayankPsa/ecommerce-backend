import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    about: { type: String, default: "" },
    privacy: { type: String, default: "" },
    terms: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const policyModel = mongoose.model("Policy", policySchema);
