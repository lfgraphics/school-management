"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStudents } from "@/actions/student"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useDebounce } from "@/hooks/use-debounce"

interface StudentsListContentProps {
  initialStudents: any[]
}

export function StudentsListContent({ initialStudents }: StudentsListContentProps) {
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  
  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    startTransition(async () => {
      const data = await getStudents(debouncedSearch)
      setStudents(data)
    })
  }, [debouncedSearch])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Students List</h2>
        <div className="flex items-center space-x-2">
            <div className="relative w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                name="q" 
                placeholder="Search by name or reg no..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
        </div>
      </div>
      <div className={`rounded-md border ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Father&apos;s Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.registrationNumber}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.photo} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {student.name}
                    </div>
                  </TableCell>
                  <TableCell>{student.className}</TableCell>
                  <TableCell>{student.fatherName}</TableCell>
                  <TableCell>{student.mobile}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
