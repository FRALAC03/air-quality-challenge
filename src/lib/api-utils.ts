import type { NextRequest } from "next/server";
import { isValidPollutantCode } from "@/lib/domain/pollutants";
import type { PollutantCode, FloatingTimestamp } from "@/lib/domain/air-quality.types";

export function getPollutant(
  req: NextRequest,
): PollutantCode | null {
  const code = req.nextUrl.searchParams.get("pollutant");

  if (!code || !isValidPollutantCode(code)) {
    return null;
  }

  return code;
}

export function getString(req: NextRequest, key: string): string | null {
  return req.nextUrl.searchParams.get(key);
}

export function getFloatingTimestamp(req: NextRequest, key: string): FloatingTimestamp | null {
  const val = req.nextUrl.searchParams.get(key);
  if (!val || val.length < 19 || val.includes("Z")) return null;
  return val;
}

export function handleUnexpectedError(e: unknown) {
  console.error("API Error:", e);
  return Response.json(
    { status: "ERROR", error: "Internal server error" },
    { status: 500 }
  );
}