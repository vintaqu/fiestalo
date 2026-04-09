export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

const forwardSchema = z.object({
  q:       z.string().min(2).max(256),
  country: z.string().default("es"),
  limit:   z.coerce.number().int().min(1).max(10).default(5),
  // Optional proximity bias (user's current location)
  lng:     z.coerce.number().optional(),
  lat:     z.coerce.number().optional(),
});

const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  if (!MAPBOX_TOKEN) {
    return NextResponse.json({ error: "Mapbox token no configurado" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "forward";

  try {
    // ── Reverse geocoding ─────────────────────────────────────────
    if (mode === "reverse") {
      const { lat, lng } = reverseSchema.parse(Object.fromEntries(searchParams));

      const url = new URL(`${BASE}/${lng},${lat}.json`);
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      url.searchParams.set("language", "es");
      url.searchParams.set("types", "address,place");
      url.searchParams.set("limit", "1");

      const res  = await fetch(url.toString(), { next: { revalidate: 3600 } });
      const data = await res.json();

      if (!data.features?.length) {
        return NextResponse.json({ data: null });
      }

      const f = data.features[0];
      return NextResponse.json({
        data: {
          address:    f.place_name,
          city:       extractCity(f),
          postalCode: extractPostalCode(f),
          latitude:   f.center[1],
          longitude:  f.center[0],
        },
      });
    }

    // ── Forward geocoding (default) ───────────────────────────────
    const { q, country, limit, lat, lng } = forwardSchema.parse(
      Object.fromEntries(searchParams)
    );

    const url = new URL(`${BASE}/${encodeURIComponent(q)}.json`);
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("language", "es");
    url.searchParams.set("country", country);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("types", "address,place,neighborhood,locality");
    // Bias results toward user's location if provided
    if (lat !== undefined && lng !== undefined) {
      url.searchParams.set("proximity", `${lng},${lat}`);
    }

    const res  = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();

    const results = (data.features ?? []).map((f: any) => ({
      id:         f.id,
      label:      f.place_name,
      address:    f.place_name,
      city:       extractCity(f),
      postalCode: extractPostalCode(f),
      latitude:   f.center[1],
      longitude:  f.center[0],
    }));

    return NextResponse.json({ data: results });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    console.error("[geocode]", err);
    return NextResponse.json({ error: "Error en geocodificación" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function extractCity(feature: any): string {
  // Mapbox context array contains place hierarchy
  const context: any[] = feature.context ?? [];
  const place = context.find((c: any) => c.id?.startsWith("place."));
  const locality = context.find((c: any) => c.id?.startsWith("locality."));
  return locality?.text ?? place?.text ?? feature.text ?? "";
}

function extractPostalCode(feature: any): string {
  const context: any[] = feature.context ?? [];
  const pc = context.find((c: any) => c.id?.startsWith("postcode."));
  return pc?.text ?? "";
}
