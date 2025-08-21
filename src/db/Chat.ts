// import * as mongoose from 'mongoose';

// const chatSchema = new mongoose.Schema({
//   partnerId: {
//     type: mongoose.Schema.Types.ObjectId,
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//   },
//   adminId: {
//     type: mongoose.Schema.Types.ObjectId,
//   },
//   orderId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//   },
//   isRead: {
//     type: Boolean,
//     default: false
//   },
//   isDeleted: {
//     type: Boolean,
//     default: false
//   },
//   createdBy:{
//     type: mongoose.Schema.Types.ObjectId,
//     required:true
//   },
//   updatedBy:{
//     type: mongoose.Schema.Types.ObjectId,
//     required:true
//   }
// },
//   { timestamps: true });

// chatSchema.set('toJSON', {
//   virtuals: false, transform: (doc, ret, Options) => {
//     delete ret.__v
//   }
// })

// export const Chat = mongoose.model('Chat', chatSchema);


import * as mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  read_status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
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

chatSchema.set('toJSON', {
  virtuals: false, transform: (doc, ret, Options) => {
    delete ret.__v
  }
})

export const Chat = mongoose.model('Chat', chatSchema);