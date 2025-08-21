import moment from 'moment'
import * as mongoose from 'mongoose'

const roles = ['Admin', 'Customer', 'Vendor']
const genders = ['', 'Male', 'Female']

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    profile: {
      type: String, // profile picture URL
      default: '',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true, // prevent duplicate emails
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    dob: {
      type: Date,
      default: new Date('1970-01-01'),
    },
    gender: {
      type: String,
      enum: genders,
      default: 'Male',
    },
    password: {
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
    otpExpiredAt: {
      type: Date,
      default: () => moment().add(1, 'M').toDate(),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // reference to another user (like admin who created this user)
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    accessToken: {
      type: String,
      default: '',
    },
    fcmToken: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: roles,
      default: 'Customer',
    },
  },
  { timestamps: true }
)

// hide sensitive fields when returning JSON
userSchema.set('toJSON', {
  virtuals: false,
  transform: (doc, ret) => {
    delete ret.password
    delete ret.__v
    delete ret.accessToken
  },
})

export const userModel = mongoose.model('User', userSchema)
