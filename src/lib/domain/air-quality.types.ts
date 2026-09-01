export type PollutantCode = "PM10" | "PM25" | "NO2" | "O3";

export type AggregationBase = "hourly" | "daily" | "annual";

export type ThresholdRuleType = "limit" | "information";

export type ToolResultStatus = 
  | "OK" 
  | "NO_DATA" 
  | "INVALID_REQUEST" 
  | "NOT_ASSESSABLE";

export type ComplianceStatus = 
  | "COMPLIANT" 
  | "EXCEEDED" 
  | "NOT_ASSESSABLE";

export type TrendClassification = "IMPROVING" | "WORSENING" | "STABLE";

export type FloatingTimestamp = string;

export type ExceedanceMetric =
  | "STATION_EXCEEDANCE_EVENTS"
  | "MUNICIPALITY_EXCEEDANCE_DAYS"
  | "MUNICIPALITY_EXCEEDANCE_HOURS";

export interface Period {
  start: FloatingTimestamp;
  end: FloatingTimestamp;
}

export interface BaseDomainResult {
  status: ToolResultStatus;
  message?: string;
  metadata?: {
    source: "database_computed" | "static_config";
    metric?: string;
    aggregation?: AggregationBase | "daily"; // Consente il "daily" fisso per il period average
    note?: string;
  };
}

export interface ExceedanceResult extends BaseDomainResult {
  pollutant: PollutantCode;
  period: Period;
  municipality?: string;
  metric: ExceedanceMetric;
  value: number | null; 
  unit: string;
  complianceStatus?: ComplianceStatus;
}

export interface HourlyExceedanceResult extends BaseDomainResult {
  pollutant: PollutantCode;
  period: Period;
  metric: ExceedanceMetric;
  results: { municipality: string; exceedanceHours: number }[];
}

export interface PeriodAverageResult extends BaseDomainResult {
  pollutant: PollutantCode;
  municipality: string; // Ora obbligatorio
  period: Period;
  value: number | null;
  unit: string;
  complianceStatus?: ComplianceStatus;
}

export interface AreaPeriodAverageResult extends BaseDomainResult {
  pollutant: PollutantCode;
  scope: "AREA";
  period: Period;
  value: number | null;
  unit: string;
  complianceStatus?: ComplianceStatus;
}

export interface PeriodComparisonResult extends BaseDomainResult {
  pollutant: PollutantCode;
  municipality: string; // Ora obbligatorio
  period1: Period;
  period2: Period;
  period1Average: number | null;
  period2Average: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  trend: TrendClassification | null;
}

export interface ThresholdConfig {
  value: number;
  unit: string;
  base: AggregationBase;
  ruleType: ThresholdRuleType;
  description: string;
  complianceAssessable: boolean;
} 

export interface DashboardKpiResult {
  pollutant: PollutantCode;
  unit: string;

  currentAverage: number | null;
  previousAverage: number | null;

  absoluteChange: number | null;
  percentageChange: number | null;
  trend: TrendClassification | null;

  status: ToolResultStatus;

  complianceStatus?: ComplianceStatus;
  note?: string;
}

export interface DashboardSummaryResult {
  status: ToolResultStatus | "ERROR";

  maxDate: FloatingTimestamp | null;

  currentPeriod: Period | null;
  previousPeriod: Period | null;

  kpis: DashboardKpiResult[];

  error?: string;
}

export interface StationTimeSeriesPoint {
  stationId: number;
  stationName: string;
  recordedAt: FloatingTimestamp;
  value: number;
}

// Proposta della struttura del futuro Domain Result per la rotta Explore
export interface ExploreDataResult extends BaseDomainResult {
  pollutant: PollutantCode;
  municipality: string;
  period: Period;
  timeseries: StationTimeSeriesPoint[];
  
  // Il tipo di exceedance dipende dalla regola normativa dell'inquinante 
  // (es. days per PM10, hours per O3, o NOT_ASSESSABLE per PM25).
  // La tipizzazione esatta sfrutta l'unione dei tipi creati in Fase C.
  exceedances: ExceedanceResult | HourlyExceedanceResult; 
}