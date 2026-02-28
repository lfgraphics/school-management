"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, School, FileText, Banknote, AlertCircle, TrendingDown, TrendingUp } from "lucide-react"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { Overview } from "@/components/dashboard/overview"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { ClassPerformance } from "@/components/dashboard/class-performance"
import { UnpaidStudents } from "@/components/dashboard/unpaid-students"
import { AttendanceStats } from "@/components/dashboard/attendance-stats"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getDashboardStats } from "@/actions/dashboard"
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"

interface DashboardStats {
    collected: number
    pending: number
    totalExpenses: number
    netProfit: number
    unpaid: number
    collectable: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentSales: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overview: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classWise: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unpaidStudents: any[]
}

interface DashboardContentProps {
    initialStats: DashboardStats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attendanceStats: any
    classes: { id: string; name: string }[]
    totalStaff: number
    totalStudents: number
}

export function DashboardContent({ 
    initialStats, 
    attendanceStats, 
    classes,
    totalStaff,
    totalStudents
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

    // Net Profit Logic
    let profitColorClass = "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-900"
    let profitIconColor = "text-blue-600 dark:text-blue-400"
    
    if (stats.netProfit > 0) {
        profitColorClass = "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-900"
        profitIconColor = "text-green-600 dark:text-green-400"
    } else if (stats.netProfit < 0) {
        profitColorClass = "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-900"
        profitIconColor = "text-red-600 dark:text-red-400"
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/attendance/dashboard">
                        <Button variant="outline">Attendance Dashboard</Button>
                    </Link>
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
            
            {/* Bento Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)] ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* Total Students */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                    </CardContent>
                </Card>

                {/* Total Staff */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStaff}</div>
                    </CardContent>
                </Card>

                {/* Net Profit */}
                <Card className={`md:col-span-1 ${profitColorClass}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <TrendingUp className={`h-4 w-4 ${profitIconColor}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.netProfit.toLocaleString()}</div>
                        <p className="text-xs opacity-80">Revenue - Expenses</p>
                    </CardContent>
                </Card>

                {/* Total Expected */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.collectable.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Based on active students</p>
                    </CardContent>
                </Card>

                {/* Attendance Stats - Large */}
                <div className="md:col-span-2 md:row-span-2">
                     <AttendanceStats data={attendanceStats} />
                </div>

                {/* Overview Chart - Large */}
                <Card className="md:col-span-2 md:row-span-2">
                    <CardHeader>
                        <CardTitle>Overview (Revenue)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={stats.overview} />
                    </CardContent>
                </Card>

                {/* Collected */}
                <Card className="md:col-span-1 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Collected</CardTitle>
                        <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">₹{stats.collected.toLocaleString()}</div>
                        <p className="text-xs text-green-600/80 dark:text-green-400/80">Verified revenue</p>
                    </CardContent>
                </Card>

                {/* Expenses */}
                <Card className="md:col-span-1 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">₹{stats.totalExpenses.toLocaleString()}</div>
                        <p className="text-xs text-red-600/80 dark:text-red-400/80">Operational costs</p>
                    </CardContent>
                </Card>

                {/* Unpaid */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">Unpaid (Deficit)</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">₹{stats.unpaid.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">For selected period</p>
                    </CardContent>
                </Card>

                {/* Pending */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.pending.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Awaiting verification</p>
                    </CardContent>
                </Card>

                {/* Recent Sales */}
                <Card className="md:col-span-2 md:row-span-2">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RecentSales sales={stats.recentSales} />
                    </CardContent>
                </Card>
                
                {/* Unpaid Students List */}
                <Card className="md:col-span-2 md:row-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Unpaid Students (Top 10)</span>
                            <span className="text-sm font-normal text-muted-foreground">For selected period</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UnpaidStudents students={stats.unpaidStudents} />
                    </CardContent>
                </Card>

                {/* Class Performance */}
                <Card className="md:col-span-4">
                    <CardHeader>
                        <CardTitle>Class-wise Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ClassPerformance data={stats.classWise} />
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
