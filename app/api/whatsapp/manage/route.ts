import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import WhatsAppPricing from "@/models/WhatsAppPricing";
import WhatsAppPayment from "@/models/WhatsAppPayment";
import { getWhatsAppSummary } from "@/actions/whatsapp-stats";

const MANAGEMENT_SECRET = process.env.WORKER_WEBHOOK_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${MANAGEMENT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summary = await getWhatsAppSummary();
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${MANAGEMENT_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body.type === 'payment') {
    const { amount, description, transactionId } = body;
    await dbConnect();
    await WhatsAppPayment.create({ amount, description, transactionId });
    return NextResponse.json({ success: true });
  }

  if (body.type === 'pricing') {
    const { pricePerRequest, effectiveFrom } = body;
    await dbConnect();
    await WhatsAppPricing.create({ pricePerRequest, effectiveFrom: new Date(effectiveFrom) });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
}
