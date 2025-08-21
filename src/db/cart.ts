import * as mongoose from "mongoose";

const wieghtType = [
  "kg",
  "bag",
  ""
]

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    isGuest: {
      type: Boolean,
      default: false, // false = registered user, true = guest user
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    type: {
      type: String,
      enum: wieghtType,
      default: "",
    },
    amount: {
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

cartSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

export const cartModel = mongoose.model("carts", cartSchema);
