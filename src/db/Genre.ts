import * as mongoose from 'mongoose';

const genreSchema = new mongoose.Schema({
  name:{
    type: String,
    required:true,
  },
  isDeleted:  {
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
{timestamps:true});

genreSchema.set('toJSON',{
  virtuals: false, transform: ( doc, ret, Options) => {
      delete ret.__v
  }
})

export const genreModel = mongoose.model('genres', genreSchema);