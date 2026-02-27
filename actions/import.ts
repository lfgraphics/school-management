"use server"

import dbConnect from "@/lib/db"
import Student from "@/models/Student"
import Class from "@/models/Class"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Zod schema for student import
const importStudentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  registrationNumber: z.string().optional(), // Optional, no auto-generation
  
  // Parent details
  fatherName: z.string().min(2, "Father Name is required"),
  fatherAadhaar: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), "Invalid Father Aadhaar"),
  motherName: z.string().optional().default(""),
  motherAadhaar: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), "Invalid Mother Aadhaar"),
  
  className: z.string().min(1, "Class Name is required"),
  section: z.enum(["A", "B", "C", "D"]).optional().default("A"),
  rollNumber: z.string().optional(),
  
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  dob: z.union([z.string(), z.date()]).optional().transform((val, ctx) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) {
          if (typeof val === 'string') {
              const parts = val.split(/[-/.]/);
              if (parts.length === 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  const year = parseInt(parts[2], 10);
                  const parsedDate = new Date(year, month, day);
                  if (!isNaN(parsedDate.getTime())) return parsedDate;
              }
          }
          ctx.addIssue({
            code: "custom",
            message: `Invalid Date format: "${val}".`,
          });
          return z.NEVER;
      }
      return date;
  }),
  
  address: z.string().optional().default(""),
  contactNumber: z.string().optional().default(""),
  email: z.string().email().optional(),
  
  // New fields
  pen: z.string().optional(),
  lastInstitution: z.string().optional(),
  tcNumber: z.string().optional(),
  
  dateOfAdmission: z.union([z.string(), z.date()]).optional().transform((val, ctx) => {
      if (!val) return new Date();
      const date = new Date(val);
       if (isNaN(date.getTime())) {
          if (typeof val === 'string') {
              const parts = val.split(/[-/.]/);
              if (parts.length === 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  const year = parseInt(parts[2], 10);
                  const parsedDate = new Date(year, month, day);
                  if (!isNaN(parsedDate.getTime())) return parsedDate;
              }
          }
          ctx.addIssue({
            code: "custom",
            message: `Invalid Admission Date format: "${val}"`,
          });
          return z.NEVER;
      }
      return date;
  })
})

export async function bulkImportStudents(data: Record<string, unknown>[], confirm: boolean = false) {
  try {
    await dbConnect();
    
    // Fetch all classes to map names to IDs
    const classes = await Class.find({}).lean();
    const classMap = new Map(classes.map(c => [c.name.trim().toLowerCase(), c._id]));
    
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    interface StudentInsert {
        registrationNumber?: string;
        name: string;
        classId: string;
        section: string;
        rollNumber?: string;
        dateOfBirth?: Date;
        parents: {
            father: { name: string; aadhaarNumber?: string };
            mother: { name: string; aadhaarNumber?: string };
        };
        address: string;
        gender?: string | null;
        contacts: { mobile: string[], email: string[] };
        isActive: boolean;
        dateOfAdmission: Date;
        pen?: string;
        lastInstitution?: string;
        tcNumber?: string;
        photo?: string;
        documents?: any[];
    }

    const studentsToInsert: StudentInsert[] = [];
    const batchRegistrationNumbers = new Set<string>(); // Track duplicates within the file itself

    // First pass: Validation and preparation
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // Assuming header is row 1
        
        // Skip empty rows
        if (!row['Student Name'] && !row['name'] && !row['Registration Number'] && !row['registrationNumber']) continue;

        try {
            const normalizedRow = {
                name: (row['Student Name'] || row['name']) as string,
                registrationNumber: row['Registration Number'] ? String(row['Registration Number']) : (row['registrationNumber'] ? String(row['registrationNumber']) : undefined),
                
                fatherName: (row['Father Name'] || row['fatherName']) as string,
                fatherAadhaar: row['Father Aadhaar'] ? String(row['Father Aadhaar']) : undefined,
                
                motherName: (row['Mother Name'] || row['motherName']) as string,
                motherAadhaar: row['Mother Aadhaar'] ? String(row['Mother Aadhaar']) : undefined,
                
                className: (row['Class Name'] || row['className']) as string,
                section: (row['Section'] || row['section']) ? String(row['Section'] || row['section']).trim().toUpperCase() || undefined : undefined,
                rollNumber: row['Roll Number'] ? String(row['Roll Number']) : undefined,
                
                gender: (row['Gender'] || row['gender']) as string,
                dob: row['Date of Birth'] || row['dob'],
                
                address: (row['Address'] || row['address']) as string,
                contactNumber: String(row['Contact Number'] || row['contactNumber'] || ""),
                email: (row['Email'] || row['email']) as string,
                
                pen: row['PEN'] ? String(row['PEN']) : undefined,
                lastInstitution: (row['Last Institution'] || row['lastInstitution']) as string,
                tcNumber: row['TC Number'] ? String(row['TC Number']) : undefined,
                
                dateOfAdmission: row['Admission Date'] || row['admissionDate'] || row['dateOfAdmission']
            };

            const result = importStudentSchema.safeParse(normalizedRow);
            
            if (!result.success) {
                const errorMessage = result.error.issues.map(i => {
                    if (i.code === "invalid_type") {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const issue = i as any;
                        return `Field '${i.path.join('.')}' expected ${issue.expected}, received ${issue.received}`;
                    }
                    return i.message;
                }).join(", ");
                throw new Error(`${errorMessage} (Student: ${normalizedRow.name})`);
            }

            const validated = result.data;
            
            // Check Class
            const classId = classMap.get(validated.className.trim().toLowerCase());
            if (!classId) {
                throw new Error(`Class "${validated.className}" not found`);
            }
            
            // Handle Registration Number (Only if provided)
            if (validated.registrationNumber) {
                // Check duplicate in current batch
                if (batchRegistrationNumbers.has(validated.registrationNumber)) {
                     throw new Error(`Duplicate Registration Number "${validated.registrationNumber}" in file`);
                }
                batchRegistrationNumbers.add(validated.registrationNumber);
            }

            studentsToInsert.push({
                registrationNumber: validated.registrationNumber, // Can be undefined now
                name: validated.name,
                classId: classId.toString(),
                section: validated.section,
                rollNumber: validated.rollNumber,
                dateOfBirth: validated.dob,
                
                parents: {
                    father: {
                        name: validated.fatherName,
                        aadhaarNumber: validated.fatherAadhaar
                    },
                    mother: {
                        name: validated.motherName || "N/A",
                        aadhaarNumber: validated.motherAadhaar
                    }
                },
                
                address: validated.address || "N/A",
                gender: validated.gender,
                contacts: {
                    mobile: validated.contactNumber ? [validated.contactNumber] : [],
                    email: validated.email ? [validated.email] : []
                },
                isActive: true,
                dateOfAdmission: validated.dateOfAdmission,
                
                pen: validated.pen,
                lastInstitution: validated.lastInstitution,
                tcNumber: validated.tcNumber
            });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            results.failureCount++;
            results.errors.push(`Row ${rowNumber}: ${message}`);
        }
    }

    // Second pass: Check DB for existing registration numbers
    const regsToCheck = Array.from(batchRegistrationNumbers);
    
    let existingRegSet = new Set<string>();
    if (regsToCheck.length > 0) {
        const existingRegs = await Student.find({ 
            registrationNumber: { $in: regsToCheck } 
        }).select('registrationNumber');
        existingRegSet = new Set(existingRegs.map(s => s.registrationNumber));
    }
    
    const finalBatch: StudentInsert[] = [];
    
    for (const student of studentsToInsert) {
            // Fix missing DOB before insert if needed
        if (!student.dateOfBirth) student.dateOfBirth = new Date("2020-01-01"); 
        
        // If reg number is provided, check uniqueness. If not, it's okay (optional).
        if (student.registrationNumber && existingRegSet.has(student.registrationNumber)) {
            results.failureCount++;
            results.errors.push(`Registration Number "${student.registrationNumber}" already exists in database`);
        } else {
            finalBatch.push(student);
        }
    }

    if (confirm && finalBatch.length > 0) {
        await Student.insertMany(finalBatch);
        
        revalidatePath('/students/list');
        revalidatePath('/admin/dashboard');
    }
    
    results.successCount = finalBatch.length;

    return { success: true, ...results };
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
