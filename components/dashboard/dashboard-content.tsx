"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FilePlus, UserRoundSearch, ClipboardList, CalendarCheck, IndianRupee } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { Overview } from "@/components/dashboard/overview"
import { CustomLineChart } from "@/components/dashboard/charts/line-chart"
import { CustomPieChart } from "@/components/dashboard/charts/pie-chart"
import { getDashboardStats } from "@/actions/dashboard"
import { UnpaidStudentsTable, UnpaidStudent } from "@/components/dashboard/unpaid-students-table"
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
interface DashboardStats {
  collected: number
  pending: number
  totalExpenses: number
  netProfit: number
  unpaid: number
  collectable: number
  recentSales: {
    id: string
    amount: number
    studentName: string
    contactNumber: string
    studentPhoto?: string
    status: string
    type: string
    month?: number
    year: number
    transactionDate: Date
  }[]
  overview: {
    name: string
    collected: number
    pending: number
    unpaid: number
    expense: number
    profit: number
  }[]
  classWise: {
    name: string
    collected: number
    pending: number
  }[]
  unpaidStudents: UnpaidStudent[]
  revenueChange: number
  pendingChange: number
  expenseChange: number
}

interface AttendanceStats {
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

interface DashboardContentProps {
  initialStats: DashboardStats
  attendanceStats: AttendanceStats
  classes: { id: string; name: string }[]
  totalStaff: number
  totalStudents: number
}

export function DashboardContent({
  initialStats,
  classes,
}: DashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [isPending, startTransition] = useTransition()

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [classId, setClassId] = useState("all")

  const handleFilterChange = (newDate: DateRange | undefined, newClassId: string) => {
    setDate(newDate)
    setClassId(newClassId)

    startTransition(async () => {
      const newStats = await getDashboardStats({
        startDate: newDate?.from,
        endDate: newDate?.to,
        classId: newClassId
      })
      setStats(newStats)
    })
  }

  const pendingData = stats.overview.map((item) => ({
    name: item.name,
    value: item.unpaid
  }))

  const profitData = [
    { name: 'Income', value: stats.collected, color: '#22c55e' },
    { name: 'Expense', value: stats.totalExpenses, color: '#ef4444' }
  ]

  // Approximation for Total Collection vs Should be Collected
  // We don't have exact "Should be Collected" per month in the overview data structure easily accessible for a line chart without backend changes,
  // but we can show the aggregate status.
  const collectionStatusData = [
    { name: 'Collected', value: stats.collected, color: '#22c55e' },
    { name: 'Pending', value: stats.pending, color: '#eab308' },
    { name: 'Unpaid (Deficit)', value: stats.unpaid, color: '#ef4444' }
  ]

  // const revenueChange = stats.revenueChange
  const pendingChange = stats.pendingChange
  // const expenseChange = stats.expenseChange

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-background">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>

        <div className="flex flex-wrap items-center gap-2">
          <DashboardFilter
            classes={classes}
            date={date}
            setDate={(d) => handleFilterChange(d, classId)}
            classId={classId}
            setClassId={(c) => handleFilterChange(date, c)}
            isLoading={isPending}
          />
        </div>
      </div>

      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* Row 1 */}
        {/* Total Amount Collected Chart - Large Card */}
        <Card className="col-span-2 row-span-1 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <Overview data={stats.overview} />
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.collected.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* Row 2 */}
        {/* Pending Fees Breakdown Chart - Large Card */}
        <Card className="col-span-3 row-span-1 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold">Pending Fees Breakdown</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              Unpaid Fees (Deficit)
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <CustomLineChart data={pendingData} color="#ef4444" height={150} />
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.netProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Income - Expense
            </p>
          </CardContent>
        </Card>

        {/* Row 3 */}
        {/* Income vs Expense */}
        <Card className="col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomPieChart data={profitData} height={250} />
          </CardContent>
        </Card>

        {/* Collection Status */}
        <Card className="col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Total Fee Collection Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomPieChart data={collectionStatusData} height={250} />
          </CardContent>
        </Card>

        {/* Row 4 */}
        {/* Pending This Month */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.pending.toLocaleString()}</div>
            <p className={`text-xs ${pendingChange <= 0 ? "text-green-600" : "text-red-600"}`}>
              {pendingChange > 0 ? "+" : ""}{pendingChange}% from last month
            </p>
            <Progress
              value={Math.abs(stats.pendingChange)}
              className="mt-2 h-1.5"
              indicatorclassname={stats.pendingChange <= 0 ? "bg-green-600" : "bg-red-600"}
            />
          </CardContent>
        </Card>

        {/* Row 2 */}

        {/* Reminders (Unpaid) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.unpaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Unpaid / Deficit
            </p>
            <Progress value={pendingChange} className="mt-4 h-2" />
          </CardContent>
        </Card>

        {/* New Student */}
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/students/admit" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">New Student</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Users className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium">Add new Student</span>
            </CardContent>
          </Link>
        </Card>

        {/* New Class */}
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/classes" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">New Class</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <FilePlus className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium">Add new Class</span>
            </CardContent>
          </Link>
        </Card>

        {/* Row 5 */}
        {/* Find */}
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/students/list" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">Find</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <UserRoundSearch className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium">Find Student</span>
            </CardContent>
          </Link>
        </Card>

        {/* Report */}
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/reports" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">Report</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <ClipboardList className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium text-center">Generate and Print Report</span>
            </CardContent>
          </Link>
        </Card>

        {/* Attendance */}
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/attendance/dashboard" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <CalendarCheck className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium text-center">Manage Attendance</span>
            </CardContent>
          </Link>
        </Card>

        {/* Features */}
        {/* <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Features Can Be Added</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>WhatsApp Intigration</TableCell>
                  <TableCell>5K - 15K</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Attendance Automation</TableCell>
                  <TableCell>8K - 25K</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/reports" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">Report</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <ClipboardList className="h-10 w-10 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-medium text-center">Generate and Print Report</span>
            </CardContent>
          </Link>
        </Card> */}

      </div>

      {/* Unpaid Students Table */}
      <UnpaidStudentsTable students={stats.unpaidStudents} />
    </div>
  )
}
