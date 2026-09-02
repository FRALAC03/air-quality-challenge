import { isValidPollutantCode } from "../domain/pollutants";
import type { Period, ExceedanceMetric } from "../domain/air-quality.types";
import type { 
  AirQualityToolCall, 
  AnyToolExecutionResult, 
  ToolExecutionFailure 
} from "./tool-types";
import { 
  executeGetThreshold, 
  executeGetPeriodAverage, 
  executeComparePeriods, 
  executeGetExceedances, 
  executeExploreData, 
  executeListMunicipalities 
} from "./air-quality-tools";

function assertNever(value: never): never {
  throw new Error(`Unhandled tool: ${JSON.stringify(value)}`);
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function executeAirQualityTool(call: AirQualityToolCall): Promise<AnyToolExecutionResult> {
  try {
    switch (call.name) {
      case "get_threshold":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeGetThreshold(call.arguments) };
      
      case "get_period_average":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeGetPeriodAverage(call.arguments) };
      
      case "compare_periods":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeComparePeriods(call.arguments) };
      
      case "get_exceedances":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeGetExceedances(call.arguments) };
      
      case "explore_data":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeExploreData(call.arguments) };
      
      case "list_municipalities":
        return { executionStatus: "SUCCESS", tool: call.name, data: await executeListMunicipalities() };
      
      default:
        return assertNever(call);
    }
  } catch (e: unknown) {
    return {
      executionStatus: "FAILURE",
      tool: call.name,
      error: {
        code: "EXECUTION_ERROR",
        message: getErrorMessage(e)
      }
    };
  }
}

// ============================================================================
// BOUNDARY VALIDATION
// ============================================================================

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function hasValidPeriodShape(val: unknown): val is Period {
  if (!isObject(val)) return false;
  return typeof val.start === "string" && typeof val.end === "string";
}

function isExceedanceMetric(val: unknown): val is ExceedanceMetric {
  return typeof val === "string" && ["STATION_EXCEEDANCE_EVENTS", "MUNICIPALITY_EXCEEDANCE_DAYS", "MUNICIPALITY_EXCEEDANCE_HOURS"].includes(val);
}

export function parseAirQualityToolCall(input: unknown): AirQualityToolCall | ToolExecutionFailure {
  if (!isObject(input) || typeof input.name !== "string" || !isObject(input.arguments)) {
    return { executionStatus: "FAILURE", tool: "UNKNOWN", error: { code: "INVALID_TOOL", message: "Input must be an object with string 'name' and object 'arguments'." } };
  }

  const name = input.name;
  const args = input.arguments;

  switch (name) {
    case "get_threshold": {
      const pollutant = args.pollutant;
      if (typeof pollutant !== "string" || !isValidPollutantCode(pollutant)) {
        return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Missing or invalid pollutant" } };
      }
      return { name: "get_threshold", arguments: { pollutant } };
    }

    case "get_period_average": {
      const pollutant = args.pollutant;
      const municipality = args.municipality;
      const period = args.period;

      if (typeof pollutant !== "string" || !isValidPollutantCode(pollutant) || typeof municipality !== "string" || !hasValidPeriodShape(period)) {
         return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Missing or invalid args for get_period_average" } };
      }
      return {
        name: "get_period_average",
        arguments: {
          pollutant,
          municipality,
          period: { start: period.start, end: period.end }
        }
      };
    }

    case "compare_periods": {
      const pollutant = args.pollutant;
      const municipality = args.municipality;
      const period1 = args.period1;
      const period2 = args.period2;

      if (typeof pollutant !== "string" || !isValidPollutantCode(pollutant) || typeof municipality !== "string" || !hasValidPeriodShape(period1) || !hasValidPeriodShape(period2)) {
         return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Missing or invalid args for compare_periods" } };
      }
      return {
        name: "compare_periods",
        arguments: {
          pollutant,
          municipality,
          period1: { start: period1.start, end: period1.end },
          period2: { start: period2.start, end: period2.end }
        }
      };
    }

    case "get_exceedances": {
      const pollutant = args.pollutant;
      const period = args.period;
      const metric = args.metric;
      const municipality = args.municipality;

      if (typeof pollutant !== "string" || !isValidPollutantCode(pollutant) || !hasValidPeriodShape(period) || !isExceedanceMetric(metric)) {
        return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Missing or invalid args for get_exceedances" } };
      }
      if (municipality !== undefined && typeof municipality !== "string") {
        return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Municipality must be a string if provided" } };
      }
      return {
        name: "get_exceedances",
        arguments: {
          pollutant,
          period: { start: period.start, end: period.end },
          metric,
          municipality
        }
      };
    }

    case "explore_data": {
      const pollutant = args.pollutant;
      const municipality = args.municipality;
      const period = args.period;

      if (typeof pollutant !== "string" || !isValidPollutantCode(pollutant) || typeof municipality !== "string" || !hasValidPeriodShape(period)) {
        return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "Missing or invalid args for explore_data" } };
      }
      return {
        name: "explore_data",
        arguments: {
          pollutant,
          municipality,
          period: { start: period.start, end: period.end }
        }
      };
    }

    case "list_municipalities": {
      if (Object.keys(args).length > 0) {
        return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_ARGUMENTS", message: "list_municipalities accepts no arguments" } };
      }
      return { name: "list_municipalities", arguments: {} };
    }

    default:
      return { executionStatus: "FAILURE", tool: name, error: { code: "INVALID_TOOL", message: `Tool name '${name}' is not recognized.` } };
  }
} 