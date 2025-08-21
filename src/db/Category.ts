import * as mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "partners",
    required: true,
  },
  icon: {
    type: mongoose.Schema.Types.ObjectId
  },
  name: {
    type: String,
    required: true,
    trim: true
  }, 
  subTitle: {
    type: String,
    default: "",
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isActiveByPartner: {
    type: Boolean,
    default: false
  },

  isActiveByAdmin: {
    type: Boolean,
    default: false
  },
  photo: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  status: {
    type: String,
    enum: ['Active','InActive'],
    default: 'InActive'
  },
},
  { timestamps: true });

categorySchema.set('toJSON', {
  virtuals: false, transform: (doc, ret, Options) => {
    delete ret.__v
  }
})

export const categoryModel = mongoose.model('category', categorySchema);