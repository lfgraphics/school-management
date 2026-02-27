import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
