"use server"

import dbConnect from "@/lib/db"
import Holiday from "@/models/Holiday"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const holidaySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().min(1, "Description is required"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

export async function addHoliday(data: z.infer<typeof holidaySchema>) {
  try {
    const validatedData = holidaySchema.parse(data);
    await dbConnect();
    
    const startDate = new Date(validatedData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(validatedData.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Check for overlap
    // Overlap exists if (StartA <= EndB) and (EndA >= StartB)
    // Also check against old 'date' field
    const existing = await Holiday.findOne({
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { date: { $gte: startDate, $lte: endDate } }
      ]
    });

    if (existing) {
      return { success: false, error: "A holiday already exists in this date range" };
    }

    await Holiday.create({
      startDate,
      endDate,
      description: validatedData.description
    });

    revalidatePath("/attendance/dashboard");
    revalidatePath("/attendance/holidays");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function getHolidays(limit: number = 20) {
  await dbConnect();
  // Sort by startDate, but if it doesn't exist, it might be at the end. 
  // We can't easily sort by "startDate OR date" in MongoDB without aggregation.
  // For now, let's just fetch and handle the missing fields.
  const holidays = await Holiday.find()
    .sort({ startDate: -1, date: -1 }) 
    .limit(limit)
    .lean();
    
  interface HolidayDoc {
    _id: { toString: () => string };
    startDate?: Date;
    endDate?: Date;
    date?: Date; // Backwards compatibility
    description: string;
  }
    
  return holidays.map((h: unknown) => {
    const holiday = h as HolidayDoc;
    // Handle migration/fallback for old records that have 'date' but not start/end
    const start = holiday.startDate || holiday.date || new Date();
    const end = holiday.endDate || holiday.date || new Date();
    
    return {
      id: holiday._id.toString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      description: holiday.description
    };
  });
}

export async function deleteHoliday(id: string) {
  try {
    await dbConnect();
    await Holiday.findByIdAndDelete(id);
    revalidatePath("/attendance/dashboard");
    revalidatePath("/attendance/holidays");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function checkIsHoliday(dateStr: string) {
  await dbConnect();
  
  const checkDate = new Date(dateStr);
  checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid boundary issues with 00:00:00 if timezones are tricky

  // Check Sunday
  if (checkDate.getDay() === 0) {
      return { isHoliday: true, reason: "Sunday" };
  }

  // Find a holiday where startDate <= checkDate <= endDate
  // We need to be careful with time components.
  // Let's rely on the fact that stored startDate is 00:00 and endDate is 23:59 (local or UTC depending on server)
  // MongoDB stores in UTC.
  // If we query: startDate <= checkDate AND endDate >= checkDate
  
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23,59,59,999);

  const holiday = await Holiday.findOne({
    $or: [
      { startDate: { $lte: endOfDay }, endDate: { $gte: startOfDay } },
      { date: { $gte: startOfDay, $lte: endOfDay } }
    ]
  }).lean();

  if (holiday) {
    return { isHoliday: true, reason: (holiday as { description: string }).description };
  }

  return { isHoliday: false, reason: null };
}
