import * as mongoose from "mongoose";
import { counterModel } from "./Counter";
const orderStatuses = [
    "Pending",
    "Completed",
    "Paid",
    "Cancelled"
  ];
const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: Number,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "partners",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    expressFee: {
      type: Number,
      default: 0,
    },
    transportation: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    status: {
        type: String,
        enum: orderStatuses,
        default: "Pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    
  },
  { timestamps: true }
);

transactionSchema.pre("save", async function (next) {
  const doc = this as any;
  if (doc.isNew && !doc.transactionId) {
    try {
      const counter = await counterModel.findOneAndUpdate(
        { name: "transactionId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.transactionId = counter.seq;
      next();
    } catch (err: any) {
      next(err);
    }
  } else {
    next();
  }
});

transactionSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

export const transactionModel = mongoose.model("transactions", transactionSchema);
