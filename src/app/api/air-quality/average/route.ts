import type { NextRequest } from "next/server";
import { AirQualityService } from "@/lib/domain/air-quality.service";
import { getPollutant, getString, getFloatingTimestamp, handleUnexpectedError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const pollutant = getPollutant(req);
    const municipality = getString(req, "municipality");
    const start = getFloatingTimestamp(req, "start");
    const end = getFloatingTimestamp(req, "end");

    if (!pollutant || !municipality || !start || !end) {
      return Response.json(
        { status: "INVALID_REQUEST", error: "Missing or invalid parameters. Required: pollutant, municipality, start, end." },
        { status: 400 }
      );
    }

    const result = await AirQualityService.getPeriodAverage(
      pollutant,
      { start, end },
      municipality
    );

    const httpStatus = result.status === "INVALID_REQUEST" ? 400 : 200;
    return Response.json(result, { status: httpStatus });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}