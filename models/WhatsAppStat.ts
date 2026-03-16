import mongoose from 'mongoose';

const WhatsAppStatSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['text', 'image', 'receipt', 'reminder', 'otp'] },
  description: { type: String, required: true },
  recipientCount: { type: Number, required: true, default: 1 },
  cost: { type: Number, required: true },
  status: { type: String, required: true, enum: ['success', 'failed', 'partial', 'pending'] },
  batchId: { type: String },
  mediaUrl: { type: String },
  // Fields populated by feeease-worker webhook callback
  sentCount: { type: Number },
  failedCount: { type: Number },
  skippedCount: { type: Number, default: 0 },
  workerDetails: { type: mongoose.Schema.Types.Mixed }, // per-recipient result array
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.WhatsAppStat || mongoose.model('WhatsAppStat', WhatsAppStatSchema);
