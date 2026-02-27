"use server"

import dbConnect from "@/lib/db"
import Student from "@/models/Student"

export async function generateIdCard(studentId: string) {
  await dbConnect();
  
  const student = await Student.findById(studentId).populate('classId', 'name').lean();
  if (!student) throw new Error("Student not found");
  
  return {
    success: true,
    data: {
      id: student._id.toString(),
      name: student.name,
      registrationNumber: student.registrationNumber,
      className: student.classId.name,
      section: student.section,
      fatherName: student.parents?.father?.name || student.fatherName,
      dob: student.dateOfBirth,
      address: student.address,
      mobile: student.contacts?.mobile?.[0] || '',
      photo: student.photo
    }
  };
}

export async function generateBulkIdCards(classId: string) {
  await dbConnect();
  
  const students = await Student.find({ classId, isActive: true })
    .populate('classId', 'name')
    .sort({ name: 1 })
    .lean();
    
  if (!students.length) return { success: false, error: "No students found in this class" };
  
  interface IdCardData {
      _id: { toString: () => string };
      name: string;
      registrationNumber: string;
      classId: { name: string };
      section: string;
      fatherName: string;
      parents?: { father?: { name?: string } };
      dateOfBirth: Date;
      address: string;
      contacts?: { mobile?: string[] };
      photo?: string;
  }

  const data = students.map((s: unknown) => {
    const student = s as IdCardData;
    return {
        id: student._id.toString(),
        name: student.name,
        registrationNumber: student.registrationNumber,
        className: student.classId.name,
        section: student.section,
        fatherName: student.parents?.father?.name || student.fatherName,
        dob: student.dateOfBirth,
        address: student.address,
        mobile: student.contacts?.mobile?.[0] || '',
        photo: student.photo
    };
  });
  
  return {
    success: true,
    data
  };
}
