import "dotenv/config";
import { AirQualityService } from "../src/lib/domain/air-quality.service";

async function main() {
  console.log("Starting Explore Domain Verification...\n");
  let passed = 0;
  const total = 7;

  try {
    // 1. Milano PM10 Marzo (Status OK, TS length 117, Exceedance Days 11)
    const res1 = await AirQualityService.getExploreData(
      "PM10", "Milano", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }
    );
    if (res1.status !== "OK" || res1.timeseries.length !== 117) {
      throw new Error(`Test 1 Failed: Expected OK and 117 TS rows, got ${res1.status} and ${res1.timeseries.length}`);
    }
    const exc1 = res1.exceedances;

if (
  !exc1 ||
  !("value" in exc1) ||
  exc1.status !== "OK" ||
  exc1.metric !== "MUNICIPALITY_EXCEEDANCE_DAYS" ||
  exc1.value !== 11
) {
  throw new Error(
    `Test 1 Failed: invalid exceedance result: ${JSON.stringify(exc1)}`,
  );
}
    console.log("✅ Test 1 Passed (Milano PM10: OK, TS=117, Days=11)");
    passed++;

    // 2. Milano PM10: Punti validi e formattati (Check superficiale di un punto)
    const p = res1.timeseries[0];
    if (typeof p.stationId !== "number" || typeof p.stationName !== "string" || !p.recordedAt || typeof p.value !== "number") {
       throw new Error(`Test 2 Failed: Bad shape ${JSON.stringify(p)}`);
    }
    if (p.recordedAt.includes("Z")) {
       throw new Error(`Test 2 Failed: TS point is not floating string. Got ${p.recordedAt}`);
    }
    console.log("✅ Test 2 Passed (Milano PM10 points structurally sound and floating)");
    passed++;

    // 3. Monza O3 Agosto (Status OK, TS length 1265, Exceedance Hours Monza = 18)
    const res3 = await AirQualityService.getExploreData(
      "O3", "Monza", { start: "2026-08-01T00:00:00", end: "2026-09-01T00:00:00" }
    );
    if (res3.status !== "OK" || res3.timeseries.length !== 1265) {
       throw new Error(`Test 3 Failed: TS length is ${res3.timeseries.length}`);
    }
    const exc3 = res3.exceedances;

if (
  !exc3 ||
  !("results" in exc3) ||
  exc3.status !== "OK" ||
  exc3.metric !== "MUNICIPALITY_EXCEEDANCE_HOURS"
) {
  throw new Error(
    `Test 3 Failed: invalid hourly result: ${JSON.stringify(exc3)}`,
  );
}

if (
  exc3.results.length !== 1 ||
  exc3.results[0]?.municipality !== "Monza" ||
  exc3.results[0]?.exceedanceHours !== 18
) {
  throw new Error(
    `Test 3 Failed: unexpected Monza O3 result: ${JSON.stringify(exc3.results)}`,
  );
}
    console.log("✅ Test 3 Passed (Monza O3: OK, TS=1265, Hours=18)");
    passed++;

    // 4. Atlantide PM10 (NO_DATA, [], null)
    const res4 = await AirQualityService.getExploreData(
      "PM10", "Atlantide", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }
    );
    if (res4.status !== "NO_DATA" || res4.timeseries.length !== 0 || res4.exceedances !== null) {
       throw new Error(`Test 4 Failed: Expected NO_DATA/empty/null, got ${JSON.stringify(res4)}`);
    }
    console.log("✅ Test 4 Passed (Atlantide PM10: NO_DATA, empty TS, null exceedance)");
    passed++;

    
    // 5. PM25 Milano Marzo:
    // Explore OK + timeseries reale + compliance NOT_ASSESSABLE
const res5 = await AirQualityService.getExploreData(
  "PM25",
  "Milano",
  {
    start: "2026-03-01T00:00:00",
    end: "2026-04-01T00:00:00",
  },
);

if (res5.status !== "OK") {
  throw new Error(
    `Test 5 Failed: expected Explore status OK, got ${res5.status}`,
  );
}

if (res5.timeseries.length !== 87) {
  throw new Error(
    `Test 5 Failed: expected 87 PM25 timeseries rows, got ${res5.timeseries.length}`,
  );
}

const pm25Stations = new Set(
  res5.timeseries.map((point) => point.stationId),
);

if (pm25Stations.size !== 3) {
  throw new Error(
    `Test 5 Failed: expected 3 PM25 stations, got ${pm25Stations.size}`,
  );
}

if (
  res5.timeseries[0]?.recordedAt !==
    "2026-03-01T00:00:00.000" ||
  res5.timeseries.at(-1)?.recordedAt !==
    "2026-03-31T00:00:00.000"
) {
  throw new Error(
    `Test 5 Failed: unexpected PM25 min/max timestamps. ` +
      `First=${res5.timeseries[0]?.recordedAt}, ` +
      `Last=${res5.timeseries.at(-1)?.recordedAt}`,
  );
}

const exc5 = res5.exceedances;

if (
  !exc5 ||
  !("value" in exc5) ||
  exc5.status !== "NOT_ASSESSABLE" ||
  exc5.complianceStatus !== "NOT_ASSESSABLE" ||
  exc5.value !== null
) {
  throw new Error(
    `Test 5 Failed: PM25 exceedance semantics invalid: ` +
      JSON.stringify(exc5),
  );
}

console.log(
  "✅ Test 5 Passed " +
    "(PM25 Milano: Explore OK, TS=87, stations=3, " +
    "exceedance NOT_ASSESSABLE)",
);
   passed++;
    

    // 6. Municipality vuota (INVALID_REQUEST)
    const res6 = await AirQualityService.getExploreData(
      "PM10", "   ", { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }
    );
    if (res6.status !== "INVALID_REQUEST" || res6.timeseries.length !== 0) throw new Error(`Test 6 Failed: ${JSON.stringify(res6)}`);
    console.log("✅ Test 6 Passed (Empty municipality -> INVALID_REQUEST)");
    passed++;

    // 7. Periodo invalido (INVALID_REQUEST)
    const res7 = await AirQualityService.getExploreData(
      "PM10", "Milano", { start: "NOPE", end: "2026-04-01T00:00:00" }
    );
    if (res7.status !== "INVALID_REQUEST" || res7.timeseries.length !== 0) throw new Error(`Test 7 Failed: ${JSON.stringify(res7)}`);
    console.log("✅ Test 7 Passed (Invalid Period -> INVALID_REQUEST)");
    passed++;

    console.log(`\n🎉 ALL EXPLORE DOMAIN TESTS PASSED (${passed}/${total})`);
  } catch (err) {
    console.error(`\n❌ EXPLORE DOMAIN TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();