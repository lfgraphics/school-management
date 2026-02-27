"use server"

import dbConnect from "@/lib/db"
import Attendance from "@/models/Attendance"
import Student from "@/models/Student"
import { startOfDay, endOfDay } from "date-fns"

interface AttendanceReportFilter {
  date?: string;
  classId?: string;
  section?: string;
}

export async function getAttendanceReport(filter: AttendanceReportFilter) {
  try {
    await dbConnect();

    // Build query
    const query: any = {};

    if (filter.date) {
      const date = new Date(filter.date);
      query.date = {
        $gte: startOfDay(date),
        $lte: endOfDay(date)
      };
    }

    if (filter.classId && filter.classId !== "all") {
      query.classId = filter.classId;
    }

    if (filter.section && filter.section !== "all") {
      query.section = filter.section;
    }

    const records = await Attendance.find(query)
      .sort({ date: -1, classId: 1, section: 1 })
      .populate('classId', 'name')
      .populate('markedBy', 'name')
      .lean();

    return records.map((r: any) => ({
      id: r._id.toString(),
      date: r.date.toISOString(),
      classId: r.classId?._id.toString(),
      className: r.classId?.name || 'Unknown',
      section: r.section,
      markedBy: r.markedBy?.name || 'Unknown',
      totalStudents: r.records.length,
      presentCount: r.records.filter((rec: any) => rec.status === 'Present').length,
      absentCount: r.records.filter((rec: any) => rec.status === 'Absent').length,
      holidayCount: r.records.filter((rec: any) => rec.status === 'Holiday').length,
      updatedAt: r.updatedAt.toISOString()
    }));
  } catch (error: any) {
    console.error("Error fetching attendance report:", error);
    return [];
  }
}
