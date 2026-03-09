"use client"

import { CalendarDateRangePicker } from "./date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"

interface DashboardFilterProps {
  classes: { id: string; name: string }[]
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  classId: string
  setClassId: (classId: string) => void
  isLoading?: boolean
}

export function DashboardFilter({ 
    classes, 
    date, 
    setDate, 
    classId, 
    setClassId,
    isLoading 
}: DashboardFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2 w-full sm:w-auto">
      <CalendarDateRangePicker date={date} setDate={setDate} />
      <Select value={classId} onValueChange={setClassId} disabled={isLoading}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
