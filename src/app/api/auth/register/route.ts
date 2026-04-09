import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { created, conflict, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) return conflict("Ya existe una cuenta con ese email");

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        profile: { create: {} },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Send welcome email (async, non-blocking)
    const { emailService } = await import("@/services/email.service");
    emailService.sendWelcome({
      email: user.email,
      name:  user.name,
      role:  user.role as "TENANT" | "OWNER",
    }).catch(() => {});

    return created(user);
  } catch (error) {
    return handleApiError(error);
  }
}
