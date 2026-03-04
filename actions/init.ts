"use server"

import dbConnect from "@/lib/db"
import User from "@/models/User"
import bcrypt from "bcryptjs"

export async function checkInitializationStatus() {
  await dbConnect();
  const adminCount = await User.countDocuments({ role: 'admin' });
  return { isInitialized: adminCount > 0 };
}

export async function initializeSystem() {
  try {
    await dbConnect();
    
    // Safety check: Don't run if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return { success: false, error: "System is already initialized." };
    }

    // Create Admin User
    const adminUsername = 'Admin';
    const adminPassword = '123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await User.create({
      username: adminUsername,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'admin',
      requiresPasswordChange: true, // Force change on first login
      isActive: true
    });
    
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
