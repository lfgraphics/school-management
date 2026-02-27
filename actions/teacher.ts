"use server"

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db"
import Teacher from "@/models/Teacher"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import crypto from "crypto"
import { Teacher as TeacherType } from "@/types"

// Helper to generate unique ID
function generateTeacherId(name: string, aadhaar: string, mobile: string): string {
  const input = `${name.trim().toLowerCase()}${aadhaar.trim()}${mobile.trim()}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 8).toUpperCase();
}

export async function createTeacher(data: Partial<TeacherType>) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    if (!data.name || !data.aadhaar || !data.phone) {
        return { success: false, error: "Missing required fields for ID generation" }
    }

    // Generate Teacher ID
    const teacherId = generateTeacherId(data.name, data.aadhaar, data.phone);

    // Check if ID already exists (collision check, though unlikely with this specific input unless duplicate entry)
    const existingTeacher = await Teacher.findOne({ teacherId });
    if (existingTeacher) {
      return { success: false, error: "Teacher with these details likely already exists." }
    }
    
    const newTeacher = await Teacher.create({
      ...data,
      teacherId,
    })

    revalidatePath("/admin/teachers")
    revalidatePath("/teachers")
    return { success: true, teacher: JSON.parse(JSON.stringify(newTeacher)) }
  } catch (error: any) {
    console.error("Error creating teacher:", error)
    const errorMessage = error.message?.length > 100 ? error.message.substring(0, 100) + "..." : error.message
    return { success: false, error: errorMessage }
  }
}

export async function updateTeacher(id: string, data: Partial<TeacherType>) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // If name/aadhaar/phone changes, should we regenerate ID? 
    // Usually IDs are immutable. Let's keep it immutable for now.
    
    const teacher = await Teacher.findByIdAndUpdate(id, data, { new: true })
    
    if (!teacher) {
      return { success: false, error: "Teacher not found" }
    }

    revalidatePath("/admin/teachers")
    revalidatePath("/teachers")
    revalidatePath(`/admin/teachers/${id}`)
    revalidatePath(`/teachers/${id}`)
    
    return { success: true, teacher: JSON.parse(JSON.stringify(teacher)) }
  } catch (error: any) {
    console.error("Error updating teacher:", error)
    const errorMessage = error.message?.length > 100 ? error.message.substring(0, 100) + "..." : error.message
    return { success: false, error: errorMessage }
  }
}

export async function deleteTeacher(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized. Only admins can delete teachers." }
    }

    const teacher = await Teacher.findByIdAndDelete(id)
    
    if (!teacher) {
      return { success: false, error: "Teacher not found" }
    }

    revalidatePath("/admin/teachers")
    revalidatePath("/teachers")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting teacher:", error)
    return { success: false, error: error.message }
  }
}

export async function getTeachers(query: string = "") {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if (!session) return []

    const searchRegex = new RegExp(query, "i")
    
    const teachers = await Teacher.find({
      $or: [
        { name: searchRegex },
        { teacherId: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { aadhaar: searchRegex },
      ]
    }).sort({ createdAt: -1 })

    return JSON.parse(JSON.stringify(teachers))
  } catch (error) {
    console.error("Error fetching teachers:", error)
    return []
  }
}

export async function getTeacherById(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)
    if (!session) return null

    const teacher = await Teacher.findById(id)
    if (!teacher) return null

    return JSON.parse(JSON.stringify(teacher))
  } catch (error) {
    console.error("Error fetching teacher:", error)
    return null
  }
}
