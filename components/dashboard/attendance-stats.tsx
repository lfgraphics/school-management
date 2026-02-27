"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "../ui/button"

interface AttendanceStatsProps {
  data: {
    totalStudents: number
    totalPresent: number
    totalAbsent: number
    totalHoliday: number
    classWise: {
      name: string
      present: number
      absent: number
      holiday: number
      total: number
    }[]
  }
}

export function AttendanceStats({ data }: AttendanceStatsProps) {
  const pieData = [
    { name: "Present", value: data.totalPresent, color: "#16a34a" }, // green-600
    { name: "Absent", value: data.totalAbsent, color: "#dc2626" }, // red-600
    { name: "Holiday", value: data.totalHoliday, color: "#2563eb" }, // blue-600
  ].filter(d => d.value > 0);

  const notMarked = data.totalStudents - (data.totalPresent + data.totalAbsent + data.totalHoliday);
  if (notMarked > 0) {
    pieData.push({ name: "Not Marked", value: notMarked, color: "#9ca3af" }); // gray-400
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Today&apos;s Attendance
          </div>
          <Link href="/attendance/dashboard" className="text-sm text-primary">
            <Button className="flex items-center gap-2" variant="outline">
              View Detailed
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="h-[200px] md:h-[300px] relative min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 flex-wrap text-xs">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="text-sm font-medium mb-2 sticky top-0 bg-background pb-2">Class-wise Breakdown</h4>
          {data.classWise.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance marked today.</p>
          ) : (
            <div className="space-y-2">
              {data.classWise.map(cls => (
                <div key={cls.name} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                  <span className="font-medium">{cls.name}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600 font-medium">P: {cls.present}</span>
                    <span className="text-red-600 font-medium">A: {cls.absent}</span>
                    {cls.holiday > 0 && <span className="text-blue-600 font-medium">H: {cls.holiday}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
