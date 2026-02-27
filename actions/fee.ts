"use server"

import dbConnect from "@/lib/db"
import FeeTransaction from "@/models/FeeTransaction"
import { revalidatePath } from "next/cache"

export async function getPendingFees() {
  await dbConnect();
  
  const transactionsWithDetails = await FeeTransaction.find({ status: 'pending' })
    .populate({
      path: 'studentId',
      select: 'name registrationNumber classId',
      populate: { path: 'classId', select: 'name' }
    })
    .populate('collectedBy', 'name')
    .sort({ transactionDate: -1 })
    .lean();

  interface TransactionDoc {
      _id: { toString: () => string };
      studentId?: {
          name: string;
          registrationNumber: string;
          classId?: {
              name: string;
          }
      };
      collectedBy?: {
          name: string;
      };
      amount: number;
      feeType: string;
      month?: number;
      year: number;
      transactionDate: Date;
      receiptNumber: string;
  }

  return transactionsWithDetails.map((t: unknown) => {
    const tx = t as TransactionDoc;
    return {
        id: tx._id.toString(),
        studentName: tx.studentId?.name || 'Unknown',
        regNo: tx.studentId?.registrationNumber || 'N/A',
        className: tx.studentId?.classId?.name || 'N/A',
        collectedBy: tx.collectedBy?.name || 'Unknown',
        amount: tx.amount,
        feeType: tx.feeType,
        month: tx.month,
        year: tx.year,
        date: tx.transactionDate,
        receiptNumber: tx.receiptNumber
    };
  });
}

export async function verifyFee(transactionId: string, action: 'approve' | 'reject', userId: string) {
  try {
    await dbConnect();
    
    const status = action === 'approve' ? 'verified' : 'rejected';
    
    await FeeTransaction.findByIdAndUpdate(transactionId, {
      status,
      verifiedAt: new Date(),
      verifiedBy: userId
    });
    
    revalidatePath("/admin/fees/verify");
    revalidatePath("/admin/dashboard"); // Update stats
    
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
