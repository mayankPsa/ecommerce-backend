import * as mongoose from 'mongoose'

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    alternatePhone: {
      type: String,
      default: '',
    },
    shopTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
      },
    ],
    address: {
      streetAddress: {
        type: String,
        default: null,
        trim: true,
      },
      landMark: {
        type: String,
        default: null,
        trim: true,
      },
      city: {
        type: String,
        default: '',
        trim: true,
      },
      state: {
        type: String,
        default: '',
        trim: true,
      },
      country: {
        type: String,
        default: '',
        trim: true,
      },
      postalCode: {
        type: String,
        default: '',
        trim: true,
      },
    },
    loc: { type: { type: String ,  enum: ['Point']}, coordinates: [Number] },
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
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

shopSchema.set('toJSON', {
  virtuals: false,
  transform: (doc, ret, Options) => {
    delete ret.__v
  },
})
shopSchema.index({loc: '2dsphere'});
export const shopModel = mongoose.model('shop', shopSchema)
