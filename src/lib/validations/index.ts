import { z } from "zod";

// ── Auth ──────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
      .regex(/[0-9]/, "Debe incluir al menos un número"),
    confirmPassword: z.string(),
    role: z.enum(["TENANT", "OWNER"]).default("TENANT"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ── Venue ─────────────────────────────────────────

export const venueCreateSchema = z.object({
  title: z.string().min(5, "Título demasiado corto").max(100),
  description: z.string().min(50, "Descripción demasiado corta").max(5000),
  shortDescription: z.string().max(200).optional(),
  address: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  cityId: z.string().optional().transform(v => v === "" ? undefined : v),
  postalCode: z.string().optional(),
  country: z.string().default("ES"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  categoryId: z.string().optional().transform(v => v === "" ? undefined : v),
  capacity: z.number().int().min(1).max(10000),
  minHours: z.number().min(0.5).max(24).default(1),
  maxHours: z.number().optional(),
  bufferMinutes: z.number().int().min(0).max(240).default(0),
  pricePerHour: z.number().positive("El precio debe ser positivo"),
  cleaningFee: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  bookingType: z.enum(["INSTANT", "REQUEST"]).default("INSTANT"),
  isIndoor: z.boolean().default(true),
  isOutdoor: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  isAccessible: z.boolean().default(false),
  allowsPets: z.boolean().default(false),
  allowsMusic: z.boolean().default(false),
  allowsAlcohol: z.boolean().default(false),
  allowsCatering: z.boolean().default(false),
  allowsSmoking: z.boolean().default(false),
  houseRules: z.string().max(2000).optional(),
  cancellationPolicy: z
    .object({
      type: z.enum(["flexible", "moderate", "strict"]),
      refundHours: z.number().int().min(0),
    })
    .optional(),
  amenityIds: z.array(z.string()).default([]),
});

export const venueUpdateSchema = z.object({
  title:            z.string().min(5).max(100).optional(),
  description:      z.string().min(50).max(5000).optional(),
  shortDescription: z.string().max(200).optional(),
  address:          z.string().min(5).optional(),
  addressLine2:     z.string().optional(),
  city:             z.string().min(2).optional(),
  cityId:           z.string().optional().transform(v => v === "" ? undefined : v),
  postalCode:       z.string().optional(),
  country:          z.string().optional(),
  // z.coerce.number() accepts Prisma Decimal strings like "85.00"
  latitude:         z.coerce.number().min(-90).max(90).optional(),
  longitude:        z.coerce.number().min(-180).max(180).optional(),
  categoryId:       z.string().optional().transform(v => v === "" ? undefined : v),
  capacity:         z.coerce.number().int().min(1).max(10000).optional(),
  minHours:         z.coerce.number().min(0.5).max(24).optional(),
  maxHours:         z.coerce.number().optional(),
  bufferMinutes:    z.coerce.number().int().min(0).max(240).optional(),
  pricePerHour:     z.coerce.number().positive().optional(),
  cleaningFee:      z.coerce.number().min(0).optional(),
  depositAmount:    z.coerce.number().min(0).optional(),
  bookingType:      z.enum(["INSTANT", "REQUEST"]).optional(),
  isIndoor:         z.boolean().optional(),
  isOutdoor:        z.boolean().optional(),
  hasParking:       z.boolean().optional(),
  isAccessible:     z.boolean().optional(),
  allowsPets:       z.boolean().optional(),
  allowsMusic:      z.boolean().optional(),
  allowsAlcohol:    z.boolean().optional(),
  allowsCatering:   z.boolean().optional(),
  allowsSmoking:    z.boolean().optional(),
  houseRules:       z.string().max(2000).optional(),
  amenityIds:       z.array(z.string()).optional(),
});

// ── Search ────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().min(1).max(100).optional(), // km
  date: z.string().optional(), // ISO date
  startTime: z.string().optional(), // HH:MM
  endTime: z.string().optional(), // HH:MM
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  categoryId: z.string().optional(),
  amenityIds: z.string().optional(), // comma-separated
  bookingType: z.enum(["INSTANT", "REQUEST"]).optional(),
  isAccessible: z.coerce.boolean().optional(),
  hasParking: z.coerce.boolean().optional(),
  isOutdoor: z.coerce.boolean().optional(),
  allowsPets: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sortBy: z
    .enum(["relevance", "price_asc", "price_desc", "rating", "newest", "distance"])
    .default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// ── Booking ───────────────────────────────────────

export const bookingCreateSchema = z.object({
  venueId: z.string(),
  date: z.string(), // ISO date
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  guestCount: z.number().int().min(1),
  specialRequests: z.string().max(1000).optional(),
  extraIds: z.array(z.string()).default([]),
  couponCode: z.string().optional(),
});

// ── Review ────────────────────────────────────────

export const reviewCreateSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, "El comentario debe tener al menos 10 caracteres").max(2000),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
});

// ── Availability ──────────────────────────────────

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean(),
});

export const blockDateSchema = z.object({
  venueId: z.string(),
  date: z.string(), // ISO date
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
});

// ── Pagination ────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Types ─────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VenueCreateInput = z.infer<typeof venueCreateSchema>;
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
