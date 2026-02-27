import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  
  // Refactored to match Student model structure
  photo: { type: String }, // Base64
  documents: [{
    type: { type: String }, // e.g., PAN, Aadhaar, Experience Certificate
    image: { type: String }, // Base64
    documentNumber: { type: String }
  }],

  pastExperience: {
    totalExperience: { type: Number },
    experienceLetter: { type: String },
  },
  // experienceCertificate: { type: String }, // Moved to documents array

  aadhaar: { type: String, required: true },
  parents: {
    fatherName: String,
    motherName: String,
  },
  governmentTeacherId: { type: String, unique: true, sparse: true },
  teacherId: { type: String, unique: true, required: true }, // 8 chars generated
  salary: {
    amount: { type: Number, required: true },
    effectiveDate: { type: Date, default: Date.now },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Delete existing model to prevent hot-reload errors with schema changes
if (mongoose.models.Teacher) {
  delete mongoose.models.Teacher;
}

export default mongoose.model('Teacher', TeacherSchema);
