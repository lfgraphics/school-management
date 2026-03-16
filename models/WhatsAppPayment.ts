import mongoose from 'mongoose';

const WhatsAppPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.WhatsAppPayment || mongoose.model('WhatsAppPayment', WhatsAppPaymentSchema);
