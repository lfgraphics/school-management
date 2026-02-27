import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Counter from '@/models/Counter';
import { getServerSession } from 'next-auth'; // Assuming next-auth is used
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Need to find where authOptions is exported

export async function GET() {
  try {
    // Ideally check auth here
    await dbConnect();
    const counter = await Counter.findById('registrationNumber');
    return NextResponse.json({ 
      success: true, 
      currentSeq: counter ? counter.seq : 0,
      nextRegistrationNumber: counter ? String(counter.seq + 1).padStart(4, '0') : '0215'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch counter' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check auth
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { seq } = body;

    if (typeof seq !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid sequence number' }, { status: 400 });
    }

    await dbConnect();
    const counter = await Counter.findByIdAndUpdate(
      'registrationNumber',
      { seq },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, counter });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update counter' }, { status: 500 });
  }
}
