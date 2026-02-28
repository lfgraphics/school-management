import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  expenseDate: { type: Date, required: true, default: Date.now },
  date: { type: Date, required: true, default: Date.now },
  category: { 
    type: String, 
    enum: ['Salary', 'Maintenance', 'Supplies', 'Utilities', 'Others'], 
    default: 'Others',
    required: true
  },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  salaryMonth: { type: Number, min: 1, max: 12 },
  salaryYear: { type: Number },
  receipt: { type: String }, // Path to local file or URL
  status: { 
    type: String, 
    enum: ['active', 'deleted'], 
    default: 'active',
    required: true
  },
  auditLog: [{
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    details: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Indexes for common queries
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ teacherId: 1 });
ExpenseSchema.index({ status: 1 });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
