import type { NextRequest } from "next/server";
import { AirQualityService } from "@/lib/domain/air-quality.service";
import { getPollutant, getString, getFloatingTimestamp, handleUnexpectedError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const pollutant = getPollutant(req);
    const municipality = getString(req, "municipality");
    const start = getFloatingTimestamp(req, "start");
    const end = getFloatingTimestamp(req, "end");

    // Validazione strutturale puramente HTTP-level
    if (!pollutant || !municipality || !start || !end) {
      return Response.json(
        { 
          status: "INVALID_REQUEST", 
          error: "Missing or invalid parameters. Required: pollutant, municipality, start, end. Timestamps must be floating (no 'Z')." 
        },
        { status: 400 }
      );
    }

    // Passiamo il controllo al Domain Service
    const result = await AirQualityService.getExploreData(
      pollutant, 
      municipality, 
      { start, end }
    );

    // Mappiamo i result domain status negli HTTP status corretti
    const httpStatus = result.status === "INVALID_REQUEST" ? 400 : 200;
    return Response.json(result, { status: httpStatus });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}