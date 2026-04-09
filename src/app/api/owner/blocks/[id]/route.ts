import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { availabilityService } from "@/services/availability.service";

export const dynamic = "force-dynamic";

// DELETE /api/owner/blocks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await availabilityService.removeBlock(params.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Error" },
      { status: err.statusCode ?? 500 }
    );
  }
}
