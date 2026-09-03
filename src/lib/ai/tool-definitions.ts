import type {
  AirQualityToolName,
} from "./tool-types";

export interface AirQualityToolDefinition {
  name: AirQualityToolName;

  description: string;

  inputSchema: {
    type: "object";

    properties: Record<
      string,
      unknown
    >;

    required: readonly string[];

    additionalProperties: false;
  };
}

// ============================================================
// Floating Period Schema
// ============================================================

const FLOATING_PERIOD_SCHEMA = {
  type: "object",

  description:
    "Half-open time interval [start, end). " +
    "Both values must be floating timestamps without timezone " +
    "in the exact format YYYY-MM-DDTHH:mm:ss.",

  properties: {
    start: {
      type: "string",

      description:
        "Inclusive start floating timestamp. " +
        "Exact format: YYYY-MM-DDTHH:mm:ss. " +
        "Example: 2026-03-01T00:00:00.",

      pattern:
        "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$",
    },

    end: {
      type: "string",

      description:
        "Exclusive end floating timestamp. " +
        "Exact format: YYYY-MM-DDTHH:mm:ss. " +
        "For an entire calendar month, use the first day " +
        "of the following month at 00:00:00. " +
        "Example: March 2026 ends at 2026-04-01T00:00:00.",

      pattern:
        "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$",
    },
  },

  required: [
    "start",
    "end",
  ],

  additionalProperties: false,
};

// ============================================================
// Tool Definitions
// ============================================================

export const AIR_QUALITY_TOOL_DEFINITIONS:
  readonly AirQualityToolDefinition[] = [
    // --------------------------------------------------------
    // GET THRESHOLD
    // --------------------------------------------------------
    {
      name: "get_threshold",

      description:
  "Returns the authoritative configured regulatory rule " +
  "for one supported pollutant, including whether regulatory " +
  "compliance is assessable. This tool MUST be called first " +
  "when the user asks whether a pollutant is compliant, " +
  "within limits, exceeded, or otherwise normatively assessable.",

      inputSchema: {
        type: "object",

        properties: {
          pollutant: {
            type: "string",

            enum: [
              "PM10",
              "PM25",
              "NO2",
              "O3",
            ],
          },
        },

        required: [
          "pollutant",
        ],

        additionalProperties: false,
      },
    },

    // --------------------------------------------------------
    // GET PERIOD AVERAGE
    // --------------------------------------------------------
    {
      name: "get_period_average",

      description:
        "Returns the deterministic average for one " +
        "municipality and one floating timestamp period.",

      inputSchema: {
        type: "object",

        properties: {
          pollutant: {
            type: "string",

            enum: [
              "PM10",
              "PM25",
              "NO2",
              "O3",
            ],
          },

          municipality: {
            type: "string",
          },

          period:
            FLOATING_PERIOD_SCHEMA,
        },

        required: [
          "pollutant",
          "municipality",
          "period",
        ],

        additionalProperties: false,
      },
    },

    // --------------------------------------------------------
    // COMPARE PERIODS
    // --------------------------------------------------------
    {
      name: "compare_periods",

      description:
        "Compares deterministic averages for two floating " +
        "timestamp periods and returns the computed trend.",

      inputSchema: {
        type: "object",

        properties: {
          pollutant: {
            type: "string",

            enum: [
              "PM10",
              "PM25",
              "NO2",
              "O3",
            ],
          },

          municipality: {
            type: "string",
          },

          period1:
            FLOATING_PERIOD_SCHEMA,

          period2:
            FLOATING_PERIOD_SCHEMA,
        },

        required: [
          "pollutant",
          "municipality",
          "period1",
          "period2",
        ],

        additionalProperties: false,
      },
    },

    // --------------------------------------------------------
    // GET EXCEEDANCES
    // --------------------------------------------------------
    {
      name: "get_exceedances",

      description:
  "Returns deterministic exceedance metrics for the " +
  "requested pollutant, period and metric. " +
  "When metric is MUNICIPALITY_EXCEEDANCE_DAYS or " +
  "MUNICIPALITY_EXCEEDANCE_HOURS, municipality MUST be " +
  "provided. Never omit municipality for municipality-level metrics.",

      inputSchema: {
        type: "object",

        properties: {
          pollutant: {
            type: "string",

            enum: [
              "PM10",
              "PM25",
              "NO2",
              "O3",
            ],
          },

          municipality: {
            type: "string",
          },

          period:
            FLOATING_PERIOD_SCHEMA,

          metric: {
            type: "string",

            enum: [
              "STATION_EXCEEDANCE_EVENTS",
              "MUNICIPALITY_EXCEEDANCE_DAYS",
              "MUNICIPALITY_EXCEEDANCE_HOURS",
            ],
          },
        },

        required: [
          "pollutant",
          "period",
          "metric",
        ],

        additionalProperties: false,
      },
    },

    // --------------------------------------------------------
    // EXPLORE DATA
    // --------------------------------------------------------
    {
      name: "explore_data",

      description:
  "Returns station timeseries plus the deterministic Domain " +
  "exceedance result for one municipality and period. " +
  "Use it when station-level time-series data are actually needed. " +
  "Do NOT use the timeseries to manually calculate averages, " +
  "thresholds, exceedances or regulatory compliance.",

      inputSchema: {
        type: "object",

        properties: {
          pollutant: {
            type: "string",

            enum: [
              "PM10",
              "PM25",
              "NO2",
              "O3",
            ],
          },

          municipality: {
            type: "string",
          },

          period:
            FLOATING_PERIOD_SCHEMA,
        },

        required: [
          "pollutant",
          "municipality",
          "period",
        ],

        additionalProperties: false,
      },
    },

    // --------------------------------------------------------
    // LIST MUNICIPALITIES
    // --------------------------------------------------------
    {
      name: "list_municipalities",

      description:
        "Returns municipalities available in the dataset.",

      inputSchema: {
        type: "object",

        properties: {},

        required: [],

        additionalProperties: false,
      },
    },
  ];