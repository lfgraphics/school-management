import { getTeachers } from "@/actions/teacher"
import { TeachersContent } from "@/components/teachers/teachers-content"

export default async function TeachersPage() {
  const teachers = await getTeachers("")

  return (
    <TeachersContent initialTeachers={teachers} isAdmin={false} />
  )
}
