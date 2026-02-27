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
import { MoreHorizontal, Trash, Power } from "lucide-react"
import { toast } from "sonner"
import { deleteStaff, toggleStaffStatus } from "@/actions/admin"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface StaffActionsProps {
  id: string
  isActive: boolean
}

export function StaffActions({ id, isActive }: StaffActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleToggleStatus() {
    setIsLoading(true)
    try {
      const result = await toggleStaffStatus(id, !isActive)
      if (result.success) {
        toast.success(`Staff member ${isActive ? 'deactivated' : 'activated'} successfully`)
      } else {
        toast.error(`Failed to update status: ${result.error}`)
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return

    setIsLoading(true)
    try {
      const result = await deleteStaff(id)
      if (result.success) {
        toast.success("Staff member deleted successfully")
      } else {
        toast.error(`Failed to delete staff: ${result.error}`)
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

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
        <DropdownMenuItem onClick={handleToggleStatus}>
          <Power className="mr-2 h-4 w-4" />
          {isActive ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
