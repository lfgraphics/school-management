export interface Parent {
  name?: string;
  aadhaarNumber?: string;
}

export interface Parents {
  father: Parent;
  mother: Parent;
}

export interface Document {
  type: string;
  image: string; // base64
  documentNumber?: string;
}

export interface Student {
  _id: string;
  id: string; // virtual getter often used
  registrationNumber: string;
  name: string;
  classId: string;
  className?: string; // populated
  section: string;
  rollNumber?: string;
  dateOfBirth: string | Date; // Date object or string depending on context (form vs db)
  gender?: "Male" | "Female" | "Other";
  parents: Parents;
  address: string;
  mobile: string[];
  email: string[];
  photo?: string;
  documents: Document[];
  pen?: string;
  dateOfAdmission?: string | Date;
  lastInstitution?: string;
  tcNumber?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Legacy/Fallback fields for UI components that might expect flat structure
  fatherName?: string;
  fatherAadhaar?: string;
  motherName?: string;
  motherAadhaar?: string;
}

export interface Salary {
  amount: number;
  effectiveDate: string | Date;
}

export interface Teacher {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  joiningDate: string | Date;
  // documentNumber: string; // Removed in favor of documents array
  // photo: string; // Kept as separate field for profile photo, but could be in documents
  photo?: string;
  pastExperience?: {
    totalExperience: number;
    experienceLetter?: string;
  };
  experienceCertificate?: string; // Could be moved to documents array
  aadhaar: string;
  parents?: {
    fatherName?: string;
    motherName?: string;
  };
  governmentTeacherId?: string;
  teacherId: string;
  salary: Salary;
  documents: Document[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
