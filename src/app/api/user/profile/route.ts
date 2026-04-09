export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


const profileUpdateSchema = z.object({
  name:    z.string().min(2).max(80).optional(),
  bio:     z.string().max(500).optional(),
  phone:   z.string().max(20).optional(),
  city:    z.string().max(80).optional(),
  country: z.string().max(3).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

// GET /api/user/profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where:   { id: session.user.id },
    select: {
      id:        true,
      name:      true,
      email:     true,
      image:     true,
      role:      true,
      createdAt: true,
      profile: {
        select: {
          bio:     true,
          phone:   true,
          city:    true,
          country: true,
          website: true,
          avatar:  true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({ data: user });
}

// PATCH /api/user/profile
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = profileUpdateSchema.parse(body);

    // Update name on User and rest on Profile
    const { name, ...profileData } = data;

    await db.$transaction([
      ...(name ? [db.user.update({
        where: { id: session.user.id },
        data:  { name },
      })] : []),
      db.profile.upsert({
        where:  { userId: session.user.id },
        update: profileData,
        create: { userId: session.user.id, ...profileData },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
