"use server"

import dbConnect from "@/lib/db"
import Class from "@/models/Class"
import ClassFee from "@/models/ClassFee"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createClassSchema = z.object({
  name: z.string().min(1, "Name is required"),
  exams: z.array(z.string()).optional(),
})

const feeSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  type: z.enum(['monthly', 'examination', 'admission', 'admissionFees', 'registrationFees']), // Updated enum
  amount: z.number().min(0, "Amount must be positive"),
  effectiveFrom: z.string().min(1, "Effective Date is required"), // YYYY-MM-DD
})

const updateExamsSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  exams: z.array(z.string()).min(1, "At least one exam is required"),
})

export async function createClass(data: z.infer<typeof createClassSchema>) {
  try {
    createClassSchema.parse(data);
    await dbConnect();
    const existingClass = await Class.findOne({ name: data.name });
    if (existingClass) {
      return { success: false, error: "Class already exists" };
    }
    
    await Class.create({ 
      name: data.name,
      exams: data.exams || ["Annual", "Half Yearly"] // Default exams if none provided
    });
    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function updateClassExams(data: z.infer<typeof updateExamsSchema>) {
  try {
    updateExamsSchema.parse(data);
    await dbConnect();
    await Class.findByIdAndUpdate(data.classId, { exams: data.exams });
    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function addClassFee(data: z.infer<typeof feeSchema>) {
  try {
    feeSchema.parse(data);
    await dbConnect();
    
    // Deactivate previous fee of same type for this class?
    // Usually fee history is kept. But we want only one active at a time maybe?
    // Or we just query by date. 
    // The current implementation of `getClassesWithFees` just gets the latest one.
    // So we can just create new one.
    
    await ClassFee.create({
      classId: data.classId,
      type: data.type,
      amount: data.amount,
      effectiveFrom: new Date(data.effectiveFrom),
      isActive: true
    });
    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

interface ClassDoc {
  _id: { toString: () => string };
  name: string;
  exams?: string[];
}

export async function getClassesWithFees() {
  await dbConnect();
  const classes = await Class.find({ isActive: true }).lean();
  
  const result = await Promise.all(classes.map(async (c: unknown) => {
    const cls = c as ClassDoc;
    // Get latest fees for this class
    // We can just fetch all active fees and map them
    const fees = await ClassFee.find({ 
        classId: cls._id, 
        isActive: true 
    }).sort({ effectiveFrom: -1 }).lean();

    const latestFees: Record<string, number> = {};
    // Iterate and pick latest for each type
    // Since sorted by date desc, first encounter of each type is latest
    for (const f of fees) {
        if (latestFees[f.type] === undefined) {
            latestFees[f.type] = f.amount;
        }
    }
    
    return {
      id: cls._id.toString(),
      name: cls.name,
      exams: cls.exams || [],
      monthlyFee: latestFees['monthly'] || 0,
      examFee: latestFees['examination'] || 0,
      admissionFee: latestFees['admissionFees'] || latestFees['admission'] || 0,
      registrationFee: latestFees['registrationFees'] || 0,
    };
  }));
  
  return result;
}

export async function getClasses() {
  await dbConnect();
  const classes = await Class.find({ isActive: true }).sort({ name: 1 }).lean();
  return classes.map((c: unknown) => {
    const cls = c as ClassDoc;
    return {
      id: cls._id.toString(),
      name: cls.name,
      exams: cls.exams || []
    };
  });
}
