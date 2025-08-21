import { string } from 'joi';
import mongoose from 'mongoose';
let userType = ['user', 'partner', 'admin'];
const notificationSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderType: {
        type: String,
        enum: userType
    },
    recevierId: {
        type: mongoose.Schema.Types.ObjectId,
        reqired: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    receiverType: {
        type: String,
        enum: userType
    },
    message: {
        type: Object,
        default: {},
    },

    note: {
        type: String,
        default: '',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
notificationSchema.set('toJSON', {
    virtuals: false, transform: (doc, ret, Options) => {
        delete ret.__v;
    }
});
export const notificationModel = mongoose.model("notifications", notificationSchema);
