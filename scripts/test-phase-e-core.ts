import "dotenv/config";

import {
  getDashboardPeriods,
  subtractFloatingDays,
} from "../src/lib/domain/date-utils";

import { AirQualityRepository } from "../src/lib/repositories/air-quality.repository";
import { AirQualityService } from "../src/lib/domain/air-quality.service";

function assertNumberClose(
  actual: number | null,
  expected: number,
  tolerance = 1e-9,
): void {
  if (actual === null) {
    throw new Error(`Expected ${expected}, got null`);
  }

  const difference = Math.abs(actual - expected);

  if (difference > tolerance) {
    throw new Error(
      `Expected ${expected}, got ${actual} (diff: ${difference})`,
    );
  }
}

async function main(): Promise<void> {
  console.log("Starting Phase E Core Verification...\n");

  let passed = 0;
  const total = 13;

  try {
    // =========================================================
    // 1. Calendar - normal year
    // =========================================================

    const cal1 = subtractFloatingDays(
      "2026-03-01T00:00:00",
      1,
    );

    if (cal1 !== "2026-02-28T00:00:00") {
      throw new Error(
        `Test 1 Failed: expected 2026-02-28T00:00:00, got ${cal1}`,
      );
    }

    console.log(
      "✅ Test 1 Passed (2026-03-01 - 1 day = 2026-02-28)",
    );
    passed++;

    // =========================================================
    // 2. Calendar - leap year
    // =========================================================

    const cal2 = subtractFloatingDays(
      "2024-03-01T00:00:00",
      1,
    );

    if (cal2 !== "2024-02-29T00:00:00") {
      throw new Error(
        `Test 2 Failed: expected 2024-02-29T00:00:00, got ${cal2}`,
      );
    }

    console.log(
      "✅ Test 2 Passed (2024-03-01 - 1 day = 2024-02-29)",
    );
    passed++;

    // =========================================================
    // 3. Calendar - year boundary
    // =========================================================

    const cal3 = subtractFloatingDays(
      "2026-01-01T00:00:00",
      1,
    );

    if (cal3 !== "2025-12-31T00:00:00") {
      throw new Error(
        `Test 3 Failed: expected 2025-12-31T00:00:00, got ${cal3}`,
      );
    }

    console.log(
      "✅ Test 3 Passed (2026-01-01 - 1 day = 2025-12-31)",
    );
    passed++;

    // =========================================================
    // 4. Dashboard periods
    // =========================================================

    const periods = getDashboardPeriods(
      "2026-08-27T08:00:00.000",
    );

    if (
      periods.currentPeriod.start !==
        "2026-08-20T00:00:00" ||
      periods.currentPeriod.end !==
        "2026-08-27T00:00:00" ||
      periods.previousPeriod.start !==
        "2026-08-13T00:00:00" ||
      periods.previousPeriod.end !==
        "2026-08-20T00:00:00"
    ) {
      throw new Error(
        `Test 4 Failed: ${JSON.stringify(periods)}`,
      );
    }

    console.log(
      "✅ Test 4 Passed (Dashboard periods alignment)",
    );
    passed++;

    // =========================================================
    // 5. PM10 CURRENT
    // =========================================================

    const pm10Current =
      await AirQualityRepository.getAreaPeriodAverage(
        "PM10",
        "2026-08-20T00:00:00",
        "2026-08-27T00:00:00",
      );

    assertNumberClose(
      pm10Current,
      14.393506493506495,
    );

    console.log(
      "✅ Test 5 Passed (PM10 CURRENT area average)",
    );
    passed++;

    // =========================================================
    // 6. PM10 PREVIOUS
    // =========================================================

    const pm10Previous =
      await AirQualityRepository.getAreaPeriodAverage(
        "PM10",
        "2026-08-13T00:00:00",
        "2026-08-20T00:00:00",
      );

    assertNumberClose(
      pm10Previous,
      23.14285714285714,
    );

    console.log(
      "✅ Test 6 Passed (PM10 PREVIOUS area average)",
    );
    passed++;

    // =========================================================
    // 7. PM25 CURRENT
    // =========================================================

    const pm25Current =
      await AirQualityRepository.getAreaPeriodAverage(
        "PM25",
        "2026-08-20T00:00:00",
        "2026-08-27T00:00:00",
      );

    assertNumberClose(
      pm25Current,
      7.717687074829931,
    );

    console.log(
      "✅ Test 7 Passed (PM25 CURRENT area average)",
    );
    passed++;

    // =========================================================
    // 8. PM25 PREVIOUS
    // =========================================================

    const pm25Previous =
      await AirQualityRepository.getAreaPeriodAverage(
        "PM25",
        "2026-08-13T00:00:00",
        "2026-08-20T00:00:00",
      );

    assertNumberClose(
      pm25Previous,
      13.36734693877551,
    );

    console.log(
      "✅ Test 8 Passed (PM25 PREVIOUS area average)",
    );
    passed++;

    // =========================================================
    // 9. NO2 CURRENT
    // =========================================================

    const no2Current =
      await AirQualityRepository.getAreaPeriodAverage(
        "NO2",
        "2026-08-20T00:00:00",
        "2026-08-27T00:00:00",
      );

    assertNumberClose(
      no2Current,
      14.808222982522182,
    );

    console.log(
      "✅ Test 9 Passed (NO2 CURRENT area average)",
    );
    passed++;

    // =========================================================
    // 10. NO2 PREVIOUS
    // =========================================================

    const no2Previous =
      await AirQualityRepository.getAreaPeriodAverage(
        "NO2",
        "2026-08-13T00:00:00",
        "2026-08-20T00:00:00",
      );

    assertNumberClose(
      no2Previous,
      14.423380566801617,
    );

    console.log(
      "✅ Test 10 Passed (NO2 PREVIOUS area average)",
    );
    passed++;

    // =========================================================
    // 11. O3 CURRENT
    // =========================================================

    const o3Current =
      await AirQualityRepository.getAreaPeriodAverage(
        "O3",
        "2026-08-20T00:00:00",
        "2026-08-27T00:00:00",
      );

    assertNumberClose(
      o3Current,
      74.79895833333332,
    );

    console.log(
      "✅ Test 11 Passed (O3 CURRENT area average)",
    );
    passed++;

    // =========================================================
    // 12. O3 PREVIOUS
    // =========================================================

    const o3Previous =
      await AirQualityRepository.getAreaPeriodAverage(
        "O3",
        "2026-08-13T00:00:00",
        "2026-08-20T00:00:00",
      );

    assertNumberClose(
      o3Previous,
      109.32718269372967,
    );

    console.log(
      "✅ Test 12 Passed (O3 PREVIOUS area average)",
    );
    passed++;

    // =========================================================
    // 13. Domain Service PM25 area semantics
    // =========================================================

    const pm25ServiceResult =
      await AirQualityService.getAreaPeriodAverage(
        "PM25",
        {
          start: "2026-08-20T00:00:00",
          end: "2026-08-27T00:00:00",
        },
      );

    if (
      pm25ServiceResult.status !== "OK" ||
      pm25ServiceResult.scope !== "AREA" ||
      pm25ServiceResult.complianceStatus !==
        "NOT_ASSESSABLE"
    ) {
      throw new Error(
        `Test 13 Failed: ${JSON.stringify(
          pm25ServiceResult,
        )}`,
      );
    }

    assertNumberClose(
      pm25ServiceResult.value,
      7.717687074829931,
    );

    console.log(
      "✅ Test 13 Passed (PM25 area average descriptive + NOT_ASSESSABLE)",
    );
    passed++;

    console.log(
      `\n🎉 ALL PHASE E CORE TESTS PASSED (${passed}/${total})`,
    );
  } catch (error: unknown) {
    console.error(
      "\n❌ PHASE E CORE TESTS FAILED:",
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