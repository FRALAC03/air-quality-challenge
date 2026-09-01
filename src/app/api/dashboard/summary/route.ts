import { NextResponse } from "next/server";
import { AirQualityRepository } from "@/lib/repositories/air-quality.repository";
import { AirQualityService, calculateTrend } from "@/lib/domain/air-quality.service";
import { getDashboardPeriods } from "@/lib/domain/date-utils";
import { handleUnexpectedError } from "@/lib/api-utils";
import type { 
  PollutantCode, 
  DashboardSummaryResult, 
  DashboardKpiResult 
} from "@/lib/domain/air-quality.types";

export async function GET() {
  try {
    const maxDate = await AirQualityRepository.getLatestDataTimestamp();

    if (!maxDate) {
      const emptyResult: DashboardSummaryResult = {
        status: "NO_DATA",
        maxDate: null,
        currentPeriod: null,
        previousPeriod: null,
        kpis: []
      };
      return NextResponse.json(emptyResult, { status: 200 });
    }

    const { currentPeriod, previousPeriod } = getDashboardPeriods(maxDate);
    const pollutants: PollutantCode[] = ["PM10", "PM25", "NO2", "O3"];

    const kpiPromises = pollutants.map(async (pollutant): Promise<DashboardKpiResult> => {
      const [currentRes, previousRes] = await Promise.all([
        AirQualityService.getAreaPeriodAverage(pollutant, currentPeriod),
        AirQualityService.getAreaPeriodAverage(pollutant, previousPeriod)
      ]);

      const currentAverage = currentRes.value;
      const previousAverage = previousRes.value;

      const { absoluteChange, percentageChange, trend } = calculateTrend(previousAverage, currentAverage);

      const status = (currentRes.status === "NO_DATA" || previousRes.status === "NO_DATA") 
        ? "NO_DATA" 
        : "OK";

      return {
        pollutant,
        unit: currentRes.unit,
        currentAverage,
        previousAverage,
        absoluteChange,
        percentageChange,
        trend,
        status,
        complianceStatus: currentRes.complianceStatus,
        note: currentRes.metadata?.note
      };
    });

    const kpis = await Promise.all(kpiPromises);

    const result: DashboardSummaryResult = {
      status: "OK",
      maxDate,
      currentPeriod,
      previousPeriod,
      kpis
    };

    return NextResponse.json(result, { status: 200 });

  } catch (e: unknown) {
    return handleUnexpectedError(e);
  }
}