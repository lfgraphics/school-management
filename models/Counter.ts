import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'registrationNumber'
  seq: { type: Number, default: 214 }
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
