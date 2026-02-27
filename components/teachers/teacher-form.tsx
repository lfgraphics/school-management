"use client"

import { useForm, useFieldArray, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Plus, Trash } from "lucide-react"
import { createTeacher, updateTeacher } from "@/actions/teacher"
import { useRouter, usePathname } from "next/navigation"
import { FileUploader } from "@/components/ui/file-uploader"
import { Teacher } from "@/types"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number is required"),
  joiningDate: z.string().min(1, "Joining Date is required"),
  aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar number must be 12 digits"),
  
  // Optional
  pastExperience: z.object({
    totalExperience: z.coerce.number().default(0),
    experienceLetter: z.string().optional().nullable()
  }).optional(),
  governmentTeacherId: z.string().optional(),
  
  parents: z.object({
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
  }),

  salary: z.object({
    amount: z.coerce.number().min(1, "Salary amount is required"),
    effectiveDate: z.string().default(new Date().toISOString().split('T')[0]),
  }),

  documents: z.array(z.object({
    type: z.string().min(1, "Document Type is required"),
    image: z.string().min(1, "Document Image is required"),
    documentNumber: z.string().optional(),
  })).optional(),
})

interface TeacherFormProps {
  teacher?: Teacher
  isEdit?: boolean
}

export function TeacherForm({ teacher, isEdit = false }: TeacherFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [photo, setPhoto] = useState<string | null>(teacher?.photo || null)

  const form = useForm<z.infer<typeof formSchema>>({
    // @ts-expect-error Zod types mismatch
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      name: teacher?.name || "",
      email: teacher?.email || "",
      phone: teacher?.phone || "",
      joiningDate: teacher?.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : "",
      aadhaar: teacher?.aadhaar || "",
      pastExperience: {
        totalExperience: teacher?.pastExperience?.totalExperience || 0,
        experienceLetter: teacher?.pastExperience?.experienceLetter || "",
      },
      governmentTeacherId: teacher?.governmentTeacherId || "",
      parents: {
        fatherName: teacher?.parents?.fatherName || "",
        motherName: teacher?.parents?.motherName || "",
      },
      salary: {
        amount: teacher?.salary?.amount || 0,
        effectiveDate: teacher?.salary?.effectiveDate ? new Date(teacher.salary.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      },
      documents: teacher?.documents || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "documents",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const payload = {
        ...values,
        photo: photo || undefined,
        pastExperience: values.pastExperience ? {
          totalExperience: values.pastExperience.totalExperience,
          experienceLetter: values.pastExperience.experienceLetter || undefined
        } : undefined,
      }
      
      let result;
      if (isEdit && teacher) {
        result = await updateTeacher(teacher._id, payload)
      } else {
        result = await createTeacher(payload)
      }
      
      if (result.success) {
        toast.success(`Teacher ${isEdit ? 'updated' : 'created'} successfully`)
        const redirectPath = pathname?.startsWith("/admin") ? "/admin/teachers" : "/teachers"
        router.push(redirectPath) 
        router.refresh()
      } else {
        toast.error(`Failed to ${isEdit ? 'update' : 'create'} teacher: ${result.error}`)
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Teacher Details' : 'Add New Teacher'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="teacher@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadhaar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit Aadhaar" maxLength={12} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Parents */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Parents (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parents.fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Father Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parents.motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mother Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Professional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="governmentTeacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Govt Teacher ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Unique Govt ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="salary.amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Salary Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="salary.effectiveDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Effective Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pastExperience.totalExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Experience (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pastExperience.experienceLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Letter (Image)</FormLabel>
                      <FormControl>
                        <FileUploader 
                            value={field.value || null} 
                            onChange={field.onChange} 
                            label="Upload Letter"
                            previewHeight={150}
                            previewWidth={200}
                            className="mt-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Documents & Photos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <FormLabel>Teacher Photo</FormLabel>
                  <FileUploader 
                    value={photo} 
                    onChange={setPhoto} 
                    label="Upload Photo" 
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <FormLabel>Documents</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ type: "", image: "", documentNumber: "" })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Document
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => remove(index)}
                                >
                                    <Trash className="h-3 w-3" />
                                </Button>
                                <div className="space-y-3">
                                    <FormField
                                        control={form.control}
                                        name={`documents.${index}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Document Type</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. PAN, Aadhaar, Experience Cert" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`documents.${index}.documentNumber`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Document Number (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doc No." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`documents.${index}.image`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Document Image</FormLabel>
                                                <FormControl>
                                                    <FileUploader 
                                                        value={field.value || null} 
                                                        onChange={field.onChange} 
                                                        label=""
                                                        previewHeight={150}
                                                        previewWidth={200}
                                                        className="mt-0"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Update Teacher' : 'Create Teacher'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
