"use server"

import dbConnect from "@/lib/db"
import Holiday from "@/models/Holiday"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const holidaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
})

export async function addHoliday(data: z.infer<typeof holidaySchema>) {
  try {
    holidaySchema.parse(data);
    await dbConnect();
    
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0); // Normalize

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return { success: false, error: "Holiday already exists for this date" };
    }

    await Holiday.create({
      date,
      description: data.description
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
  const holidays = await Holiday.find()
    .sort({ date: -1 })
    .limit(limit)
    .lean();
    
  interface HolidayDoc {
    _id: { toString: () => string };
    date: Date;
    description: string;
  }
    
  return holidays.map((h: unknown) => {
    const holiday = h as HolidayDoc;
    return {
      id: holiday._id.toString(),
      date: holiday.date.toISOString(),
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
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  
  // Check Sunday
  if (date.getDay() === 0) {
      return { isHoliday: true, reason: "Sunday" };
  }

  const holiday = await Holiday.findOne({ date }).lean();
  if (holiday) {
    return { isHoliday: true, reason: (holiday as { description: string }).description };
  }

  return { isHoliday: false, reason: null };
}
