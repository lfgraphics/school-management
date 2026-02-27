import { getStudents } from "@/actions/student"
import { StudentsListContent } from "@/components/students/students-list-content"

export default async function StudentsListPage() {
  const students = await getStudents("")

  return (
    <StudentsListContent initialStudents={students} />
  )
}
