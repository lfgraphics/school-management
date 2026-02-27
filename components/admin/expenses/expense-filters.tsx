"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { DateRange } from "react-day-picker"
import { useEffect, useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { format } from "date-fns"

interface ExpenseFiltersProps {
  onFilter: (filters: {
    search?: string
    category?: string
    startDate?: string
    endDate?: string
  }) => void
  isLoading?: boolean
}

export function ExpenseFilters({ onFilter, isLoading }: ExpenseFiltersProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [date, setDate] = useState<DateRange | undefined>(undefined)

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    onFilter({
      search: debouncedSearch || undefined,
      category: (category && category !== "all") ? category : undefined,
      startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
      endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined
    })
  }, [debouncedSearch, category, date, onFilter])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <Input
        placeholder="Search expenses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-[250px]"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
        <Select value={category} onValueChange={setCategory} disabled={isLoading}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Salary">Salary</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
            <SelectItem value="Supplies">Supplies</SelectItem>
            <SelectItem value="Utilities">Utilities</SelectItem>
            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>
        <CalendarDateRangePicker date={date} setDate={setDate} className="w-full sm:w-auto" />
      </div>
    </div>
  )
}
