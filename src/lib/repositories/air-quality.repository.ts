import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PollutantCode, FloatingTimestamp } from "@/lib/domain/air-quality.types";
import { getArpaPollutantName } from "@/lib/domain/pollutants";

function bigintToSafeNumber(val: bigint): number {
  if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`BigInt value ${val} exceeds Number.MAX_SAFE_INTEGER`);
  }
  return Number(val);
}

export const AirQualityRepository = {
  
  async getDailyStationExceedanceEvents(
    pollutant: PollutantCode,
    threshold: number,
    startDate: FloatingTimestamp,
    endDate: FloatingTimestamp,
    municipality?: string
  ): Promise<number> {
    const pollutantName = getArpaPollutantName(pollutant);
    const municipalityFilter = municipality 
      ? Prisma.sql`AND st.municipality = ${municipality}` 
      : Prisma.empty;

    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      WITH daily_station_avg AS (
        SELECT 
          st.id AS "stationId",
          DATE_TRUNC('day', m."recordedAt") AS day,
          AVG(m.value) AS "dailyAvg"
        FROM "Measurement" m
        JOIN "Sensor" s ON m."sensorId" = s.id
        JOIN "Station" st ON s."stationId" = st.id
        WHERE s."pollutantName" = ${pollutantName}
          AND m.status = 'VA'
          AND m."recordedAt" >= ${startDate}::timestamp
          AND m."recordedAt" < ${endDate}::timestamp
          ${municipalityFilter}
        GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
      )
      SELECT COUNT(*) AS count
      FROM daily_station_avg
      WHERE "dailyAvg" > ${threshold}
    `;

    return bigintToSafeNumber(result[0]?.count ?? BigInt(0));
  },

  async getMunicipalityDailyExceedanceDays(
    pollutant: PollutantCode,
    threshold: number,
    startDate: FloatingTimestamp,
    endDate: FloatingTimestamp,
    municipality: string
  ): Promise<number> {
    const pollutantName = getArpaPollutantName(pollutant);

    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      WITH daily_station_avg AS (
        SELECT 
          st.id AS "stationId",
          DATE_TRUNC('day', m."recordedAt") AS day,
          AVG(m.value) AS "dailyAvg"
        FROM "Measurement" m
        JOIN "Sensor" s ON m."sensorId" = s.id
        JOIN "Station" st ON s."stationId" = st.id
        WHERE s."pollutantName" = ${pollutantName}
          AND st.municipality = ${municipality}
          AND m.status = 'VA'
          AND m."recordedAt" >= ${startDate}::timestamp
          AND m."recordedAt" < ${endDate}::timestamp
        GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
        HAVING AVG(m.value) > ${threshold}
      )
      SELECT COUNT(DISTINCT day) AS count
      FROM daily_station_avg
    `;

    return bigintToSafeNumber(result[0]?.count ?? BigInt(0));
  },

  async getMunicipalityHourlyExceedances(
    pollutant: PollutantCode,
    threshold: number,
    startDate: FloatingTimestamp,
    endDate: FloatingTimestamp,
    municipality?: string
  ): Promise<{ municipality: string; exceedanceHours: number }[]> {
    const pollutantName = getArpaPollutantName(pollutant);
    const municipalityFilter = municipality 
      ? Prisma.sql`AND st.municipality = ${municipality}` 
      : Prisma.empty;

    const results = await prisma.$queryRaw<{ municipality: string; exceedanceHours: bigint }[]>`
      SELECT 
        st.municipality,
        COUNT(DISTINCT DATE_TRUNC('hour', m."recordedAt")) AS "exceedanceHours"
      FROM "Measurement" m
      JOIN "Sensor" s ON m."sensorId" = s.id
      JOIN "Station" st ON s."stationId" = st.id
      WHERE s."pollutantName" = ${pollutantName}
        AND m.status = 'VA'
        AND m.value > ${threshold}
        AND m."recordedAt" >= ${startDate}::timestamp
        AND m."recordedAt" < ${endDate}::timestamp
        ${municipalityFilter}
      GROUP BY st.municipality
      ORDER BY "exceedanceHours" DESC
    `;

    return results.map(r => ({
      municipality: r.municipality,
      exceedanceHours: bigintToSafeNumber(
  r.exceedanceHours ?? BigInt(0)
)
    }));
  },

  async getPeriodAverage(
  pollutant: PollutantCode,
  startDate: FloatingTimestamp,
  endDate: FloatingTimestamp,
  municipality: string,
): Promise<number | null> {
  const pollutantName = getArpaPollutantName(pollutant);

  const result = await prisma.$queryRaw<{ periodAvg: number | null }[]>`
    WITH daily_station_avg AS (
      SELECT
        st.id AS "stationId",
        st.municipality,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS "dailyAvg"
      FROM "Measurement" m
      JOIN "Sensor" s ON m."sensorId" = s.id
      JOIN "Station" st ON s."stationId" = st.id
      WHERE s."pollutantName" = ${pollutantName}
        AND st.municipality = ${municipality}
        AND m.status = 'VA'
        AND m."recordedAt" >= ${startDate}::timestamp
        AND m."recordedAt" < ${endDate}::timestamp
      GROUP BY
        st.id,
        st.municipality,
        DATE_TRUNC('day', m."recordedAt")
    ),
    daily_municipality_avg AS (
      SELECT
        municipality,
        day,
        AVG("dailyAvg") AS "cityDailyAvg"
      FROM daily_station_avg
      GROUP BY municipality, day
    )
    SELECT AVG("cityDailyAvg") AS "periodAvg"
    FROM daily_municipality_avg
  `;

  return result[0]?.periodAvg ?? null;
},

  async getLatestDataTimestamp(): Promise<string | null> {
    const result = await prisma.$queryRaw<{ latest: string | null }[]>`
      SELECT TO_CHAR(MAX("recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS latest 
      FROM "Measurement"
    `;
    return result[0]?.latest ?? null;
  },

  async getMeasurementCountsByPollutantAndStatus(): Promise<{ pollutantName: string; status: string; count: number }[]> {
    const results = await prisma.$queryRaw<{ pollutantName: string; status: string; count: bigint }[]>`
      SELECT 
        s."pollutantName",
        m.status,
        COUNT(*) AS count
      FROM "Measurement" m
      JOIN "Sensor" s ON m."sensorId" = s.id
      GROUP BY s."pollutantName", m.status
      ORDER BY s."pollutantName", m.status
    `;

    return results.map(r => ({
      pollutantName: r.pollutantName,
      status: r.status,
      count: bigintToSafeNumber(
  r.count ?? BigInt(0)
)
    }));
  }

};