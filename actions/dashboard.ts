"use server"

import dbConnect from "@/lib/db"
import FeeTransaction from "@/models/FeeTransaction"
import Student from "@/models/Student"
import ClassFee from "@/models/ClassFee"
import Expense from "@/models/Expense"
import Attendance from "@/models/Attendance"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, eachMonthOfInterval, format } from "date-fns"

interface DashboardFilter {
    startDate?: Date;
    endDate?: Date;
    classId?: string;
}

interface FeeQuery {
    transactionDate?: {
        $gte: Date;
        $lte: Date;
    };
    studentId?: { $in: string[] };
}

interface FeeConfig {
    _id: { toString: () => string };
    classId: { toString: () => string };
    type: string;
    amount: number;
    effectiveFrom?: Date;
    isActive: boolean;
}

interface Transaction {
    _id: { toString: () => string };
    studentId: { toString: () => string } | string;
    feeType: string;
    amount: number;
    month?: number;
    year: number;
    status: string;
    transactionDate: Date;
}

interface UnpaidStudent {
    id: string;
    name: string;
    className: string;
    amount: number;
    months: string[];
    photo?: string;
}

interface OverviewData {
    name: string;
    collected: number;
    pending: number;
    unpaid: number;
}

interface StudentDoc {
    _id: any;
    name: string;
    classId: { _id: any; name: string };
    admissionDate?: Date;
    createdAt: Date;
    photo?: string;
    contacts?: { mobile?: string[] };
}

export async function getDashboardStats(filter: DashboardFilter) {
    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (filter.startDate && filter.endDate) {
        query.transactionDate = {
            $gte: startOfDay(filter.startDate),
            $lte: endOfDay(filter.endDate)
        };
    }

    let studentIds: string[] | null = null;
    if (filter.classId && filter.classId !== "all") {
        const studentsInClass = await Student.find({ classId: filter.classId }).select('_id');
        studentIds = studentsInClass.map(s => s._id.toString());
        query.studentId = { $in: studentIds };
    }

    const statsResult = await FeeTransaction.aggregate([
        { $match: { ...query, status: { $in: ['verified', 'pending'] } } },
        {
            $group: {
                _id: null,
                collected: { $sum: { $cond: [{ $eq: ["$status", "verified"] }, "$amount", 0] } },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } }
            }
        }
    ]);

    const collected = statsResult[0]?.collected || 0;
    const pending = statsResult[0]?.pending || 0;

    const end = filter.endDate || endOfMonth(new Date());
    const start = filter.startDate || startOfMonth(new Date(new Date().getFullYear(), 0, 1));
    const monthsToCheck = eachMonthOfInterval({ start, end });

    const studentQuery: Record<string, unknown> = { isActive: true };
    if (filter.classId && filter.classId !== "all") {
        studentQuery.classId = filter.classId;
    }
    const allStudents = await Student.find(studentQuery).populate('classId', 'name').lean();
    const activeStudentIds = allStudents.map(s => (s as StudentDoc)._id.toString());

    const classFees = await ClassFee.find({ isActive: true }).lean();
    const feeMap = new Map<string, FeeConfig[]>();
    classFees.forEach((fee: unknown) => {
        const f = fee as FeeConfig;
        const cid = f.classId.toString();
        if (!feeMap.has(cid)) feeMap.set(cid, []);
        feeMap.get(cid)?.push(f);
    });

    const yearsToCheck = new Set(monthsToCheck.map(m => m.getFullYear()));
    const allTransactions = await FeeTransaction.find({
        status: { $in: ['verified', 'pending'] },
        year: { $in: Array.from(yearsToCheck) },
        studentId: { $in: activeStudentIds }
    }).lean();

    const unpaidList: UnpaidStudent[] = [];
    let totalUnpaid = 0;
    let totalExpected = 0;

    const hasPaidFee = (studentId: string, type: string, month: number | undefined, year: number) => {
        return allTransactions.some((tx: unknown) => {
            const transaction = tx as Transaction;
            const txStudentId = transaction.studentId?.toString() || transaction.studentId;
            if (txStudentId !== studentId) return false;
            if (transaction.feeType !== type) return false;
            if (transaction.year !== year) return false;
            if (type === 'monthly') return transaction.month === month;
            return true;
        });
    };

    for (const s of allStudents) {
        const student = s as StudentDoc;
        const studentFees = feeMap.get(student.classId._id.toString()) || [];
        const admissionDate = new Date(student.admissionDate || student.createdAt);
        const admMonth = admissionDate.getMonth() + 1;
        const admYear = admissionDate.getFullYear();

        let studentUnpaidAmount = 0;
        const studentUnpaidDetails: string[] = [];

        const monthlyFeeConfig = studentFees.find(f => f.type === 'monthly');
        if (monthlyFeeConfig) {
            const monthlyAmount = monthlyFeeConfig.amount;

            for (const monthDate of monthsToCheck) {
                const m = monthDate.getMonth() + 1;
                const y = monthDate.getFullYear();
                const isAfterAdmission = (y > admYear) || (y === admYear && m >= admMonth);

                if (isAfterAdmission) {
                    totalExpected += monthlyAmount;

                    if (!hasPaidFee(student._id.toString(), 'monthly', m, y)) {
                        studentUnpaidAmount += monthlyAmount;
                        studentUnpaidDetails.push(`${format(monthDate, 'MMM')} ${y}`);
                    }
                }
            }
        }

        const examFeeConfig = studentFees.find(f => f.type === 'examination');
        if (examFeeConfig && examFeeConfig.effectiveFrom) {
            const examDate = new Date(examFeeConfig.effectiveFrom);
            const examMonth = examDate.getMonth() + 1;
            const examYear = examDate.getFullYear();

            const isDueInPeriod = monthsToCheck.some(d =>
                d.getMonth() + 1 === examMonth && d.getFullYear() === examYear
            );
            const isStudentEligible = (examYear > admYear) || (examYear === admYear && examMonth >= admMonth);

            if (isDueInPeriod && isStudentEligible) {
                totalExpected += examFeeConfig.amount;

                if (!hasPaidFee(student._id.toString(), 'examination', undefined, examYear)) {
                    studentUnpaidAmount += examFeeConfig.amount;
                    studentUnpaidDetails.push(`Exam Fee (${format(examDate, 'MMM')})`);
                }
            }
        }

        const isAdmissionInPeriod = monthsToCheck.some(d =>
            d.getMonth() + 1 === admMonth && d.getFullYear() === admYear
        );

        if (isAdmissionInPeriod) {
            const admissionFeeConfig = studentFees.find(f => f.type === 'admission');

            if (admissionFeeConfig) {
                totalExpected += admissionFeeConfig.amount;

                if (!hasPaidFee(student._id.toString(), 'admission', undefined, admYear)) {
                    studentUnpaidAmount += admissionFeeConfig.amount;
                    studentUnpaidDetails.push(`Admission Fee`);
                }
            }
        }

        if (studentUnpaidAmount > 0) {
            totalUnpaid += studentUnpaidAmount;
            unpaidList.push({
                id: student._id.toString(),
                name: student.name,
                className: student.classId.name,
                amount: studentUnpaidAmount,
                months: studentUnpaidDetails,
                photo: student.photo
            });
        }
    }

    const recentSales = await FeeTransaction.find({
        ...query,
        status: { $in: ['verified', 'pending'] }
    })
        .sort({ transactionDate: -1 })
        .limit(5)
        .populate('studentId', 'name contacts photo')
        .lean();

    const processedOverview: OverviewData[] = [];

    monthsToCheck.forEach(month => {
        const m = month.getMonth() + 1;
        const y = month.getFullYear();

        let monthlyUnpaid = 0;

        for (const s of allStudents) {
            const student = s as StudentDoc;
            const studentFees = feeMap.get(student.classId._id.toString()) || [];
            const monthlyFeeConfig = studentFees.find(f => f.type === 'monthly');

            if (monthlyFeeConfig) {
                const admissionDate = new Date(student.admissionDate || student.createdAt);
                const admMonth = admissionDate.getMonth() + 1;
                const admYear = admissionDate.getFullYear();
                const isAfterAdmission = (y > admYear) || (y === admYear && m >= admMonth);

                if (isAfterAdmission) {
                    if (!hasPaidFee(student._id.toString(), 'monthly', m, y)) {
                        monthlyUnpaid += monthlyFeeConfig.amount;
                    }
                }
            }
        }

        const monthTransactions = allTransactions.filter((tx: unknown) => {
            const transaction = tx as Transaction;
            const d = new Date(transaction.transactionDate);
            return d.getMonth() + 1 === m && d.getFullYear() === y;
        });

        const monthlyCollected = monthTransactions
            .filter((tx: unknown) => (tx as Transaction).status === 'verified')
            .reduce((sum: number, tx: unknown) => sum + (tx as Transaction).amount, 0);

        const monthlyPending = monthTransactions
            .filter((tx: unknown) => (tx as Transaction).status === 'pending')
            .reduce((sum: number, tx: unknown) => sum + (tx as Transaction).amount, 0);

        processedOverview.push({
            name: format(month, 'MMM'),
            collected: monthlyCollected,
            pending: monthlyPending,
            unpaid: monthlyUnpaid
        });
    });

    const classWiseData = await FeeTransaction.aggregate([
        { $match: { ...query } },
        {
            $lookup: {
                from: "students",
                localField: "studentId",
                foreignField: "_id",
                as: "student"
            }
        },
        { $unwind: "$student" },
        {
            $lookup: {
                from: "classes",
                localField: "student.classId",
                foreignField: "_id",
                as: "class"
            }
        },
        { $unwind: "$class" },
        {
            $group: {
                _id: "$class.name",
                collected: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "verified"] }, "$amount", 0]
                    }
                },
                pending: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0]
                    }
                }
            }
        },
        { $sort: { collected: -1 } }
    ]);

    interface SaleDoc {
        _id: { toString: () => string };
        amount: number;
        studentId?: {
            name: string;
            contacts?: { mobile?: string[] };
            photo?: string;
        };
        status: string;
    }

    interface ClassWiseDoc {
        _id: string;
        collected: number;
        pending: number;
    }

    // Calculate Expenses
    const expenseQuery: any = { status: 'active' };
    if (filter.startDate && filter.endDate) {
        expenseQuery.expenseDate = {
            $gte: startOfDay(filter.startDate),
            $lte: endOfDay(filter.endDate)
        };
    }

    const expenseResult = await Expense.aggregate([
        { $match: expenseQuery },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalExpenses = expenseResult[0]?.total || 0;
    const netProfit = collected - totalExpenses;

    return {
        collected,
        pending,
        totalExpenses,
        netProfit,
        unpaid: totalUnpaid,
        collectable: totalExpected,
        recentSales: recentSales.map((sale: unknown) => {
            const s = sale as SaleDoc;
            return {
                id: s._id.toString(),
                amount: s.amount,
                studentName: s.studentId?.name || 'Unknown',
                contactNumber: s.studentId?.contacts?.mobile?.[0] || 'N/A',
                studentPhoto: s.studentId?.photo,
                status: s.status,
            };
        }),
        overview: processedOverview,
        classWise: classWiseData.map((c: unknown) => {
            const cls = c as ClassWiseDoc;
            return {
                name: cls._id,
                collected: cls.collected,
                pending: cls.pending
            };
        }),
        unpaidStudents: unpaidList.sort((a, b) => b.amount - a.amount).slice(0, 10)
    };
}

export async function getAttendanceStats() {
    await dbConnect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalStudents = await Student.countDocuments({ isActive: true });
    
    // Get attendance for today
    const attendanceDocs = await Attendance.find({
        date: { $gte: today, $lt: tomorrow }
    }).populate('classId', 'name').lean();

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHoliday = 0;
    
    interface ClassStats {
        present: number;
        absent: number;
        holiday: number;
        total: number;
    }

    const classWiseAttendance: Record<string, ClassStats> = {};

    attendanceDocs.forEach((doc: any) => {
        const className = doc.classId?.name || 'Unknown';
        if (!classWiseAttendance[className]) {
            classWiseAttendance[className] = { present: 0, absent: 0, holiday: 0, total: 0 };
        }

        doc.records.forEach((record: any) => {
            if (record.status === 'Present') {
                totalPresent++;
                classWiseAttendance[className].present++;
            } else if (record.status === 'Absent') {
                totalAbsent++;
                classWiseAttendance[className].absent++;
            } else if (record.status === 'Holiday') {
                totalHoliday++;
                classWiseAttendance[className].holiday++;
            }
            classWiseAttendance[className].total++;
        });
    });

    return {
        totalStudents,
        totalPresent,
        totalAbsent,
        totalHoliday,
        classWise: Object.entries(classWiseAttendance).map(([name, stats]) => ({
            name,
            ...stats
        }))
    };
}
