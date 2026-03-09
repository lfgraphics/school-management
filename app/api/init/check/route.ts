import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import License from "@/models/License";

export async function GET() {
  try {
    await dbConnect();
    
    // Check if any license exists
    const licenseCount = await License.countDocuments();
    if (licenseCount === 0) {
        return NextResponse.json({ initialized: false, reason: "no_license" });
    }

    // Check if any admin user exists
    const userCount = await User.countDocuments({ role: 'admin' });
    if (userCount === 0) {
      return NextResponse.json({ initialized: false, reason: "no_admin" });
    }

    return NextResponse.json({ initialized: true });
  } catch (error) {
    console.error("Init check error:", error);
    return NextResponse.json({ initialized: false, error: "db_error" }, { status: 500 });
  }
}
