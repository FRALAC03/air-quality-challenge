import type { NextRequest } from "next/server";
import { AirQualityService } from "@/lib/domain/air-quality.service";
import { getPollutant, getString, getFloatingTimestamp, handleUnexpectedError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const pollutant = getPollutant(req);
    const municipality = getString(req, "municipality");
    const p1Start = getFloatingTimestamp(req, "p1Start");
    const p1End = getFloatingTimestamp(req, "p1End");
    const p2Start = getFloatingTimestamp(req, "p2Start");
    const p2End = getFloatingTimestamp(req, "p2End");

    if (!pollutant || !municipality || !p1Start || !p1End || !p2Start || !p2End) {
      return Response.json(
        { status: "INVALID_REQUEST", error: "Missing or invalid parameters. Required: pollutant, municipality, p1Start, p1End, p2Start, p2End." },
        { status: 400 }
      );
    }

    const result = await AirQualityService.comparePeriods(
      pollutant,
      { start: p1Start, end: p1End },
      { start: p2Start, end: p2End },
      municipality
    );

    const httpStatus = result.status === "INVALID_REQUEST" ? 400 : 200;
    return Response.json(result, { status: httpStatus });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}