"use server"

import dbConnect from "@/lib/db"
import Attendance from "@/models/Attendance"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Student from "@/models/Student"
import { startOfDay, endOfDay } from "date-fns"
import logger from "@/lib/logger"

interface AttendanceReportFilter {
  startDate?: Date;
  endDate?: Date;
  classId?: string;
  studentId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAttendanceReport(filter: AttendanceReportFilter): Promise<any[]> {
  try {
    await dbConnect();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    
    if (filter.startDate && filter.endDate) {
      query.date = {
        $gte: startOfDay(filter.startDate),
        $lte: endOfDay(filter.endDate)
      };
    } else if (filter.startDate) {
        query.date = {
            $gte: startOfDay(filter.startDate),
            $lte: endOfDay(filter.startDate)
        };
    }
    
    if (filter.classId && filter.classId !== 'all') {
      query.classId = filter.classId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('classId', 'name')
      .populate('records.studentId', 'name registrationNumber')
      .sort({ date: -1 })
      .lean();
      
    // Filter by studentId if provided (Client side filtering as records are embedded)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result = attendanceRecords.flatMap((record: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return record.records.map((r: any) => ({
            _id: record._id,
            date: record.date,
            className: record.classId?.name || 'Unknown',
            studentName: r.studentId?.name || 'Unknown',
            studentId: r.studentId?._id?.toString() || r.studentId, // Handle populated vs unpopulated
            registrationNumber: r.studentId?.registrationNumber || '',
            status: r.status,
            remarks: r.remarks,
            updatedAt: record.updatedAt
        }));
    });

    if (filter.studentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = result.filter((r: any) => r.studentId === filter.studentId);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => ({
      id: r._id.toString(),
      date: r.date.toISOString(),
      className: r.className,
      studentName: r.studentName,
      registrationNumber: r.registrationNumber,
      status: r.status,
      remarks: r.remarks,
      updatedAt: r.updatedAt.toISOString()
    }));
  } catch (error: unknown) {
    logger.error(error, "Error fetching attendance report");
    return [];
  }
}
