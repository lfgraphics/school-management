"use server"

import dbConnect from "@/lib/db"
import Class from "@/models/Class"
import ClassFee from "@/models/ClassFee"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createClassSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyFee: z.coerce.number().min(0).optional(),
  admissionFee: z.coerce.number().min(0).optional(),
  examinationFee: z.coerce.number().min(0).optional(),
  registrationFee: z.coerce.number().min(0).optional(),
  effectiveFrom: z.string().min(1, "Effective Date is required").optional(),
  exams: z.array(z.string()).optional(),
})

const updateClassWithFeesSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  name: z.string().min(1, "Name is required"),
  monthlyFee: z.coerce.number().min(0).optional(),
  admissionFee: z.coerce.number().min(0).optional(),
  examinationFee: z.coerce.number().min(0).optional(),
  registrationFee: z.coerce.number().min(0).optional(),
  effectiveFrom: z.string().min(1, "Effective Date is required").optional(),
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
    
    const newClass = await Class.create({ 
      name: data.name,
      exams: data.exams || ["Annual", "Half Yearly"] // Default exams if none provided
    });

    // Create fees if provided
    const feesToCreate = [];
    const now = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();

    if (data.monthlyFee !== undefined && data.monthlyFee > 0) {
      feesToCreate.push({
        classId: newClass._id,
        type: 'monthly',
        amount: data.monthlyFee,
        effectiveFrom: now,
        isActive: true
      });
    }

    if (data.admissionFee !== undefined && data.admissionFee > 0) {
      feesToCreate.push({
        classId: newClass._id,
        type: 'admissionFees',
        amount: data.admissionFee,
        effectiveFrom: now,
        isActive: true
      });
    }

    if (data.examinationFee !== undefined && data.examinationFee > 0) {
      feesToCreate.push({
        classId: newClass._id,
        type: 'examination',
        amount: data.examinationFee,
        effectiveFrom: now,
        isActive: true
      });
    }
    
    if (data.registrationFee !== undefined && data.registrationFee > 0) {
        feesToCreate.push({
          classId: newClass._id,
          type: 'registrationFees',
          amount: data.registrationFee,
          effectiveFrom: now,
          isActive: true
        });
      }

    if (feesToCreate.length > 0) {
      await ClassFee.insertMany(feesToCreate);
    }

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function updateClassWithFees(data: z.infer<typeof updateClassWithFeesSchema>) {
    try {
        updateClassWithFeesSchema.parse(data);
        await dbConnect();
        
        // 1. Update Class Name
        const existingClass = await Class.findById(data.classId);
        if (!existingClass) {
             return { success: false, error: "Class not found" };
        }
        
        if (existingClass.name !== data.name) {
             // Check name uniqueness
             const duplicate = await Class.findOne({ name: data.name, _id: { $ne: data.classId } });
             if (duplicate) {
                  return { success: false, error: "Class name already exists" };
             }
             existingClass.name = data.name;
             await existingClass.save();
        }

        // 2. Update Fees (Create new entries if different)
        const fees = await ClassFee.find({ 
            classId: data.classId, 
            isActive: true 
        }).sort({ effectiveFrom: -1 }).lean();

        const latestFees: Record<string, number> = {};
        // Iterate and pick latest for each type
        for (const f of fees) {
            if (latestFees[f.type] === undefined) {
                latestFees[f.type] = f.amount;
            }
        }

        const feesToCreate = [];
        const now = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();

        // Check Monthly
        if (data.monthlyFee !== undefined && data.monthlyFee !== (latestFees['monthly'] || 0)) {
             feesToCreate.push({
                classId: data.classId,
                type: 'monthly',
                amount: data.monthlyFee,
                effectiveFrom: now,
                isActive: true
             });
        }
        
        // Check Admission
        const currentAdmission = latestFees['admissionFees'] || latestFees['admission'] || 0;
        if (data.admissionFee !== undefined && data.admissionFee !== currentAdmission) {
             feesToCreate.push({
                classId: data.classId,
                type: 'admissionFees',
                amount: data.admissionFee,
                effectiveFrom: now,
                isActive: true
             });
        }
        
        // Check Examination
        if (data.examinationFee !== undefined && data.examinationFee !== (latestFees['examination'] || 0)) {
             feesToCreate.push({
                classId: data.classId,
                type: 'examination',
                amount: data.examinationFee,
                effectiveFrom: now,
                isActive: true
             });
        }

        // Check Registration
        if (data.registrationFee !== undefined && data.registrationFee !== (latestFees['registrationFees'] || 0)) {
             feesToCreate.push({
                classId: data.classId,
                type: 'registrationFees',
                amount: data.registrationFee,
                effectiveFrom: now,
                isActive: true
             });
        }

        if (feesToCreate.length > 0) {
             await ClassFee.insertMany(feesToCreate);
        }

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
