import type { AirQualityToolName } from "./tool-types";

export interface AirQualityToolDefinition {
  name: AirQualityToolName;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: readonly string[];
    additionalProperties: false;
  };
}

export const AIR_QUALITY_TOOL_DEFINITIONS: readonly AirQualityToolDefinition[] = [
  {
    name: "get_threshold",
    description: "Returns the configured regulatory threshold/rule for one supported pollutant.",
    inputSchema: {
      type: "object",
      properties: {
        pollutant: { type: "string", enum: ["PM10", "PM25", "NO2", "O3"] }
      },
      required: ["pollutant"],
      additionalProperties: false
    }
  },
  {
    name: "get_period_average",
    description: "Returns the deterministic average for one municipality and period.",
    inputSchema: {
      type: "object",
      properties: {
        pollutant: { type: "string", enum: ["PM10", "PM25", "NO2", "O3"] },
        municipality: { type: "string" },
        period: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" }
          },
          required: ["start", "end"],
          additionalProperties: false
        }
      },
      required: ["pollutant", "municipality", "period"],
      additionalProperties: false
    }
  },
  {
    name: "compare_periods",
    description: "Compares deterministic averages for two periods and returns the computed trend.",
    inputSchema: {
      type: "object",
      properties: {
        pollutant: { type: "string", enum: ["PM10", "PM25", "NO2", "O3"] },
        municipality: { type: "string" },
        period1: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" }
          },
          required: ["start", "end"],
          additionalProperties: false
        },
        period2: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" }
          },
          required: ["start", "end"],
          additionalProperties: false
        }
      },
      required: ["pollutant", "municipality", "period1", "period2"],
      additionalProperties: false
    }
  },
  {
    name: "get_exceedances",
    description: "Returns deterministic exceedance metrics according to the requested metric.",
    inputSchema: {
      type: "object",
      properties: {
        pollutant: { type: "string", enum: ["PM10", "PM25", "NO2", "O3"] },
        municipality: { type: "string" },
        period: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" }
          },
          required: ["start", "end"],
          additionalProperties: false
        },
        metric: { type: "string", enum: ["STATION_EXCEEDANCE_EVENTS", "MUNICIPALITY_EXCEEDANCE_DAYS", "MUNICIPALITY_EXCEEDANCE_HOURS"] }
      },
      required: ["pollutant", "period", "metric"],
      additionalProperties: false
    }
  },
  {
    name: "explore_data",
    description: "Returns station timeseries plus the deterministic exceedance result for one municipality and period.",
    inputSchema: {
      type: "object",
      properties: {
        pollutant: { type: "string", enum: ["PM10", "PM25", "NO2", "O3"] },
        municipality: { type: "string" },
        period: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" }
          },
          required: ["start", "end"],
          additionalProperties: false
        }
      },
      required: ["pollutant", "municipality", "period"],
      additionalProperties: false
    }
  },
  {
    name: "list_municipalities",
    description: "Returns municipalities available in the dataset.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
];