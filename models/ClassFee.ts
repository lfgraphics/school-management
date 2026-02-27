import mongoose from 'mongoose';

const ClassFeeSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  type: { type: String, enum: ['monthly', 'examination', 'admission', 'admissionFees', 'registrationFees'], required: true }, // Added new types
  amount: { type: Number, required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ClassFee || mongoose.model('ClassFee', ClassFeeSchema);
