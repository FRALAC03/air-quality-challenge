import type { NextRequest } from "next/server";
import { AirQualityService } from "@/lib/domain/air-quality.service";
import { getPollutant, handleUnexpectedError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const pollutant = getPollutant(req);
    
    if (!pollutant) {
      return Response.json(
        { status: "INVALID_REQUEST", error: "Missing or invalid 'pollutant' parameter." },
        { status: 400 }
      );
    }

    const result = AirQualityService.getThresholdRule(pollutant);
    return Response.json(result, { status: 200 });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}