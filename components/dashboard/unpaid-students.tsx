import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface UnpaidStudentsProps {
  students: {
    id: string
    name: string
    className: string
    amount: number
    months: string[]
    photo?: string
  }[]
}

export function UnpaidStudents({ students }: UnpaidStudentsProps) {
  if (students.length === 0) {
    return <div className="text-sm text-muted-foreground">No unpaid students found for this period.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing top {students.length} students
        </p>
        <Link href="/fees/unpaid">
          <Button variant="outline" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Unpaid Months</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
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
                <TableCell className="max-w-[200px] truncate" title={student.months.join(', ')}>
                  {student.months.length > 3
                    ? `${student.months.slice(0, 3).join(', ')} +${student.months.length - 3} more`
                    : student.months.join(', ')}
                </TableCell>
                <TableCell className="text-right text-destructive font-bold">
                  ₹{student.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
