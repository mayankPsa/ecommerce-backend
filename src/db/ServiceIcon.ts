import mongoose from 'mongoose';

const ServiceIconSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);


const ServiceIconModel = mongoose.model('ServiceIcon', ServiceIconSchema);

export default ServiceIconModel;
