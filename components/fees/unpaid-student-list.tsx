'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface UnpaidStudent {
  id: string
  name: string
  registrationNumber: string
  className: string
  amount: number
  details: string[]
  photo?: string
  contactNumber?: string
}

interface UnpaidStudentListProps {
  students: UnpaidStudent[]
}

export function UnpaidStudentList({ students }: UnpaidStudentListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No unpaid students found</h3>
        <p className="text-muted-foreground">All students have paid their fees!</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Unpaid Details</TableHead>
            <TableHead className="text-right">Amount Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.photo} />
                    <AvatarFallback>{student.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.registrationNumber}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{student.className}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {student.contactNumber || 'N/A'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {student.details.map((detail, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {detail}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-bold text-red-600 text-lg">
                  ₹{student.amount.toLocaleString()}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
