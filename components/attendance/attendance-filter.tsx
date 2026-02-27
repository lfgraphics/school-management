"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { CalendarIcon, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AttendanceFilterProps {
  classes: { id: string; name: string }[]
  onFilter: (filters: { date?: Date; classId?: string; section?: string }) => void
  isLoading?: boolean
}

export function AttendanceFilter({ classes, onFilter, isLoading }: AttendanceFilterProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [classId, setClassId] = useState("all")
  const [section, setSection] = useState("all")

  const handleSearch = () => {
    onFilter({
      date,
      classId: classId !== "all" ? classId : undefined,
      section: section !== "all" ? section : undefined
    })
  }

  const handleReset = () => {
    setDate(undefined)
    setClassId("all")
    setSection("all")
    onFilter({})
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg border">
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full md:w-[240px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2 w-full md:w-auto">
        <label className="text-sm font-medium">Class</label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Classes" />
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

      <div className="flex flex-col gap-2 w-full md:w-auto">
        <label className="text-sm font-medium">Section</label>
        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="w-full md:w-[120px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {["A", "B", "C", "D"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <Button onClick={handleSearch} disabled={isLoading} className="flex-1 md:flex-none">
          <Search className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isLoading} className="flex-1 md:flex-none">
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}
