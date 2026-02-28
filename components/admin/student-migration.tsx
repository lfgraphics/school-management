"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Loader2, ArrowRight, Ban, CheckCircle } from "lucide-react"
import { getStudentsByClass, getInactiveStudentsByClass, migrateStudents, bulkDeactivateStudents, bulkReactivateStudents } from "@/actions/migration"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StudentMigrationProps {
  classes: { id: string; name: string }[]
}

export function StudentMigration({ classes }: StudentMigrationProps) {
  const [activeTab, setActiveTab] = useState("migrate")
  const [sourceClass, setSourceClass] = useState<string>("")
  const [targetClass, setTargetClass] = useState<string>("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Reset state when tab changes
  const onTabChange = (value: string) => {
      setActiveTab(value);
      setSourceClass("");
      setTargetClass("");
      setStudents([]);
      setSelectedStudents([]);
  }

  // Fetch students when source class changes
  useEffect(() => {
    if (sourceClass) {
      setIsFetching(true)
      const fetchFn = activeTab === "reactivate" ? getInactiveStudentsByClass : getStudentsByClass;
      
      fetchFn(sourceClass).then((data) => {
        setStudents(data)
        // Auto-select all only for migration? Or consistent behavior?
        // Let's select all by default for convenience
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSelectedStudents(data.map((s: any) => s.id)) 
        setIsFetching(false)
      })
    } else {
      setStudents([])
      setSelectedStudents([])
    }
  }, [sourceClass, activeTab])

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map((s) => s.id))
    }
  }

  const handleMigrate = async () => {
    if (!sourceClass || !targetClass) {
      toast.error("Please select both source and target classes")
      return
    }
    if (sourceClass === targetClass) {
      toast.error("Source and target classes cannot be the same")
      return
    }
    if (selectedStudents.length === 0) {
      toast.error("No students selected")
      return
    }

    setIsLoading(true)
    try {
      const result = await migrateStudents(selectedStudents, targetClass)
      if (result.success) {
        toast.success(`Successfully migrated ${result.count} students`)
        const remaining = students.filter(s => !selectedStudents.includes(s.id));
        setStudents(remaining);
        setSelectedStudents(remaining.map(s => s.id));
      } else {
        toast.error(result.error)
      }
    } catch (error: unknown) {
      console.error(error)
      toast.error("Migration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!sourceClass) {
      toast.error("Please select a class")
      return
    }
    if (selectedStudents.length === 0) {
      toast.error("No students selected")
      return
    }

    if (!confirm(`Are you sure you want to deactivate ${selectedStudents.length} students?`)) {
        return;
    }

    setIsLoading(true)
    try {
      const result = await bulkDeactivateStudents(selectedStudents)
      if (result.success) {
        toast.success(`Successfully deactivated ${result.count} students`)
        const remaining = students.filter(s => !selectedStudents.includes(s.id));
        setStudents(remaining);
        setSelectedStudents(remaining.map(s => s.id));
      } else {
        toast.error(result.error)
      }
    } catch (error: unknown) {
      console.error(error)
      toast.error("Deactivation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!sourceClass) {
      toast.error("Please select a class")
      return
    }
    if (selectedStudents.length === 0) {
      toast.error("No students selected")
      return
    }

    setIsLoading(true)
    try {
      const result = await bulkReactivateStudents(selectedStudents)
      if (result.success) {
        toast.success(`Successfully reactivated ${result.count} students`)
        const remaining = students.filter(s => !selectedStudents.includes(s.id));
        setStudents(remaining);
        setSelectedStudents(remaining.map(s => s.id));
      } else {
        toast.error(result.error)
      }
    } catch (error: unknown) {
      console.error(error)
      toast.error("Reactivation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const renderTable = (emptyMessage: string) => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={students.length > 0 && selectedStudents.length === students.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Reg. No</TableHead>
            <TableHead>Father Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isFetching ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={student.photo} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {student.name}
                    </div>
                </TableCell>
                <TableCell>{student.registrationNumber}</TableCell>
                <TableCell>{student.fatherName}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="migrate">Migrate Students</TabsTrigger>
          <TabsTrigger value="deactivate">Bulk Deactivate</TabsTrigger>
          <TabsTrigger value="reactivate">Reactivate</TabsTrigger>
        </TabsList>

        {/* Migrate Tab */}
        <TabsContent value="migrate">
          <Card>
            <CardHeader>
              <CardTitle>Migrate Class</CardTitle>
              <CardDescription>Move active students from one academic year/class to another.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Class</label>
                  <Select value={sourceClass} onValueChange={setSourceClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Source Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Class</label>
                  <Select value={targetClass} onValueChange={setTargetClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Target Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={c.id === sourceClass}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sourceClass && renderTable("No active students found in this class.")}

              <div className="flex justify-end">
                <Button onClick={handleMigrate} disabled={isLoading || selectedStudents.length === 0}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Migrate {selectedStudents.length} Students
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deactivate Tab */}
        <TabsContent value="deactivate">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Deactivate</CardTitle>
              <CardDescription>Mark active students as inactive (hidden from lists).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <label className="text-sm font-medium">Select Class</label>
                <Select value={sourceClass} onValueChange={setSourceClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class to Deactivate" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceClass && renderTable("No active students found in this class.")}

              <div className="flex justify-end">
                <Button variant="destructive" onClick={handleDeactivate} disabled={isLoading || selectedStudents.length === 0}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                  Deactivate {selectedStudents.length} Students
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reactivate Tab */}
        <TabsContent value="reactivate">
          <Card>
            <CardHeader>
              <CardTitle>Reactivate Students</CardTitle>
              <CardDescription>Restore inactive students back to active status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <label className="text-sm font-medium">Select Class (Last known)</label>
                <Select value={sourceClass} onValueChange={setSourceClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceClass && renderTable("No inactive students found in this class.")}

              <div className="flex justify-end">
                <Button onClick={handleReactivate} disabled={isLoading || selectedStudents.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Reactivate {selectedStudents.length} Students
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
