export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/payment.service";

// Stripe requires the raw body — Next.js App Router gives us it via arrayBuffer()
// CRITICAL: Do NOT add any body parsing middleware before this route

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read raw body as Buffer — required for signature verification
  const rawBody = Buffer.from(await req.arrayBuffer());

  try {
    const result = await paymentService.handleWebhook(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[stripe webhook]", error.message);
    // Return 400 so Stripe knows the webhook failed and will retry
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
