import * as mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  categoryType: {
    type: String,
    default: 'SUB',
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'category'
  },
  image: {
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
  }
},
  { timestamps: true });

subCategorySchema.set('toJSON', {
  virtuals: false, transform: (doc, ret, Options) => {
    delete ret.__v
  }
})

export const subCategoryModel = mongoose.model('subCategory', subCategorySchema);