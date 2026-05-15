import { NextResponse } from "next/server";
import { AppError } from "@/utils/app-error";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[api:error]", error);
  return NextResponse.json(
    { error: message, code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

