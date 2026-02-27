"use server"

import dbConnect from "@/lib/db"
import Expense from "@/models/Expense"
import Teacher from "@/models/Teacher"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Types } from "mongoose"

// Zod schema for validation
const expenseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0, "Amount must be positive"),
  expenseDate: z.string().or(z.date()),
  category: z.enum(['Salary', 'Maintenance', 'Supplies', 'Utilities', 'Others']),
  teacherId: z.string().optional(),
  salaryMonth: z.number().min(1).max(12).optional(),
  salaryYear: z.number().min(2000).optional(),
  receipt: z.string().optional(),
}).refine((data) => {
  if (data.category !== 'Salary' && !data.title) {
    return false;
  }
  return true;
}, {
  message: "Title is required for non-salary expenses",
  path: ["title"],
});

interface ExpenseDoc {
    _id: Types.ObjectId;
    title?: string;
    description?: string;
    amount: number;
    expenseDate: Date;
    category: string;
    teacherId?: Types.ObjectId | { _id: Types.ObjectId; name: string } | null;
    salaryMonth?: number;
    salaryYear?: number;
    receipt?: string;
    status: string;
    createdBy?: Types.ObjectId | { _id: Types.ObjectId; name: string };
    auditLog: {
        action: string;
        performedBy: Types.ObjectId;
        date: Date;
        details: string;
        _id?: Types.ObjectId;
    }[];
}

// Define a type for the query object to avoid Mongoose version issues and 'any'
interface ExpenseQuery {
    status: string;
    $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    expenseDate?: { $gte?: Date; $lte?: Date };
    category?: string;
}

interface ExpenseUpdates extends Partial<z.infer<typeof expenseSchema>> {
    auditLog: {
        action: string;
        performedBy: string;
        date: Date;
        details: string;
    }[];
    teacherId?: string | undefined;
}

export async function createExpense(data: z.infer<typeof expenseSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    const validatedData = expenseSchema.parse(data);
    await dbConnect();
    
    // Mutable copy of data for DB insertion
    const expenseData: Partial<z.infer<typeof expenseSchema>> = { ...validatedData };

    if (!expenseData.teacherId) {
        delete expenseData.teacherId;
    }

    // Salary Duplicate Check
    if (validatedData.category === 'Salary') {
      if (!validatedData.teacherId || !validatedData.salaryMonth || !validatedData.salaryYear) {
        return { success: false, error: "Teacher, Month, and Year are required for Salary expenses" };
      }

      const existingSalary = await Expense.findOne({
        category: 'Salary',
        teacherId: validatedData.teacherId,
        salaryMonth: validatedData.salaryMonth,
        salaryYear: validatedData.salaryYear,
        status: 'active'
      });

      if (existingSalary) {
        return { success: false, error: "Salary already paid for this teacher for the selected month and year." };
      }

      // Auto-generate title if not provided
      if (!expenseData.title) {
        const teacher = await Teacher.findById(validatedData.teacherId);
        if (teacher) {
            const monthName = new Date(0, (validatedData.salaryMonth || 1) - 1).toLocaleString('default', { month: 'long' });
            expenseData.title = `Salary for ${teacher.name} - ${monthName} ${validatedData.salaryYear}`;
            expenseData.description = `Salary payment for ${monthName} ${validatedData.salaryYear}`;
        } else {
            expenseData.title = `Salary Payment - ${validatedData.salaryMonth}/${validatedData.salaryYear}`;
        }
      }
    }

    await Expense.create({
      ...expenseData,
      createdBy: userId,
      auditLog: [{
        action: 'Created',
        performedBy: userId,
        date: new Date(),
        details: 'Expense record created'
      }]
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create expense";
      return { success: false, error: errorMessage };
  }
}

export async function updateExpense(id: string, data: Partial<z.infer<typeof expenseSchema>>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    await dbConnect();
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return { success: false, error: "Expense not found" };
    }

    // If updating to salary, check duplicates again (excluding self)
    if (data.category === 'Salary' || (expense.category === 'Salary' && (data.salaryMonth || data.salaryYear))) {
        const tId = data.teacherId || expense.teacherId;
        const sMonth = data.salaryMonth || expense.salaryMonth;
        const sYear = data.salaryYear || expense.salaryYear;

        if (tId && sMonth && sYear) {
            const existingSalary = await Expense.findOne({
                category: 'Salary',
                teacherId: tId,
                salaryMonth: sMonth,
                salaryYear: sYear,
                status: 'active',
                _id: { $ne: id }
            });

            if (existingSalary) {
                return { success: false, error: "Another salary record exists for this teacher/month/year." };
            }
        }
    }

    const updates: ExpenseUpdates = {
        ...data,
        auditLog: [
            ...expense.auditLog,
            {
                action: 'Updated',
                performedBy: userId,
                date: new Date(),
                details: `Updated fields: ${Object.keys(data).join(', ')}`
            }
        ]
    };

    if (updates.teacherId === "") {
        delete updates.teacherId;
        updates.teacherId = undefined; // Use undefined instead of null to match type
    }

    await Expense.findByIdAndUpdate(id, updates);
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/dashboard");
    return { success: true };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update expense";
    return { success: false, error: errorMessage };
  }
}

export async function deleteExpense(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    await dbConnect();
    const expense = await Expense.findById(id);
    if (!expense) return { success: false, error: "Expense not found" };

    await Expense.findByIdAndUpdate(id, {
        status: 'deleted',
        $push: {
            auditLog: {
                action: 'Deleted',
                performedBy: userId,
                date: new Date(),
                details: 'Soft deleted record'
            }
        }
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete expense";
      return { success: false, error: errorMessage };
  }
}

export async function getExpenses({ 
  page = 1, 
  limit = 10, 
  search = "", 
  startDate, 
  endDate, 
  category 
}: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  await dbConnect();

  const query: ExpenseQuery = { status: 'active' };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    query.expenseDate = {};
    if (startDate) query.expenseDate.$gte = new Date(startDate);
    if (endDate) query.expenseDate.$lte = new Date(endDate);
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  const skip = (page - 1) * limit;

  const expenses = await Expense.find(query)
    .sort({ expenseDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('teacherId', 'name')
    .populate('createdBy', 'name')
    .lean();

  const total = await Expense.countDocuments(query);

  return {
    expenses: (expenses as unknown as ExpenseDoc[]).map((e) => ({
        ...e,
        id: e._id.toString(),
        _id: e._id.toString(),
        teacherId: e.teacherId && typeof e.teacherId === 'object' && 'name' in e.teacherId ? { ...e.teacherId, _id: e.teacherId._id.toString() } : null,
        createdBy: e.createdBy && typeof e.createdBy === 'object' && 'name' in e.createdBy ? { ...e.createdBy, _id: e.createdBy._id.toString() } : null,
        auditLog: e.auditLog ? e.auditLog.map((log) => ({
            ...log,
            _id: log._id ? log._id.toString() : undefined,
            performedBy: log.performedBy ? log.performedBy.toString() : null
        })) : [],
    })),
    totalPages: Math.ceil(total / limit),
    total
  };
}

export async function getAllExpensesForExport({ 
  search = "", 
  startDate, 
  endDate, 
  category 
}: {
  search?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  await dbConnect();

  const query: ExpenseQuery = { status: 'active' };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    query.expenseDate = {};
    if (startDate) query.expenseDate.$gte = new Date(startDate);
    if (endDate) query.expenseDate.$lte = new Date(endDate);
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  const expenses = await Expense.find(query)
    .sort({ expenseDate: -1 })
    .populate('teacherId', 'name')
    .populate('createdBy', 'name')
    .lean();

  return (expenses as unknown as ExpenseDoc[]).map((e) => ({
      Date: new Date(e.expenseDate).toLocaleDateString(),
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      Description: e.description || '',
      'Teacher Name': e.teacherId && typeof e.teacherId === 'object' && 'name' in e.teacherId ? e.teacherId.name : '-',
      'Created By': e.createdBy && typeof e.createdBy === 'object' && 'name' in e.createdBy ? e.createdBy.name : '-'
  }));
}

export async function getExpenseStats(startDate?: string, endDate?: string) {
    await dbConnect();
    
    const query: ExpenseQuery = { status: 'active' };
    
    if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = new Date(startDate);
        if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const result = await Expense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return result.length > 0 ? result[0].total : 0;
}
