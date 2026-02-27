"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Trash, Edit } from "lucide-react"
import { toast } from "sonner"
import { deleteTeacher } from "@/actions/teacher"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TeacherActionsProps {
  id: string
  isAdmin: boolean
}

export function TeacherActions({ id, isAdmin }: TeacherActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) return

    setIsLoading(true)
    try {
      const result = await deleteTeacher(id)
      if (result.success) {
        toast.success("Teacher deleted successfully")
        router.refresh()
      } else {
        toast.error(`Failed to delete teacher: ${result.error}`)
      }
    } catch (error) {
      toast.error("Something went wrong")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const editPath = isAdmin ? `/admin/teachers/${id}` : `/teachers/${id}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
          <span className="sr-only">Open menu</span>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={editPath}>
            <Edit className="mr-2 h-4 w-4" />
            Edit / View
          </Link>
        </DropdownMenuItem>
        
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
