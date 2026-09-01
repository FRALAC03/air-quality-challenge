import "dotenv/config";

import { AirQualityRepository } from "../src/lib/repositories/air-quality.repository";
import type {
  FloatingTimestamp,
  StationTimeSeriesPoint,
} from "../src/lib/domain/air-quality.types";

function assertTimestampInRange(
  timestamp: FloatingTimestamp,
  start: FloatingTimestamp,
  end: FloatingTimestamp,
): void {
  if (timestamp < start || timestamp >= end) {
    throw new Error(
      `Timestamp ${timestamp} outside [${start}, ${end})`,
    );
  }
}

function assertPointIntegrity(
  point: StationTimeSeriesPoint,
): void {
  if (!Number.isInteger(point.stationId)) {
    throw new Error(
      `Invalid stationId: ${String(point.stationId)}`,
    );
  }

  if (!point.stationName.trim()) {
    throw new Error(
      `Empty stationName for station ${point.stationId}`,
    );
  }

  if (!point.recordedAt) {
    throw new Error(
      `Missing recordedAt for station ${point.stationId}`,
    );
  }

  if (!Number.isFinite(point.value)) {
    throw new Error(
      `Invalid value for station ${point.stationId}: ${String(point.value)}`,
    );
  }
}

function assertDeterministicOrdering(
  points: StationTimeSeriesPoint[],
): void {
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    if (current.recordedAt < previous.recordedAt) {
      throw new Error(
        `Ordering violation at index ${i}: ` +
          `${current.recordedAt} < ${previous.recordedAt}`,
      );
    }

    if (
      current.recordedAt === previous.recordedAt &&
      current.stationId < previous.stationId
    ) {
      throw new Error(
        `Station ordering violation at timestamp ${current.recordedAt}: ` +
          `${current.stationId} < ${previous.stationId}`,
      );
    }
  }
}

function assertNoDuplicateStationTimestamp(
  points: StationTimeSeriesPoint[],
): void {
  const keys = new Set<string>();

  for (const point of points) {
    const key =
      `${point.stationId}|${point.recordedAt}`;

    if (keys.has(key)) {
      throw new Error(
        `Duplicate station/timestamp point found: ${key}`,
      );
    }

    keys.add(key);
  }
}

async function main(): Promise<void> {
  console.log(
    "Starting Explore Repository Verification...\n",
  );

  let passed = 0;
  const total = 8;

  try {
    // ======================================================
    // 1. Milano PM10 row count
    // ======================================================

    const milanoPm10 =
      await AirQualityRepository.getStationTimeSeries(
        "PM10",
        "Milano",
        "2026-03-01T00:00:00",
        "2026-04-01T00:00:00",
      );

    if (milanoPm10.length !== 117) {
      throw new Error(
        `Test 1 Failed: expected 117 rows, got ${milanoPm10.length}`,
      );
    }

    console.log(
      "✅ Test 1 Passed (Milano PM10 = 117 VA rows)",
    );
    passed++;

    // ======================================================
    // 2. Milano PM10 stations + min/max
    // ======================================================

    const milanoStations = new Set(
      milanoPm10.map((point) => point.stationId),
    );

    if (milanoStations.size !== 4) {
      throw new Error(
        `Test 2 Failed: expected 4 stations, got ${milanoStations.size}`,
      );
    }

    if (
      milanoPm10[0]?.recordedAt !==
        "2026-03-01T00:00:00.000" ||
      milanoPm10.at(-1)?.recordedAt !==
        "2026-03-31T00:00:00.000"
    ) {
      throw new Error(
        `Test 2 Failed: wrong min/max timestamps. ` +
          `First=${milanoPm10[0]?.recordedAt}, ` +
          `Last=${milanoPm10.at(-1)?.recordedAt}`,
      );
    }

    console.log(
      "✅ Test 2 Passed (Milano PM10 = 4 stations, exact min/max)",
    );
    passed++;

    // ======================================================
    // 3. Milano PM10 data integrity/range
    // ======================================================

    for (const point of milanoPm10) {
      assertPointIntegrity(point);

      assertTimestampInRange(
        point.recordedAt,
        "2026-03-01T00:00:00",
        "2026-04-01T00:00:00",
      );
    }

    console.log(
      "✅ Test 3 Passed (Milano PM10 point integrity and range)",
    );
    passed++;

    // ======================================================
    // 4. Deterministic ordering
    // ======================================================

    assertDeterministicOrdering(milanoPm10);

    console.log(
      "✅ Test 4 Passed (recordedAt ASC, stationId ASC)",
    );
    passed++;

    // ======================================================
    // 5. No station/timestamp duplicates
    // ======================================================

    assertNoDuplicateStationTimestamp(milanoPm10);

    console.log(
      "✅ Test 5 Passed (no duplicated station/timestamp points)",
    );
    passed++;

    // ======================================================
    // 6. Monza O3 baseline
    // ======================================================

    const monzaO3 =
      await AirQualityRepository.getStationTimeSeries(
        "O3",
        "Monza",
        "2026-08-01T00:00:00",
        "2026-09-01T00:00:00",
      );

    if (monzaO3.length !== 1265) {
      throw new Error(
        `Test 6 Failed: expected 1265 rows, got ${monzaO3.length}`,
      );
    }

    const monzaStations = new Set(
      monzaO3.map((point) => point.stationId),
    );

    if (monzaStations.size !== 2) {
      throw new Error(
        `Test 6 Failed: expected 2 stations, got ${monzaStations.size}`,
      );
    }

    if (
      monzaO3[0]?.recordedAt !==
        "2026-08-01T00:00:00.000" ||
      monzaO3.at(-1)?.recordedAt !==
        "2026-08-27T08:00:00.000"
    ) {
      throw new Error(
        `Test 6 Failed: wrong Monza O3 min/max. ` +
          `First=${monzaO3[0]?.recordedAt}, ` +
          `Last=${monzaO3.at(-1)?.recordedAt}`,
      );
    }

    console.log(
      "✅ Test 6 Passed (Monza O3 = 1265 rows, 2 stations, exact min/max)",
    );
    passed++;

    // ======================================================
    // 7. Monza O3 integrity/range/ordering
    // ======================================================

    for (const point of monzaO3) {
      assertPointIntegrity(point);

      assertTimestampInRange(
        point.recordedAt,
        "2026-08-01T00:00:00",
        "2026-09-01T00:00:00",
      );
    }

    assertDeterministicOrdering(monzaO3);
    assertNoDuplicateStationTimestamp(monzaO3);

    console.log(
      "✅ Test 7 Passed (Monza O3 integrity, range and ordering)",
    );
    passed++;

    // ======================================================
    // 8. Atlantide = empty array
    // ======================================================

    const atlantide =
      await AirQualityRepository.getStationTimeSeries(
        "PM10",
        "Atlantide",
        "2026-03-01T00:00:00",
        "2026-04-01T00:00:00",
      );

    if (atlantide.length !== 0) {
      throw new Error(
        `Test 8 Failed: expected [], got ${atlantide.length} rows`,
      );
    }

    console.log(
      "✅ Test 8 Passed (Atlantide -> empty timeseries)",
    );
    passed++;

    console.log(
      `\n🎉 ALL EXPLORE REPOSITORY TESTS PASSED (${passed}/${total})`,
    );
  } catch (error: unknown) {
    console.error(
      "\n❌ EXPLORE REPOSITORY TESTS FAILED:",
      error,
    );

    process.exitCode = 1;
  } finally {
    const { prisma } =
      await import("../src/lib/db/prisma");

    await prisma.$disconnect();
  }
}

main();