"use server"

import dbConnect from "@/lib/db"
import Student from "@/models/Student"
import Class from "@/models/Class"
import Counter from "@/models/Counter"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function getClasses() {
  interface ClassDoc {
    _id: { toString: () => string };
    name: string;
    exams?: string[];
  }

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

const parentSchema = z.object({
  name: z.string().optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be 12 digits").optional().or(z.literal("")),
}).optional();

const registerStudentSchema = z.object({
  registrationNumber: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  classId: z.string().min(1, "Class is required"),
  section: z.enum(["A", "B", "C", "D"]).default("A"),
  rollNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  dateOfAdmission: z.string().optional(), // Can be string from form
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  
  parents: z.object({
    father: parentSchema,
    mother: parentSchema
  }).optional(),

  // Legacy fields for backward compatibility/form handling
  fatherName: z.string().optional(), 
  motherName: z.string().optional(),

  address: z.string().min(1, "Address is required"),
  mobile: z.array(z.string().min(10, "Valid mobile number is required")).min(1, "At least one mobile number is required"),
  email: z.array(z.string().email("Invalid email")).optional(),
  photo: z.string().nullable().optional(),
  documents: z.array(z.object({
    type: z.string(),
    image: z.string(),
    documentNumber: z.string().optional()
  })).optional(),
  
  pen: z.string().optional(),
  lastInstitution: z.string().optional(),
  tcNumber: z.string().optional(),
})

export async function getNextRegistrationNumber() {
  await dbConnect();
  
  // Try to find existing counter
  let counter = await Counter.findById('registrationNumber');
  
  if (!counter) {
    // If not exists, initialize with 214 so next is 215
    counter = await Counter.create({ _id: 'registrationNumber', seq: 214 });
  }
  
  // Return the *next* number (seq + 1) formatted
  const nextSeq = counter.seq + 1;
  return String(nextSeq).padStart(4, '0');
}

// Function to actually increment and get
async function incrementRegistrationNumber() {
  await dbConnect();
  const counter = await Counter.findByIdAndUpdate(
    'registrationNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // If we just created it (upsert), and default is 0, we might want to start at 215.
  // But setDefaultsOnInsert sets seq to 0. 
  // If it was just created, seq became 1. We want 215.
  // So we should handle the initialization carefully.
  // Better approach: ensure it exists or use a safer update.
  
  // If the counter was 0 (fresh), we want it to jump to 215?
  // Or just trust the `getNextRegistrationNumber` initialized it.
  
  // Let's rely on `getNextRegistrationNumber` having been called or just safe check.
  if (counter.seq < 215) {
      // If for some reason it's low (e.g. fresh DB), force it to 215
      const updated = await Counter.findByIdAndUpdate(
          'registrationNumber',
          { $set: { seq: 215 } },
          { new: true }
      );
      return String(updated.seq).padStart(4, '0');
  }

  return String(counter.seq).padStart(4, '0');
}


export async function registerStudent(data: z.infer<typeof registerStudentSchema>) {
  try {
    registerStudentSchema.parse(data);
    await dbConnect();
    
    let registrationNumber = data.registrationNumber;
    
    if (!registrationNumber) {
        // Auto-increment
        registrationNumber = await incrementRegistrationNumber();
    } else {
        // Check uniqueness if manually provided
        const existing = await Student.findOne({ registrationNumber });
        if (existing) {
             return { success: false, error: "Registration Number already exists" };
        }
    }

    // Prepare parents object
    const parents = {
        father: {
            name: data.parents?.father?.name || data.fatherName,
            aadhaarNumber: data.parents?.father?.aadhaarNumber
        },
        mother: {
            name: data.parents?.mother?.name || data.motherName,
            aadhaarNumber: data.parents?.mother?.aadhaarNumber
        }
    };
    
    await Student.create({
      registrationNumber,
      name: data.name,
      classId: data.classId,
      section: data.section,
      rollNumber: data.rollNumber,
      dateOfBirth: new Date(data.dateOfBirth),
      dateOfAdmission: data.dateOfAdmission ? new Date(data.dateOfAdmission) : new Date(),
      admissionDate: new Date(), // Keep synced for now
      gender: data.gender,
      
      parents,
      // Keep flat fields for now if needed, but schema handles them.
      // We updated schema to put them in parents.
      // But we kept fatherName/motherName in schema as deprecated.
      fatherName: parents.father.name,
      motherName: parents.mother.name,

      address: data.address,
      contacts: {
        mobile: data.mobile,
        email: data.email || []
      },
      photo: data.photo,
      documents: data.documents,
      
      pen: data.pen,
      lastInstitution: data.lastInstitution,
      tcNumber: data.tcNumber,
      
      isActive: true,
    });
    
    revalidatePath("/students/list");
    
    return { success: true, regNo: registrationNumber };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function updateStudent(id: string, data: z.infer<typeof registerStudentSchema>) {
    try {
      registerStudentSchema.parse(data);
      await dbConnect();
      
      // Prepare parents object
      const parents = {
        father: {
            name: data.parents?.father?.name || data.fatherName,
            aadhaarNumber: data.parents?.father?.aadhaarNumber
        },
        mother: {
            name: data.parents?.mother?.name || data.motherName,
            aadhaarNumber: data.parents?.mother?.aadhaarNumber
        }
      };

      interface StudentUpdateData {
          name: string;
          classId: string;
          section?: string;
          rollNumber?: string;
          dateOfBirth: Date;
          dateOfAdmission?: Date;
          gender?: string | null;
          parents?: {
            father: { name?: string; aadhaarNumber?: string };
            mother: { name?: string; aadhaarNumber?: string };
          };
          fatherName: string;
          motherName: string;
          address: string;
          contacts: { mobile: string[], email: string[] };
          photo?: string | null;
          documents?: { type: string, image: string, documentNumber?: string }[];
          registrationNumber?: string;
          pen?: string;
          lastInstitution?: string;
          tcNumber?: string;
      }

      const updateData: StudentUpdateData = {
        name: data.name,
        classId: data.classId,
        section: data.section,
        rollNumber: data.rollNumber,
        dateOfBirth: new Date(data.dateOfBirth),
        dateOfAdmission: data.dateOfAdmission ? new Date(data.dateOfAdmission) : undefined,
        gender: data.gender,
        
        parents,
        fatherName: parents.father.name || "",
        motherName: parents.mother.name || "",
        
        address: data.address,
        contacts: {
            mobile: data.mobile,
            email: data.email || []
        },
        photo: data.photo,
        documents: data.documents,
        
        pen: data.pen,
        lastInstitution: data.lastInstitution,
        tcNumber: data.tcNumber,
      };

      if (data.registrationNumber) {
        // Check uniqueness if changing
        const existing = await Student.findOne({ 
            registrationNumber: data.registrationNumber,
            _id: { $ne: id }
        });
        if (existing) {
             return { success: false, error: "Registration Number already exists" };
        }
        updateData.registrationNumber = data.registrationNumber;
      }
      
      await Student.findByIdAndUpdate(id, updateData);
      
      revalidatePath("/students/list");
      revalidatePath(`/students/${id}`);
      
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      return { success: false, error: message };
    }
}

export async function deleteStudent(id: string) {
    try {
        await dbConnect();
        await Student.findByIdAndUpdate(id, { isActive: false });
        revalidatePath("/students/list");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
    }
}

interface StudentQuery {
    isActive: boolean;
    $or?: { [key: string]: { $regex: string, $options: string } }[];
    classId?: string;
}

interface StudentDoc {
    _id: { toString: () => string };
    registrationNumber: string;
    name: string;
    gender?: string;
    classId?: { name: string; _id: { toString: () => string } };
    section?: string;
    rollNumber?: string;
    fatherName: string; // legacy
    parents?: { father?: { name?: string }, mother?: { name?: string } };
    contacts?: { mobile?: string[]; email?: string[] };
    photo?: string;
    motherName: string; // legacy
    dateOfBirth: Date;
    address: string;
    documents?: { type: string; image: string; documentNumber?: string; _id?: { toString: () => string } }[];
}

export async function getStudents(searchQuery?: string, classId?: string) {
  await dbConnect();
  
  const query: StudentQuery = { isActive: true };
  
  if (searchQuery) {
    query.$or = [
      { name: { $regex: searchQuery, $options: 'i' } },
      { registrationNumber: { $regex: searchQuery, $options: 'i' } },
    ];
  }
  
  if (classId && classId !== "all") {
    query.classId = classId;
  }
  
  const students = await Student.find(query)
    .populate('classId', 'name')
    .sort({ createdAt: -1 })
    .lean();
    
  return students.map((s: unknown) => {
    const student = s as StudentDoc;
    return {
      id: student._id.toString(),
      registrationNumber: student.registrationNumber,
      name: student.name,
      gender: student.gender,
      className: student.classId?.name || 'Unknown',
      section: student.section,
      rollNumber: student.rollNumber,
      fatherName: student.parents?.father?.name || student.fatherName,
      mobile: student.contacts?.mobile?.[0] || '', // Display first mobile
      photo: student.photo,
    };
  });
}

export async function getStudentById(id: string) {
  await dbConnect();
  const studentResult = await Student.findById(id).populate('classId', 'name').lean();
  if (!studentResult) return null;
  
  const student = studentResult as unknown as StudentDoc & { 
      pen?: string; 
      lastInstitution?: string; 
      tcNumber?: string; 
      dateOfAdmission?: Date;
      parents?: {
          father?: { name?: string; aadhaarNumber?: string };
          mother?: { name?: string; aadhaarNumber?: string };
      }
  };
  
  return {
    id: student._id.toString(),
    registrationNumber: student.registrationNumber,
    name: student.name,
    classId: student.classId?._id.toString() || '',
    className: student.classId?.name || '',
    section: student.section || 'A',
    rollNumber: student.rollNumber || '',
    gender: (student.gender as "Male" | "Female" | "Other") || "Male",
    
    // Support both new nested and old flat structure
    fatherName: student.parents?.father?.name || student.fatherName,
    fatherAadhaar: student.parents?.father?.aadhaarNumber || '',
    motherName: student.parents?.mother?.name || student.motherName,
    motherAadhaar: student.parents?.mother?.aadhaarNumber || '',
    
    email: student.contacts?.email || [],
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : '',
    dateOfAdmission: student.dateOfAdmission ? student.dateOfAdmission.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    
    address: student.address,
    mobile: student.contacts?.mobile || [],
    photo: student.photo,
    documents: student.documents ? student.documents.map((doc) => ({
        type: doc.type,
        image: doc.image,
        documentNumber: doc.documentNumber,
        _id: doc._id ? doc._id.toString() : undefined
    })) : [],
    
    pen: student.pen || '',
    lastInstitution: student.lastInstitution || '',
    tcNumber: student.tcNumber || '',
  };
}
