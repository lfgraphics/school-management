"use server"

import dbConnect from "@/lib/db"
import User from "@/models/User"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['staff', 'attendance_staff']).default('staff'),
})

export async function createStaff(data: z.infer<typeof createStaffSchema>) {
  try {
    // Validate input
    createStaffSchema.parse(data);
    
    await dbConnect();
    
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return { success: false, error: "Email already exists" };
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      isActive: true,
      requiresPasswordChange: false 
    });
    
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

interface StaffUser {
  _id: { toString: () => string };
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export async function getStaffList() {
  await dbConnect();
  const staff = await User.find({ role: { $in: ['staff', 'attendance_staff'] } }).sort({ createdAt: -1 }).lean();
  return staff.map((u: unknown) => {
    const user = u as StaffUser;
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
  });
}

export async function toggleStaffStatus(id: string, isActive: boolean) {
  try {
    await dbConnect();
    await User.findByIdAndUpdate(id, { isActive });
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function deleteStaff(id: string) {
  try {
    await dbConnect();
    await User.findByIdAndDelete(id);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
