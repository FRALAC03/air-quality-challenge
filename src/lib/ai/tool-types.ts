import type { 
  PollutantCode, 
  Period, 
  ExceedanceMetric,
  ToolResultStatus,
  ThresholdConfig,
  PeriodAverageResult,
  PeriodComparisonResult,
  ExceedanceResult,
  HourlyExceedanceResult,
  ExploreDataResult
} from "../domain/air-quality.types";

export type AirQualityToolName =
  | "get_threshold"
  | "get_period_average"
  | "compare_periods"
  | "get_exceedances"
  | "explore_data"
  | "list_municipalities";

export interface GetThresholdToolInput {
  pollutant: PollutantCode;
}

export interface GetPeriodAverageToolInput {
  pollutant: PollutantCode;
  municipality: string;
  period: Period;
}

export interface ComparePeriodsToolInput {
  pollutant: PollutantCode;
  municipality: string;
  period1: Period;
  period2: Period;
}

export interface GetExceedancesToolInput {
  pollutant: PollutantCode;
  municipality?: string;
  period: Period;
  metric: ExceedanceMetric;
}

export interface ExploreDataToolInput {
  pollutant: PollutantCode;
  municipality: string;
  period: Period;
}

export type AirQualityToolCall =
  | { name: "get_threshold"; arguments: GetThresholdToolInput }
  | { name: "get_period_average"; arguments: GetPeriodAverageToolInput }
  | { name: "compare_periods"; arguments: ComparePeriodsToolInput }
  | { name: "get_exceedances"; arguments: GetExceedancesToolInput }
  | { name: "explore_data"; arguments: ExploreDataToolInput }
  | { name: "list_municipalities"; arguments: Record<string, never> };

export interface ToolExecutionSuccess<T> {
  executionStatus: "SUCCESS";
  tool: AirQualityToolName;
  data: T;
}

export interface ToolExecutionFailure {
  executionStatus: "FAILURE";
  tool: string;
  error: {
    code: "INVALID_TOOL" | "INVALID_ARGUMENTS" | "EXECUTION_ERROR";
    message: string;
  };
}

export type ToolExecutionResult<T> = ToolExecutionSuccess<T> | ToolExecutionFailure;

// Tipi specifici di ritorno uniti con la firma di success 
export type GetThresholdResult = ToolExecutionResult<ThresholdConfig & { pollutant: PollutantCode; status: ToolResultStatus }>;
export type GetPeriodAverageResult = ToolExecutionResult<PeriodAverageResult>;
export type ComparePeriodsResult = ToolExecutionResult<PeriodComparisonResult>;
export type GetExceedancesResult = ToolExecutionResult<ExceedanceResult | HourlyExceedanceResult>;
export type ExploreDataResultPayload = ToolExecutionResult<ExploreDataResult>;
export type ListMunicipalitiesResult = ToolExecutionResult<{ status: "OK" | "ERROR", municipalities?: string[], error?: string }>;

export type AnyToolExecutionResult = 
  | GetThresholdResult
  | GetPeriodAverageResult
  | ComparePeriodsResult
  | GetExceedancesResult
  | ExploreDataResultPayload
  | ListMunicipalitiesResult;