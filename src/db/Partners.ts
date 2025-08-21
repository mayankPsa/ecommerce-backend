import moment from 'moment';
import * as mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema(
  {
    laundryName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Make sure email is unique
      lowercase: true, // Store emails in lowercase
    },
    fcmToken: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    openingHours: {
      start: {
        type: String,
        required: false,
      },
      end: {
        type: String,
        required: false,
      },
    },
    street: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['Active','InActive'],
      default: 'Active'
    },
    postalCode: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      default: '',
    },
    otp: {
      type: String,
      default: '',
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    otpExipredAt: {
      type: Date,
      default: moment().add(1, 'M'),
    },
    isDeleted: {
      type: Boolean,
      default: false, // Default value for logical deletion
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users', // Refers to the 'users' model (if needed)
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users', // Refers to the 'users' model (if needed)
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true }
);

// Virtuals for toJSON transformation
partnerSchema.set('toJSON', {
  virtuals: false,
  transform: (doc, ret, Options) => {
    delete ret.password; // Remove password before sending data back
    delete ret.__v; // Remove version key
    delete ret.isDeleted; // Optional, can remove if not necessary
  },
});

export const partnerModel = mongoose.model('partners', partnerSchema);
