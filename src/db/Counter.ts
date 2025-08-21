import * as mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 10250 },
});

export const counterModel = mongoose.model("counters", counterSchema);