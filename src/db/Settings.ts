import * as mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    perBagAmount: {
      type: Number,
      default: 0,
    },
    perKgAmount: {
      type: Number,
      default: 0,
    },
    transportationFee: {
      type: Number,
      default: 0,
    },
    defaultTransportationFee: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ["default","regular"],
      default: 'regular',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "partners",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPerBagActive: {
      type: Boolean,
      default: true,
    },
    isPerKgActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

settingsSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

export const settingsModel = mongoose.model("settings", settingsSchema);
