export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";


cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const avatarSchema = z.object({
  url:          z.string().url(),
  cloudinaryId: z.string().min(1),
});

// POST /api/user/avatar — saves the uploaded avatar URL
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url, cloudinaryId } = avatarSchema.parse(body);

    // Delete old avatar from Cloudinary if exists
    const profile = await db.profile.findUnique({
      where:  { userId: session.user.id },
      select: { avatar: true },
    });

    // Update both user.image (for session) and profile.avatar
    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data:  { image: url },
      }),
      db.profile.upsert({
        where:  { userId: session.user.id },
        update: { avatar: url },
        create: { userId: session.user.id, avatar: url },
      }),
    ]);

    return NextResponse.json({ data: { url } });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
