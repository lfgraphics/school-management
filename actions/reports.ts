'use server';

import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import FeeTransaction from '@/models/FeeTransaction';
import ClassFee from '@/models/ClassFee';
import { startOfDay, endOfDay, format, eachDayOfInterval, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';

// ----------------------------------------------------------------------
// Attendance Reporting
// ----------------------------------------------------------------------

interface AttendanceReportParams {
  startDate: Date;
  endDate: Date;
  classId?: string;
  section?: string;
  studentId?: string;
}

export async function getAttendanceReport({
  startDate,
  endDate,
  classId,
  section,
  studentId,
}: AttendanceReportParams) {
  await dbConnect();

  try {
    // 1. Build Query for Attendance Records
    const query: any = {
      date: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    };

    if (classId && classId !== 'all') query.classId = classId;
    if (section && section !== 'all') query.section = section;

    // Fetch attendance records
    // We need to populate class to get class name if needed, but mainly we need records
    const attendanceRecords = await Attendance.find(query)
      .populate('classId', 'name')
      .populate('records.studentId', 'name rollNumber')
      .lean();

    // 2. Filter by Student ID if provided (since studentId is inside records array)
    // Actually, it's better to filter the records array in memory or use aggregation
    // For now, in-memory filtering is fine for typical school sizes

    let totalDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    // Map to store student-wise stats
    const studentStats: Record<string, any> = {};

    // Get list of all relevant students first to ensure we include students with 0 attendance
    const studentQuery: any = { isActive: true };
    if (classId && classId !== 'all') studentQuery.classId = classId;
    if (section && section !== 'all') studentQuery.section = section;
    if (studentId) studentQuery._id = studentId;

    const students = await Student.find(studentQuery)
      .populate('classId', 'name')
      .select('name rollNumber classId section')
      .lean();

    // Initialize student stats
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
        history: [], // For daily status
      };
    });

    // Process attendance records
    // We need to handle "Holiday" status? Usually holidays are excluded from "Total Working Days"
    // But for now, let's count Present/Absent as working days.
    
    // Create a set of unique dates (working days)
    const workingDays = new Set<string>();

    attendanceRecords.forEach((record: any) => {
      const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
      let isWorkingDay = false;

      // Iterate through student records in this attendance entry
      record.records.forEach((studentRec: any) => {
        if (!studentRec.studentId) return; // Skip if student deleted/null
        const sId = studentRec.studentId._id.toString();
        
        // Filter by specific student if requested
        if (studentId && sId !== studentId) return;

        // If student exists in our initial list (handles class/section filter implicitly)
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

    // Calculate percentages and finalize list
    const studentReport = Object.values(studentStats).map((stat: any) => {
      stat.percentage = stat.total > 0 ? ((stat.present / stat.total) * 100).toFixed(1) : 0;
      return stat;
    });

    // Calculate overall trend (daily attendance percentage)
    // We need to aggregate across all students for each day
    const dailyStats: any[] = [];
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    // Optimize: Group attendance by date
    const attendanceByDate: Record<string, any> = {};
    attendanceRecords.forEach((record: any) => {
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

        recordsForDay.forEach((record: any) => {
          record.records.forEach((s: any) => {
             // Check filters
             if (studentId && s.studentId?._id.toString() !== studentId) return;
             // Check if student belongs to filtered class/section (if we had filtered students map)
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
    console.error('Error fetching attendance report:', error);
    throw new Error('Failed to fetch attendance report');
  }
}

// ----------------------------------------------------------------------
// Fee Reporting
// ----------------------------------------------------------------------

interface FeeReportParams {
  startDate: Date;
  endDate: Date;
  classId?: string;
  section?: string;
  studentId?: string;
}

export async function getFeeReport({
  startDate,
  endDate,
  classId,
  section,
  studentId,
}: FeeReportParams) {
  await dbConnect();

  try {
    // 1. Fetch Students
    const studentQuery: any = { isActive: true };
    if (classId && classId !== 'all') studentQuery.classId = classId;
    if (section && section !== 'all') studentQuery.section = section;
    if (studentId) studentQuery._id = studentId;

    const students = await Student.find(studentQuery)
      .populate('classId', 'name')
      .select('name rollNumber classId section dateOfAdmission')
      .lean();

    const studentIds = students.map((s: any) => s._id);

    // 2. Fetch Transactions (Collected)
    // Filter by transaction date for "Collected in Period"
    const transactionQuery: any = {
      studentId: { $in: studentIds },
      status: 'verified', // Only count verified payments
      transactionDate: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    };

    const transactions = await FeeTransaction.find(transactionQuery).lean();

    // 3. Fetch ALL Transactions (for Paid History Check)
    const allTransactions = await FeeTransaction.find({
      studentId: { $in: studentIds },
      status: 'verified',
    }).lean();

    // 4. Fetch Fee Structure
    const classFees = await ClassFee.find({ isActive: true }).lean();

    // Helper to find fee for a class
    const getFeeForClass = (cId: string | undefined, type: string) => {
      if (!cId) return 0;
      const fee = classFees.find((f: any) => f.classId.toString() === cId.toString() && f.type === type);
      return fee ? fee.amount : 0;
    };

    // Calculate Stats
    let totalCollectedPeriod = 0;
    let totalExpectedPeriod = 0;
    let totalDuePeriod = 0;

    const studentReport = students.map((student: any) => {
      const sId = student._id.toString();
      const cId = student.classId?._id.toString();

      // Transactions in selected period (Collected)
      const periodTxns = transactions.filter((t: any) => t.studentId.toString() === sId);
      const collectedPeriod = periodTxns.reduce((sum: number, t: any) => sum + t.amount, 0);

      // All transactions for this student (for checking payment status)
      const studentAllTxns = allTransactions.filter((t: any) => t.studentId.toString() === sId);

      // Calculate Expected FOR THE SELECTED PERIOD
      let expectedPeriod = 0;
      const monthlyFee = getFeeForClass(cId, 'monthly');
      const admissionFee = getFeeForClass(cId, 'admissionFees');

      // 1. Monthly Fees in Period
      // Iterate through months in the selected period [startDate, endDate]
      let currentIterDate = startOfMonth(startDate);
      const endIterDate = endOfMonth(endDate);
      
      const dueMonthsList: string[] = [];
      const paidMonthsSet = new Set<string>();
      
      // Build set of paid months from all transactions
      studentAllTxns.forEach((t: any) => {
        if (t.feeType === 'monthly' && t.month && t.year) {
          paidMonthsSet.add(`${t.year}-${t.month}`);
        }
      });

      // Student Admission Date logic
      // If admission is after currentIterDate, we start checking from admission month
      let admissionDate = new Date();
      if (student.dateOfAdmission) {
        const d = new Date(student.dateOfAdmission);
        if (!isNaN(d.getTime())) {
            admissionDate = d;
        }
      }
      
      // If report start date is before admission, we shouldn't expect fees before admission
      // So effectively, start checking from MAX(startDate, admissionDate)
      // Actually admission month counts.
      
      const effectiveStart = isAfter(admissionDate, currentIterDate) ? startOfMonth(admissionDate) : currentIterDate;

      // Reset iterator if needed
      if (isAfter(effectiveStart, currentIterDate)) {
        currentIterDate = effectiveStart;
      }

      while (currentIterDate <= endIterDate) {
        const y = currentIterDate.getFullYear();
        const m = currentIterDate.getMonth() + 1; // 1-12
        const key = `${y}-${m}`;
        
        // Add to expected
        expectedPeriod += monthlyFee;
        
        // Check if paid
        if (!paidMonthsSet.has(key)) {
            const monthName = currentIterDate.toLocaleString('default', { month: 'short' });
            dueMonthsList.push(`${monthName} ${y}`);
        }
        
        // Next month
        currentIterDate.setMonth(currentIterDate.getMonth() + 1);
      }

      // 2. Admission Fee in Period
      // Check if admission date falls within the selected period
      if (isAfter(admissionDate, startOfDay(startDate)) && isBefore(admissionDate, endOfDay(endDate))) {
         expectedPeriod += admissionFee;
         // Check if admission fee is paid
         const paidAdmission = studentAllTxns.some((t: any) => t.feeType === 'admission' || t.feeType === 'admissionFees');
         if (!paidAdmission) {
             dueMonthsList.push("Admission Fee");
         }
      }

      // Calculate Due Amount for this period
      // Logic: Expected in Period - Paid FOR Period
      // Since we already built `dueMonthsList` which contains unpaid items, we can calculate due amount from that.
      // But we need to be careful with partial payments if any. 
      // Assuming full payments for now as per schema logic (status verified).
      
      // Actually simpler: 
      // Due = (Count of Unpaid Months * Monthly Fee) + (Unpaid Admission Fee ? Admission Fee : 0)
      
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

      // Period string
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
        expectedPeriod, // Changed from expectedTotal
        dueAmount,      // Changed from pending
        status: dueAmount <= 0 ? 'Paid' : 'Due',
        period: periodStr,
        lastPaymentDate: studentAllTxns.length > 0 ? studentAllTxns.sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate : null,
      };
    });

    // Chart Data
    const collectionTrend: any[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const txnsByDate: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const d = format(new Date(t.transactionDate), 'yyyy-MM-dd');
      txnsByDate[d] = (txnsByDate[d] || 0) + t.amount;
    });
    days.forEach((day) => {
      const d = format(day, 'yyyy-MM-dd');
      if (txnsByDate[d]) {
        collectionTrend.push({ date: d, amount: txnsByDate[d] });
      }
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
    console.error('Error fetching fee report:', error);
    throw new Error('Failed to fetch fee report');
  }
}
