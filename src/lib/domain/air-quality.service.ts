import { AirQualityRepository } from "@/lib/repositories/air-quality.repository";
import { getThreshold } from "./thresholds";
import type { 
  PollutantCode, 
  Period, 
  ExceedanceMetric, 
  ExceedanceResult, 
  HourlyExceedanceResult, 
  PeriodAverageResult, 
  PeriodComparisonResult,
  AreaPeriodAverageResult,
  ThresholdConfig,
  TrendClassification,
  ToolResultStatus,
  ExploreDataResult
} from "./air-quality.types";

const FLOATING_TIMESTAMP_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?$/;

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isValidFloatingTimestamp(ts: string): boolean {
  const match = ts.match(FLOATING_TIMESTAMP_REGEX);
  if (!match) return false;
  
  const [, yyyy, mm, dd, hh, min, ss] = match;
  const year = parseInt(yyyy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const hour = parseInt(hh, 10);
  const minute = parseInt(min, 10);
  const second = parseInt(ss, 10);

  if (month < 1 || month > 12) return false;
  
  const isLeap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  if (day < 1 || day > daysInMonth[month - 1]) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;
  
  return true;
}

function validatePeriod(period: Period) {
  if (!period.start || !period.end) throw new Error("Period start and end are required.");
  if (!isValidFloatingTimestamp(period.start)) throw new Error(`Invalid start format/value: ${period.start}`);
  if (!isValidFloatingTimestamp(period.end)) throw new Error(`Invalid end format/value: ${period.end}`);
  
  if (period.start >= period.end) throw new Error("Start timestamp must be strictly before end timestamp.");
}

/**
 * Funzione pura per il calcolo unificato del trend su due medie temporali
 */
export function calculateTrend(previousValue: number | null, currentValue: number | null): {
  absoluteChange: number | null;
  percentageChange: number | null;
  trend: TrendClassification | null;
} {
  if (previousValue === null || currentValue === null) {
    return { absoluteChange: null, percentageChange: null, trend: null };
  }

  const absoluteChange = currentValue - previousValue;
  let percentageChange: number | null = null;
  let trend: TrendClassification | null = null;

  if (previousValue !== 0) {
    percentageChange = (absoluteChange / previousValue) * 100;
    if (percentageChange <= -5) trend = "IMPROVING";
    else if (percentageChange >= 5) trend = "WORSENING";
    else trend = "STABLE";
  }

  return { absoluteChange, percentageChange, trend };
}

export const AirQualityService = {
  
  async getExceedances(
    pollutant: PollutantCode,
    period: Period,
    metric: ExceedanceMetric,
    municipality?: string
  ): Promise<ExceedanceResult | HourlyExceedanceResult> {
    
    try {
      validatePeriod(period);
    } catch (e: unknown) {
      return { status: "INVALID_REQUEST", message: getErrorMessage(e), pollutant, period, metric, value: null, unit: "" };
    }

    const threshold = getThreshold(pollutant);

    if (pollutant === "PM25") {
      return {
        status: "NOT_ASSESSABLE",
        message: threshold.description,
        pollutant,
        period,
        municipality,
        metric,
        value: null,
        unit: threshold.unit,
        complianceStatus: "NOT_ASSESSABLE",
        metadata: { source: "static_config", note: "Regulatory compliance cannot be evaluated for this dataset." }
      } as ExceedanceResult;
    }

    if (pollutant === "PM10" && metric === "MUNICIPALITY_EXCEEDANCE_HOURS") {
      return { status: "INVALID_REQUEST", message: "Hourly metric not supported for PM10.", pollutant, period, metric, value: null, unit: "" } as ExceedanceResult;
    }

    if ((pollutant === "O3" || pollutant === "NO2") && metric !== "MUNICIPALITY_EXCEEDANCE_HOURS") {
      return { status: "INVALID_REQUEST", message: "Daily metrics not supported for O3/NO2.", pollutant, period, metric, value: null, unit: "" } as ExceedanceResult;
    }

    if (metric === "MUNICIPALITY_EXCEEDANCE_DAYS" && !municipality) {
      return { status: "INVALID_REQUEST", message: "Municipality is required for MUNICIPALITY_EXCEEDANCE_DAYS.", pollutant, period, metric, value: null, unit: "" } as ExceedanceResult;
    }

    const hasData = await AirQualityRepository.hasValidData(pollutant, period.start, period.end, municipality);
    if (!hasData) {
      return {
        status: "NO_DATA",
        message: `No valid data found for ${pollutant} in the specified period.`,
        pollutant,
        period,
        municipality,
        metric,
        value: null,
        unit: threshold.unit
      } as ExceedanceResult;
    }

    if (metric === "MUNICIPALITY_EXCEEDANCE_HOURS") {
  const results =
    await AirQualityRepository.getMunicipalityHourlyExceedances(
      pollutant,
      threshold.value,
      period.start,
      period.end,
      municipality,
    );

  return {
    status: "OK",
    pollutant,
    period,
    metric,
    unit: threshold.unit,
    results,
    metadata: {
      source: "database_computed",
      aggregation: threshold.base,
    },
  };
}

    if (metric === "MUNICIPALITY_EXCEEDANCE_DAYS") {
  const normalizedMunicipality = municipality?.trim();

  if (!normalizedMunicipality) {
    return {
      status: "INVALID_REQUEST",
      message:
        "Municipality is required for MUNICIPALITY_EXCEEDANCE_DAYS.",
      pollutant,
      period,
      metric,
      value: null,
      unit: "",
    };
  }

  const count =
    await AirQualityRepository.getMunicipalityDailyExceedanceDays(
      pollutant,
      threshold.value,
      period.start,
      period.end,
      normalizedMunicipality,
    );

  return {
    status: "OK",
    pollutant,
    period,
    municipality: normalizedMunicipality,
    metric,
    value: count,
    unit: "days",
    metadata: {
      source: "database_computed",
      aggregation: threshold.base,
    },
  };
}

    if (metric === "STATION_EXCEEDANCE_EVENTS") {
      const count = await AirQualityRepository.getDailyStationExceedanceEvents(
        pollutant, threshold.value, period.start, period.end, municipality
      );
      return {
        status: "OK",
        pollutant,
        period,
        municipality,
        metric,
        value: count,
        unit: "events",
        metadata: { source: "database_computed", aggregation: threshold.base }
      };
    }

    return { status: "INVALID_REQUEST", message: "Unknown metric.", pollutant, period, metric, value: null, unit: "" } as ExceedanceResult;
  },

  async getPeriodAverage(
    pollutant: PollutantCode,
    period: Period,
    municipality: string
  ): Promise<PeriodAverageResult> {
    
    try {
      validatePeriod(period);
    } catch (e: unknown) {
      return { status: "INVALID_REQUEST", message: getErrorMessage(e), pollutant, period, municipality, value: null, unit: "" };
    }

    const value = await AirQualityRepository.getPeriodAverage(pollutant, period.start, period.end, municipality);
    const threshold = getThreshold(pollutant);

    if (value === null) {
      return {
        status: "NO_DATA",
        pollutant,
        municipality,
        period,
        value: null,
        unit: threshold.unit
      };
    }

    return {
      status: "OK",
      pollutant,
      municipality,
      period,
      value,
      unit: threshold.unit,
      complianceStatus: threshold.complianceAssessable ? undefined : "NOT_ASSESSABLE",
      metadata: { source: "database_computed", aggregation: "daily", note: threshold.complianceAssessable ? undefined : "Media fornita esclusivamente a scopo descrittivo." }
    };
  },

  async getAreaPeriodAverage(
    pollutant: PollutantCode,
    period: Period
  ): Promise<AreaPeriodAverageResult> {
    
    try {
      validatePeriod(period);
    } catch (e: unknown) {
      return { status: "INVALID_REQUEST", message: getErrorMessage(e), pollutant, scope: "AREA", period, value: null, unit: "" };
    }

    const value = await AirQualityRepository.getAreaPeriodAverage(pollutant, period.start, period.end);
    const threshold = getThreshold(pollutant);

    if (value === null) {
      return {
        status: "NO_DATA",
        pollutant,
        scope: "AREA",
        period,
        value: null,
        unit: threshold.unit
      };
    }

    return {
      status: "OK",
      pollutant,
      scope: "AREA",
      period,
      value,
      unit: threshold.unit,
      complianceStatus: threshold.complianceAssessable ? undefined : "NOT_ASSESSABLE",
      metadata: { source: "database_computed", aggregation: "daily", note: threshold.complianceAssessable ? undefined : "Media fornita esclusivamente a scopo descrittivo." }
    };
  },

  async comparePeriods(
    pollutant: PollutantCode,
    period1: Period,
    period2: Period,
    municipality: string
  ): Promise<PeriodComparisonResult> {
    
    try {
      validatePeriod(period1);
      validatePeriod(period2);
    } catch (e: unknown) {
      return { status: "INVALID_REQUEST", message: getErrorMessage(e), pollutant, period1, period2, municipality, period1Average: null, period2Average: null, absoluteChange: null, percentageChange: null, trend: null };
    }

    const avg1 = await AirQualityRepository.getPeriodAverage(pollutant, period1.start, period1.end, municipality);
    const avg2 = await AirQualityRepository.getPeriodAverage(pollutant, period2.start, period2.end, municipality);

    if (avg1 === null || avg2 === null) {
      return {
        status: "NO_DATA",
        pollutant,
        period1,
        period2,
        municipality,
        period1Average: avg1,
        period2Average: avg2,
        absoluteChange: null,
        percentageChange: null,
        trend: null,
      };
    }

    const { absoluteChange, percentageChange, trend } = calculateTrend(avg1, avg2);

    return {
      status: "OK",
      pollutant,
      municipality,
      period1,
      period2,
      period1Average: avg1,
      period2Average: avg2,
      absoluteChange,
      percentageChange,
      trend,
      metadata: { source: "database_computed" }
    };
  },

  getThresholdRule(pollutant: PollutantCode): ThresholdConfig & { pollutant: PollutantCode; status: ToolResultStatus } {
    return {
      status: "OK",
      pollutant,
      ...getThreshold(pollutant)
    };
  },

  
  async getExploreData(
    pollutant: PollutantCode,
    municipality: string,
    period: Period
  ): Promise<ExploreDataResult> { 
    
    const cleanMunicipality = municipality?.trim();
    const threshold = getThreshold(pollutant);

    try {
      validatePeriod(period);
      if (!cleanMunicipality) throw new Error("Municipality is required.");
    } catch (e: unknown) {
      return { 
        status: "INVALID_REQUEST", 
        message: getErrorMessage(e), 
        pollutant, 
        municipality: cleanMunicipality, 
        period, 
        timeseries: [], 
        measurementUnit: threshold.unit,
        exceedances: null 
      };
    }

    // 1. Fetching Timeseries
    const timeseries = await AirQualityRepository.getStationTimeSeries(
      pollutant, cleanMunicipality, period.start, period.end
    );

    // 2. Status Decision (Basato puramente sull'esistenza dei dati temporali)
    if (timeseries.length === 0) {
      return {
        status: "NO_DATA",
        pollutant,
        municipality: cleanMunicipality,
        period,
        measurementUnit: threshold.unit,
        timeseries: [],
        exceedances: null // Nessun calcolo ulteriore
      };
    }

    // 3. Routing Exceedance Metric Base
    let metric: ExceedanceMetric;
    if (pollutant === "PM10" || pollutant === "PM25") {
      // Per il PM25 il servizio di getExceedances lo intercetterà e restituirà NOT_ASSESSABLE, 
      // ma abbiamo bisogno di passargli una metrica formale per non incappare nell'errore "Unknown metric".
      metric = "MUNICIPALITY_EXCEEDANCE_DAYS"; 
    } else {
      metric = "MUNICIPALITY_EXCEEDANCE_HOURS"; // O3 e NO2
    }

    // 4. Esecuzione logica normativa 
    // Passando la stringa "cleanMunicipality" non avremo il problema dell'undefined e 
    // HourlyResult restituirà esattamente un array che noi lasceremo intatto (conterrà l'unica city cercata).
    const exceedances = await this.getExceedances(
      pollutant, period, metric, cleanMunicipality
    );

    return {
      status: "OK",
      pollutant,
      municipality: cleanMunicipality,
      period,
      measurementUnit: threshold.unit,
      timeseries,
      exceedances
    };
  },

  async getMunicipalities(): Promise<{
  status: "OK";
  municipalities: string[];
}> {
  const municipalities =
    await AirQualityRepository.getMunicipalities();

  return {
    status: "OK",
    municipalities,
  };
},
};
