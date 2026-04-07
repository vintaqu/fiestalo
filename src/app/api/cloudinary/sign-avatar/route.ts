import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary no configurado" }, { status: 503 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder    = `fiestalo/avatars/${session.user.id}`;

  // Sign EXACTLY the params the client will send — nothing more, nothing less
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    allowed_formats: "jpg,jpeg,png,webp",
    transformation:  "w_200,h_200,c_fill,g_face,q_auto,f_auto",
  };

  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha256")
    .update(toSign + apiSecret)
    .digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  });
}
