import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── Standard API response shapes ─────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function paginated<T>(
  data: T[],
  meta: { page: number; limit: number; total: number }
) {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return NextResponse.json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages,
      hasNextPage: meta.page < totalPages,
      hasPrevPage: meta.page > 1,
    },
  });
}

// ── Error responses ───────────────────────────────

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json(
    { success: false, error: message, errors },
    { status: 400 }
  );
}

export function unauthorized(message = "No autenticado") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "Sin permisos") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 409 });
}

export function serverError(message = "Error interno del servidor") {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

// ── Zod error handler ─────────────────────────────

export function handleZodError(error: ZodError) {
  const errors = error.errors.reduce(
    (acc, curr) => {
      const key = curr.path.join(".");
      acc[key] = curr.message;
      return acc;
    },
    {} as Record<string, string>
  );
  return badRequest("Datos de entrada inválidos", errors);
}

// ── Generic catch handler ─────────────────────────

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return handleZodError(error);
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  console.error("[API Error]", error);
  return serverError();
}

// ── Custom error class ────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sin permisos") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
