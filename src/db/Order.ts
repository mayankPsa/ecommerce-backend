import * as mongoose from "mongoose";
import { counterModel } from "./Counter";

const paymentTypes = ["cash", "e-wallet"];

const orderStatuses = [
  "Order placed",
  "On the way",
  "In process",
  "Laundry is cleaned",
  "Completed",
  "Pending"
];

const wieghtType = [
  "kg",
  "bag",
  ""
]

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      unique: true,
      index: true,
    },
    // categoryId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "categories",
    //   required: true,
    // },
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
    weight: {
      type: Number,
      default: 0,
    },
    bags: {
      type: Number,
      default: 0,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    pickupTime: {
      type: String,
      default: "",
    },
    deliveryTime: {
      type: String,
      default: "",
    },
    deliveryOption: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "deliveryOptions"
    },
    customerAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customerAddresses"
    },
    deliveryAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customerAddresses"
    },
    paymentType: {
      type: String,
      enum: paymentTypes,
      default: "cash",
    },
    invoiceUrl: { type: String, default: null },
    instructions: {
      type: String,
      default: ""
    },
    services: [
      {
        type: {
          type: String,
          enum: wieghtType,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "categories",
          default: null,
        },
      }
    ],
    status: {
      type: String,
      enum: orderStatuses,
      default: "Pending",
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    amount: {
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    isCancelledByCustomer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  const doc = this as any;
  if (doc.isNew && !doc.orderId) {
    try {
      const counter = await counterModel.findOneAndUpdate(
        { name: "orderId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.orderId = counter.seq;
      next();
    } catch (err:any) {
      next(err);
    }
  } else {
    next();
  }
});

orderSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

export const orderModel = mongoose.model("orders", orderSchema);
