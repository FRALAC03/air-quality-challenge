import "dotenv/config";
import { AirQualityService } from "../src/lib/domain/air-quality.service";
import type { ExceedanceResult, HourlyExceedanceResult } from "../src/lib/domain/air-quality.types";

function assertNumberClose(actual: number | null, expected: number, tolerance = 1e-9) {
  if (actual === null) throw new Error(`Expected ${expected}, got null`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

async function main() {
  console.log("Starting Domain Service Verification...\n");
  let passed = 0;
  const total = 7;

  try {
    // 1. PM10 Milano Marzo - municipality days = 11, status = OK
    const res1 = await AirQualityService.getExceedances(
      "PM10", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, "MUNICIPALITY_EXCEEDANCE_DAYS", "Milano"
    ) as ExceedanceResult;
    if (res1.status !== "OK" || res1.value !== 11) throw new Error(`Test 1 Failed: ${JSON.stringify(res1)}`);
    console.log("✅ Test 1 Passed (PM10 Milano municipality days = 11, status = OK)");
    passed++;

    // 2. PM10 Milano Marzo - station events = 29
    const res2 = await AirQualityService.getExceedances(
      "PM10", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, "STATION_EXCEEDANCE_EVENTS", "Milano"
    ) as ExceedanceResult;
    if (res2.status !== "OK" || res2.value !== 29) throw new Error(`Test 2 Failed: ${JSON.stringify(res2)}`);
    console.log("✅ Test 2 Passed (PM10 Milano station events = 29)");
    passed++;

    // 3. O3 agosto - Monza 18, Pioltello 9, Cormano 3, Arconate 2
    const res3 = await AirQualityService.getExceedances(
      "O3", { start: "2026-08-01T00:00:00", end: "2026-09-01T00:00:00" }, "MUNICIPALITY_EXCEEDANCE_HOURS"
    ) as HourlyExceedanceResult;
    
    if (res3.status !== "OK") throw new Error(`Test 3 Failed: status is ${res3.status}`);
    const expectedO3 = { "Monza": 18, "Pioltello": 9, "Cormano": 3, "Arconate": 2 };
    if (res3.results.length !== 4) throw new Error(`Test 3 Failed: expected exactly 4 cities`);
    for (const r of res3.results) {
      if (expectedO3[r.municipality as keyof typeof expectedO3] !== r.exceedanceHours) {
         throw new Error(`Test 3 Failed: Mismatch for ${r.municipality}`);
      }
    }
    console.log("✅ Test 3 Passed (O3 Agosto Municipality Hours)");
    passed++;

    // 4. Monza PM10 compare: trend = IMPROVING
    const res4 = await AirQualityService.comparePeriods(
      "PM10",
      { start: "2026-03-01T00:00:00", end: "2026-05-01T00:00:00" },
      { start: "2026-05-01T00:00:00", end: "2026-07-01T00:00:00" },
      "Monza" // Ora obbligatorio
    );
    if (res4.status !== "OK" || res4.trend !== "IMPROVING") throw new Error(`Test 4 Failed: ${JSON.stringify(res4)}`);
    assertNumberClose(res4.period1Average, 27.901639344262296);
    assertNumberClose(res4.period2Average, 17.934426229508198);
    const expectedPercentageChange =
  ((17.934426229508198 - 27.901639344262296) /
    27.901639344262296) *
  100;

assertNumberClose(
  res4.percentageChange,
  expectedPercentageChange,
);
    console.log("✅ Test 4 Passed (Monza PM10 compare IMPROVING)");
    passed++;

    // 5. PM25 compliance annuale: NOT_ASSESSABLE
    const res5 = await AirQualityService.getExceedances(
      "PM25", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, "MUNICIPALITY_EXCEEDANCE_DAYS", "Milano"
    ) as ExceedanceResult;
    if (res5.status !== "NOT_ASSESSABLE" || res5.complianceStatus !== "NOT_ASSESSABLE") {
       throw new Error(`Test 5 Failed: ${JSON.stringify(res5)}`);
    }
    console.log("✅ Test 5 Passed (PM25 exceedances strictly NOT_ASSESSABLE)");
    passed++;

    // 6. Period average comune inesistente: NO_DATA
    const res6 = await AirQualityService.getPeriodAverage(
      "PM10", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, "Atlantide" // Ora obbligatorio
    );
    if (res6.status !== "NO_DATA") throw new Error(`Test 6 Failed: Expected NO_DATA, got ${res6.status}`);
    console.log("✅ Test 6 Passed (Comune inesistente = NO_DATA)");
    passed++;

    // 7. Periodo reale con dati ma nessun superamento: OK, value = 0
    // Testiamo Monza a Luglio per PM10 per verificare la corretta distinzione NO_DATA / 0
    const res7 = await AirQualityService.getExceedances(
      "PM10", { start: "2026-07-01T00:00:00", end: "2026-08-01T00:00:00" }, "MUNICIPALITY_EXCEEDANCE_DAYS", "Monza"
    ) as ExceedanceResult;
    if (res7.status !== "OK" || res7.value !== 0) throw new Error(`Test 7 Failed: Expected OK and 0 exceedances, got ${JSON.stringify(res7)}`);
    console.log("✅ Test 7 Passed (Dati esistenti ma 0 superamenti = OK, value 0)");
    passed++;

    console.log(`\n🎉 ALL DOMAIN TESTS PASSED (${passed}/${total})`);
  } catch (err) {
    console.error(`\n❌ DOMAIN TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();