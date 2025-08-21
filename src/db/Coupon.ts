import * as mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    offerName: {
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
    appliesToAll: {
        type: Boolean,
        default: false
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subCategory",
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
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

couponSchema.set('toJSON', {
    virtuals: false, transform: (doc, ret, Options) => {
        delete ret.__v
    }
})

export const couponModel = mongoose.model('coupan', couponSchema);
