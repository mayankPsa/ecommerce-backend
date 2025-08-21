import mongoose from 'mongoose';

const ipAddressSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const IpAddressModel = mongoose.model('IpAddress', ipAddressSchema);
