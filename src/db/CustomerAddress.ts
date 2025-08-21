import * as mongoose from 'mongoose'

const addressTypes = ['home', 'office', 'other']

const customerAddressSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        default: [0, 0],
      },
    },
    street: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    zipCode: {
      type: String,
      default: '',
    },
    addressType: {
      type: String,
      enum: addressTypes,
      default: 'home',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)
customerAddressSchema.index({ location: '2dsphere' });

customerAddressSchema.set('toJSON', {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v
  },
})

export const customerAddressModel = mongoose.model('customerAddresses', customerAddressSchema)
