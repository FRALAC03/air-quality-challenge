import type { StationTimeSeriesPoint } from "../domain/air-quality.types";

export interface RechartsDataPoint {
  recordedAt: string;
  [key: string]: string | number; // "station_123": 45
}

export interface RechartsMetaData {
  key: string;
  stationId: number;
  stationName: string;
}

export interface RechartsPayload {
  data: RechartsDataPoint[];
  metadata: RechartsMetaData[];
}

export function transformToRechartsPayload(timeseries: StationTimeSeriesPoint[]): RechartsPayload {
  const metadataMap = new Map<number, string>();
  const pointMap = new Map<string, RechartsDataPoint>();

  for (const row of timeseries) {
    if (!metadataMap.has(row.stationId)) {
      metadataMap.set(row.stationId, row.stationName);
    }

    if (!pointMap.has(row.recordedAt)) {
      pointMap.set(row.recordedAt, { recordedAt: row.recordedAt });
    }

    const point = pointMap.get(row.recordedAt)!;
    point[`station_${row.stationId}`] = row.value;
  }
const metadata:
  RechartsMetaData[] = Array.from(metadataMap.entries())
    .map(([id, name]) => ({
      key: `station_${id}`,
      stationId: id,
      stationName: name,
    }))
    .sort(
      (a, b) =>
        a.stationId - b.stationId,
    );

const data =
  Array.from(pointMap.values())
    .sort((a, b) =>
      a.recordedAt.localeCompare(
        b.recordedAt,
      ),
    );
  return { data, metadata };
}