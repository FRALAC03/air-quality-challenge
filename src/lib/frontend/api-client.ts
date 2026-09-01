import type { 
  DashboardSummaryResult, 
  ExploreDataResult, 
  PollutantCode 
} from "../domain/air-quality.types";

import { addFloatingDays } from "../domain/date-utils";

export const apiClient = {
  async getDashboardSummary(): Promise<DashboardSummaryResult> {
    const res = await fetch("/api/dashboard/summary");
    if (!res.ok) throw new Error("Failed to fetch dashboard summary");
    return res.json();
  },

  async getMunicipalities(): Promise<string[]> {
    const res = await fetch("/api/data/municipalities");
    if (!res.ok) throw new Error("Failed to fetch municipalities");
    const json = await res.json();
    if (json.status !== "OK") throw new Error(json.error || "Unknown error");
    return json.municipalities;
  },

  async getExploreData(
  pollutant: PollutantCode,
  municipality: string,
  start: string,
  end: string,
): Promise<ExploreDataResult> {
  const startTimestamp =
    `${start}T00:00:00`;

  const inclusiveEndTimestamp =
    `${end}T00:00:00`;

  const exclusiveEndTimestamp =
    addFloatingDays(
      inclusiveEndTimestamp,
      1,
    );

  const params = new URLSearchParams({
    pollutant,
    municipality,
    start: startTimestamp,
    end: exclusiveEndTimestamp,
  });

  const res = await fetch(
    `/api/data/explore?${params}`,
  );

  if (!res.ok && res.status !== 400) {
    throw new Error(
      "Failed to fetch explore data",
    );
  }

  return (await res.json()) as ExploreDataResult;
},
};