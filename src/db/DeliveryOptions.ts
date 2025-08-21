import * as mongoose from "mongoose";
const deliveryOptionsSchema = new mongoose.Schema(
  {
    serviceFee: {
      type: Number,
      default: 0,
    },
    deliveryType: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },
    duration: {
      type: Number,
      default: 1,
    },
    additionalTime: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

deliveryOptionsSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

export const deliveryOptionsModel = mongoose.model("deliveryOptions", deliveryOptionsSchema);
