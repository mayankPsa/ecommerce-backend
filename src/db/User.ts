import moment from 'moment'
import * as mongoose from 'mongoose'
var role = ['Admin', 'User', 'Vendor']
var gender = ['', 'Male', 'Female']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: ''
    },
    googleUid: {
      type: String
    },
    facebookUid: {
      type: String
    },
    appleUid: {
      type: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    alternateAddress: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    countryCode: {
      type: String
    },
    alternatePhone: {
      type: String,
      default: '',
    },
    dob: {
      type: Date,
      default: new Date('1970-01-01'),
    },
    gender: {
      type: String,
      default: 'Male',
      enum: gender,
    },
    password: {
      type: String,
      default: '',
    },
    otp: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['normal', 'google', 'apple'],
      default: 'normal'
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    otpExipredAt: {
      type: Date,
      default: moment().add(1, 'M'),
    },
    forgotPasswordLink: {
      type: String,
      default: '',
    },
    linkVerified: {
      type: Boolean,
      default: false,
    },
    linkExipredAt: {
      type: Date,
      default: moment().add(1, 'm'),
    },
    company: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: 'User',
      enum: role,
    },
    device: {
      deviceType: {
        type: String,
        default: 'android',
        enum: ['web', 'android', 'ios'],
      },
    },
    tokenKey: {
      type: String,
      default: null,
    },
    uid: {
      type: String,
      // unique: true,
      // required: 'Uid is required',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    userIpAddress: {
      type: String,
      default: "",
    },
    failedOTPAttempts: {
      type: Number,
      default: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    accessToken: {
      type: String,
      default: '',
    },
    appointment: {
      type: Number,
      default: 0
    },
    fcmToken: {
      type: String,
    }
  },
  { timestamps: true }
)

userSchema.set('toJSON', {
  virtuals: false,
  transform: (doc, ret, Options) => {
    delete ret.password
    delete ret.__v
    // delete ret.accessToken
    //delete ret._id
  },
})

export const userModel = mongoose.model('users', userSchema)
