import { getStudents } from "@/actions/student"
import { getClasses } from "@/actions/class"
import { StudentsListContent } from "@/components/students/students-list-content"

export default async function StudentsListPage() {
  const [students, classes] = await Promise.all([
    getStudents(""),
    getClasses()
  ])

  return (
    <StudentsListContent initialStudents={students} classes={classes} />
  )
}
