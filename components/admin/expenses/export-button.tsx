"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import * as XLSX from "xlsx"
import { getAllExpensesForExport } from "@/actions/expense"
import { toast } from "sonner"

interface ExportButtonProps {
  search?: string
  startDate?: string
  endDate?: string
  category?: string
}

export function ExportButton({ search, startDate, endDate, category }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const data = await getAllExpensesForExport({ search, startDate, endDate, category })
      
      if (data.length === 0) {
        toast.warning("No data to export")
        return
      }

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses")
      
      // Auto-width columns
      const wscols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 5, 15) }))
      worksheet['!cols'] = wscols

      XLSX.writeFile(workbook, `Expenses_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success("Export successful")
    } catch (error) {
      console.error(error)
      toast.error("Failed to export data")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isLoading}>
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Export to Excel
    </Button>
  )
}
