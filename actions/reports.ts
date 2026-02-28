'use server';

import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import FeeTransaction from '@/models/FeeTransaction';
import ClassFee from '@/models/ClassFee';
import { startOfDay, endOfDay, format, eachDayOfInterval, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';
import logger from "@/lib/logger";
import { Types } from "mongoose";

// --- Interfaces ---

interface AttendanceReportParams {
  startDate: Date;
  endDate: Date;
  classId?: string;
  section?: string;
  studentId?: string;
}

interface StudentStat {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
  section: string;
  present: number;
  absent: number;
  total: number;
  percentage: number | string;
  history: { date: string; status: string }[];
}

interface DailyStat {
  date: string;
  percentage: string;
  present: number;
  total: number;
}

interface AttendanceRecordDoc {
  date: Date;
  classId: { name: string };
  records: {
    studentId: { _id: Types.ObjectId; name: string; rollNumber: string };
    status: string;
  }[];
}

interface FeeReportParams {
  startDate: Date;
  endDate: Date;
  classId?: string;
  section?: string;
  studentId?: string;
}

interface StudentReportDoc {
  _id: Types.ObjectId;
  name: string;
  rollNumber: string;
  classId: { _id: Types.ObjectId; name: string };
  section: string;
  dateOfAdmission?: Date;
}

interface FeeTransactionDoc {
  studentId: Types.ObjectId;
  amount: number;
  feeType: string;
  month?: number;
  year?: number;
  transactionDate: Date;
}

interface ClassFeeDoc {
    classId: Types.ObjectId;
    type: string;
    amount: number;
}

// --- Attendance Reporting ---

export async function getAttendanceReport({
  startDate,
  endDate,
  classId,
  section,
  studentId,
}: AttendanceReportParams) {
  await dbConnect();

  try {
    // Build Query for Attendance Records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      date: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    };

    if (classId && classId !== 'all') query.classId = classId;
    if (section && section !== 'all') query.section = section;

    const attendanceRecords = await Attendance.find(query)
      .populate('classId', 'name')
      .populate('records.studentId', 'name rollNumber')
      .lean() as unknown as AttendanceRecordDoc[];

    let totalDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    const studentStats: Record<string, StudentStat> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentQuery: any = { isActive: true };
    if (classId && classId !== 'all') studentQuery.classId = classId;
    if (section && section !== 'all') studentQuery.section = section;
    if (studentId) studentQuery._id = studentId;

    const students = await Student.find(studentQuery)
      .populate('classId', 'name')
      .select('name rollNumber classId section')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    students.forEach((student: any) => {
      studentStats[student._id.toString()] = {
        id: student._id.toString(),
        name: student.name,
        rollNumber: student.rollNumber,
        className: student.classId?.name || 'N/A',
        section: student.section,
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0,
        history: [],
      };
    });

    const workingDays = new Set<string>();

    attendanceRecords.forEach((record) => {
      const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
      let isWorkingDay = false;

      record.records.forEach((studentRec) => {
        if (!studentRec.studentId) return;
        const sId = studentRec.studentId._id.toString();
        
        if (studentId && sId !== studentId) return;

        if (studentStats[sId]) {
          const status = studentRec.status;
          
          if (status !== 'Holiday') {
            isWorkingDay = true;
            studentStats[sId].total += 1;
            if (status === 'Present') {
              studentStats[sId].present += 1;
              totalPresent += 1;
            } else if (status === 'Absent') {
              studentStats[sId].absent += 1;
              totalAbsent += 1;
            }
            
            studentStats[sId].history.push({
              date: dateStr,
              status: status,
            });
          }
        }
      });
      
      if (isWorkingDay) {
        workingDays.add(dateStr);
      }
    });

    totalDays = workingDays.size;

    const studentReport = Object.values(studentStats).map((stat) => {
      stat.percentage = stat.total > 0 ? ((stat.present / stat.total) * 100).toFixed(1) : 0;
      return stat;
    });

    const dailyStats: DailyStat[] = [];
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    const attendanceByDate: Record<string, AttendanceRecordDoc[]> = {};
    attendanceRecords.forEach((record) => {
      const d = format(new Date(record.date), 'yyyy-MM-dd');
      if (!attendanceByDate[d]) attendanceByDate[d] = [];
      attendanceByDate[d].push(record);
    });

    daysInterval.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const recordsForDay = attendanceByDate[dateStr];
      
      if (recordsForDay) {
        let dayPresent = 0;
        let dayTotal = 0;

        recordsForDay.forEach((record) => {
          record.records.forEach((s) => {
             if (studentId && s.studentId?._id.toString() !== studentId) return;
             if (s.studentId && studentStats[s.studentId._id.toString()]) {
                if (s.status === 'Present') dayPresent++;
                if (s.status !== 'Holiday') dayTotal++;
             }
          });
        });

        if (dayTotal > 0) {
          dailyStats.push({
            date: dateStr,
            percentage: ((dayPresent / dayTotal) * 100).toFixed(1),
            present: dayPresent,
            total: dayTotal,
          });
        }
      }
    });

    return {
      summary: {
        totalWorkingDays: totalDays,
        averageAttendance: totalDays > 0 ? (totalPresent / (totalPresent + totalAbsent) * 100).toFixed(1) : 0,
        totalPresent,
        totalAbsent,
      },
      dailyStats,
      studentReport,
    };

  } catch (error) {
    logger.error(error, 'Error fetching attendance report');
    throw new Error('Failed to fetch attendance report');
  }
}

// --- Fee Reporting ---

export async function getFeeReport({
  startDate,
  endDate,
  classId,
  section,
  studentId,
}: FeeReportParams) {
  await dbConnect();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentQuery: any = {};
    if (classId && classId !== 'all') studentQuery.classId = classId;
    if (section && section !== 'all') studentQuery.section = section;
    if (studentId) studentQuery._id = studentId;

    const students = await Student.find(studentQuery)
      .populate('classId', 'name')
      .select('name rollNumber classId section dateOfAdmission')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentIds = students.map((s: any) => s._id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactionQuery: any = {
      studentId: { $in: studentIds },
      status: 'verified',
      transactionDate: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    };

    const transactions = await FeeTransaction.find(transactionQuery).lean() as unknown as FeeTransactionDoc[];

    const allTransactions = await FeeTransaction.find({
      studentId: { $in: studentIds },
      status: 'verified',
    }).lean() as unknown as FeeTransactionDoc[];

    const classFees = await ClassFee.find({ isActive: true }).lean() as unknown as ClassFeeDoc[];

    const getFeeForClass = (cId: string | undefined, type: string) => {
      if (!cId) return 0;
      const fee = classFees.find((f) => f.classId.toString() === cId.toString() && f.type === type);
      return fee ? fee.amount : 0;
    };

    let totalCollectedPeriod = 0;
    let totalExpectedPeriod = 0;
    let totalDuePeriod = 0;

    const studentReport = students.map((s: unknown) => {
      const student = s as StudentReportDoc;
      const sId = student._id.toString();
      const cId = student.classId?._id.toString();

      const periodTxns = transactions.filter((t) => t.studentId.toString() === sId);
      const collectedPeriod = periodTxns.reduce((sum, t) => sum + t.amount, 0);

      const studentAllTxns = allTransactions.filter((t) => t.studentId.toString() === sId);

      let expectedPeriod = 0;
      const monthlyFee = getFeeForClass(cId, 'monthly');
      const admissionFee = getFeeForClass(cId, 'admissionFees');

      // 1. Monthly Fees in Period
      let currentIterDate = startOfMonth(startDate);
      const endIterDate = endOfMonth(endDate);
      
      const dueMonthsList: string[] = [];
      const paidMonthsSet = new Set<string>();
      
      studentAllTxns.forEach((txn) => {
        if (txn.feeType === 'monthly' && txn.month && txn.year) {
          paidMonthsSet.add(`${txn.year}-${txn.month}`);
        }
      });

      let admissionDate = new Date();
      if (student.dateOfAdmission) {
        const d = new Date(student.dateOfAdmission);
        if (!isNaN(d.getTime())) {
            admissionDate = d;
        }
      }
      
      const effectiveStart = isAfter(admissionDate, currentIterDate) ? startOfMonth(admissionDate) : currentIterDate;

      if (isAfter(effectiveStart, currentIterDate)) {
        currentIterDate = effectiveStart;
      }

      while (currentIterDate <= endIterDate) {
        const y = currentIterDate.getFullYear();
        const m = currentIterDate.getMonth() + 1;
        const key = `${y}-${m}`;
        
        expectedPeriod += monthlyFee;
        
        if (!paidMonthsSet.has(key)) {
            const monthName = currentIterDate.toLocaleString('default', { month: 'short' });
            dueMonthsList.push(`${monthName} ${y}`);
        }
        
        currentIterDate.setMonth(currentIterDate.getMonth() + 1);
      }

      // 2. Admission Fee in Period
      if (isAfter(admissionDate, startOfDay(startDate)) && isBefore(admissionDate, endOfDay(endDate))) {
         expectedPeriod += admissionFee;
         const paidAdmission = studentAllTxns.some((txn) => {
             return txn.feeType === 'admission' || txn.feeType === 'admissionFees';
         });
         if (!paidAdmission) {
             dueMonthsList.push("Admission Fee");
         }
      }

      let dueAmount = 0;
      dueMonthsList.forEach(item => {
          if (item === "Admission Fee") {
              dueAmount += admissionFee;
          } else {
              dueAmount += monthlyFee;
          }
      });

      totalCollectedPeriod += collectedPeriod;
      totalExpectedPeriod += expectedPeriod;
      totalDuePeriod += dueAmount;

      let periodStr = "-";
      if (dueMonthsList.length > 0) {
        if (dueMonthsList.length <= 3) {
            periodStr = dueMonthsList.join(", ");
        } else {
            const monthsOnly = dueMonthsList.filter(m => m !== "Admission Fee");
            if (monthsOnly.length > 0) {
                 periodStr = `${monthsOnly[0]} - ${monthsOnly[monthsOnly.length - 1]} (${monthsOnly.length} Months)`;
            }
            if (dueMonthsList.includes("Admission Fee")) {
                periodStr += " + Adm. Fee";
            }
        }
      }

      return {
        id: sId,
        name: student.name,
        rollNumber: student.rollNumber,
        className: student.classId?.name || 'N/A',
        section: student.section,
        collectedPeriod,
        expectedPeriod,
        dueAmount,
        status: dueAmount <= 0 ? 'Paid' : 'Due',
        period: periodStr,
        lastPaymentDate: studentAllTxns.length > 0 ? studentAllTxns.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate : null,
      };
    });

    // Chart Data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectionTrend: any[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const txnsByDate: Record<string, number> = {};
    transactions.forEach((txn) => {
      const d = format(new Date(txn.transactionDate), 'yyyy-MM-dd');
      txnsByDate[d] = (txnsByDate[d] || 0) + txn.amount;
    });
    days.forEach((day) => {
      const d = format(day, 'yyyy-MM-dd');
      collectionTrend.push({ date: d, amount: txnsByDate[d] || 0 });
    });

    return {
      summary: {
        totalCollected: totalCollectedPeriod,
        totalExpected: totalExpectedPeriod,
        totalPending: totalDuePeriod,
        collectionRate: totalExpectedPeriod > 0 ? ((totalCollectedPeriod / totalExpectedPeriod) * 100).toFixed(1) : 0,
      },
      trend: collectionTrend,
      studentReport,
    };

  } catch (error) {
    logger.error(error, 'Error fetching fee report');
    throw new Error('Failed to fetch fee report');
  }
}
