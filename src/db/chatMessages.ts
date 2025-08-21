import * as mongoose from 'mongoose';

const chatMessagesSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  message: {
    type: String,
    default: ""
  },
  image: {
    type: String,
    default: ""
  },
  document: {
    type: String,
    default: ""
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    required:true
  },
  updatedBy:{
    type: mongoose.Schema.Types.ObjectId,
    required:true
  }
},
  { timestamps: true });

chatMessagesSchema.set('toJSON', {
  virtuals: false, transform: (doc, ret, Options) => {
    delete ret.__v
  }
})

export const ChatMessages = mongoose.model('chatMessages', chatMessagesSchema);