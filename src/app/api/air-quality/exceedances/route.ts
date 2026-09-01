import type { NextRequest } from "next/server";
import { AirQualityService } from "@/lib/domain/air-quality.service";
import type { ExceedanceMetric } from "@/lib/domain/air-quality.types";
import { getPollutant, getString, getFloatingTimestamp, handleUnexpectedError } from "@/lib/api-utils";

function isExceedanceMetric(
  metric: string,
): metric is ExceedanceMetric {
  return (
    metric === "STATION_EXCEEDANCE_EVENTS" ||
    metric === "MUNICIPALITY_EXCEEDANCE_DAYS" ||
    metric === "MUNICIPALITY_EXCEEDANCE_HOURS"
  );
}

export async function GET(req: NextRequest) {
  try {
    const pollutant = getPollutant(req);
    const metricStr = getString(req, "metric");
    const municipality = getString(req, "municipality");
    const start = getFloatingTimestamp(req, "start");
    const end = getFloatingTimestamp(req, "end");

    if (!pollutant || !metricStr || !start || !end) {
      return Response.json(
        { status: "INVALID_REQUEST", error: "Missing or invalid parameters. Required: pollutant, metric, start, end." },
        { status: 400 }
      );
    }

    if (!isExceedanceMetric(metricStr)) {
      return Response.json(
        { status: "INVALID_REQUEST", error: `Invalid metric: ${metricStr}` },
        { status: 400 }
      );
    }

    const metric = metricStr;

    const result = await AirQualityService.getExceedances(
      pollutant,
      { start, end },
      metric,
      municipality ?? undefined
    );

    const httpStatus = result.status === "INVALID_REQUEST" ? 400 : 200;
    return Response.json(result, { status: httpStatus });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}