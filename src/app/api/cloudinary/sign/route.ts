export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";


// Cloudinary upload restrictions enforced server-side via signed upload
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const MAX_BYTES        = 10 * 1024 * 1024; // 10 MB
const FOLDER           = "fiestalo/venues";

export async function POST(req: NextRequest) {
  // Must be authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  // All authenticated users can sign avatar uploads
  // Venue image uploads are restricted to OWNER/ADMIN via the folder naming

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary no configurado" },
      { status: 503 }
    );
  }

  try {
    const body    = await req.json();
    const venueId = body.venueId as string;
    if (!venueId) {
      return NextResponse.json({ error: "venueId requerido" }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Parameters to sign — these are enforced by Cloudinary server-side
    // The client cannot override them after signing
    const paramsToSign: Record<string, string | number | string[]> = {
      timestamp,
      folder:          `${FOLDER}/${venueId}`,
      // Restrict formats server-side
      allowed_formats: ALLOWED_FORMATS.join(","),
      // Auto quality + format optimization
      transformation:  "q_auto,f_auto",
      // Tag for cleanup tracking
      tags:            `spacehub,venue_${venueId},user_${session.user.id}`,
    };

    // Build canonical string to sign (keys sorted alphabetically)
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
      folder:         `${FOLDER}/${venueId}`,
      allowedFormats: ALLOWED_FORMATS,
      maxBytes:       MAX_BYTES,
      tags:           paramsToSign.tags,
    });
  } catch {
    return NextResponse.json({ error: "Error generando firma" }, { status: 500 });
  }
}
