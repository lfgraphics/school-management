"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface UnpaidFiltersProps {
  classes: { id: string; name: string }[]
  onFilter: (filters: { 
    search?: string
    classId?: string
    startDate?: string
    endDate?: string
  }) => void
  isLoading?: boolean
}

export function UnpaidFilters({ classes, onFilter, isLoading }: UnpaidFiltersProps) {
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const applyFilters = () => {
    onFilter({
      search: search || undefined,
      classId: classId !== 'all' ? classId : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  }

  const clearFilters = () => {
    setSearch('')
    setClassId('all')
    setStartDate('')
    setEndDate('')
    onFilter({})
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name or Reg No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Class</label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger>
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={applyFilters} disabled={isLoading}>
          <Search className="mr-2 h-4 w-4" />
          Apply Filters
        </Button>
        <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  )
}
