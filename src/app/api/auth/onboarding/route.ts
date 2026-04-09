export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


const schema = z.object({
  role: z.enum(["TENANT", "OWNER"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { role } = schema.parse(body);

    await db.user.update({
      where: { id: session.user.id },
      data: { role, needsOnboarding: false },
    });

    return NextResponse.json({ success: true, role });
  } catch {
    return NextResponse.json({ error: "Error actualizando rol" }, { status: 500 });
  }
}
