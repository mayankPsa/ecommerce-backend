import * as mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
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
    image: {
        type: String,
        default: ''
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
        required: true,
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subCategory",
        required: true,
    },
    gender: [{
        type: String,
        enum: ['Male', 'Female'],
        required: true,
    }],
    description: {
        type: String,
    },
    hours: {
        type: Number,
        default: 0,
        required: false,
    },
    minutes: {
        type: Number,
        default: 0,
        required: false,
    },
    cost: {
        type: Number,
        default: 0,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
},
    { timestamps: true });

productSchema.set('toJSON', {
    virtuals: false, transform: (doc, ret, Options) => {
        delete ret.__v
    }
})

productSchema.index({ name: 'text' });

export const productModel = mongoose.model('product', productSchema);