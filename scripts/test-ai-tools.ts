import "dotenv/config";
import { executeAirQualityTool, parseAirQualityToolCall } from "../src/lib/ai/tool-executor";

function assertNumberClose(actual: number | null | undefined, expected: number, tolerance = 1e-9) {
  if (actual == null) throw new Error(`Expected ${expected}, got null/undefined`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

async function main() {
  console.log("Starting AI Tools Determinist Verification...\n");
  let passed = 0;
  const total = 11;

  try {
    // 1. get_threshold PM10
    const res1 = await executeAirQualityTool({ name: "get_threshold", arguments: { pollutant: "PM10" } });
    if (
  res1.executionStatus !== "SUCCESS" ||
  !("base" in res1.data)
) {
  throw new Error(
    `Test 1 Failed: ${JSON.stringify(res1)}`,
  );
}

if (
  res1.data.status !== "OK" ||
  res1.data.pollutant !== "PM10" ||
  res1.data.value !== 50 ||
  res1.data.base !== "daily"
) {
  throw new Error(
    `Test 1 Failed: ${JSON.stringify(res1)}`,
  );
}
    console.log("✅ Test 1 Passed (get_threshold PM10 -> SUCCESS, OK, 50, daily)");
    passed++;

    // 2. get_period_average Monza PM10 Mar-Apr
    const res2 = await executeAirQualityTool({ name: "get_period_average", arguments: { pollutant: "PM10", municipality: "Monza", period: { start: "2026-03-01T00:00:00", end: "2026-05-01T00:00:00" } } });
    if (res2.executionStatus !== "SUCCESS" || !("value" in res2.data)) throw new Error(`Test 2 Failed`);
    if (res2.data.status !== "OK") throw new Error(`Test 2 Failed`);
    assertNumberClose(res2.data.value, 27.901639344262296);
    console.log("✅ Test 2 Passed (get_period_average Monza PM10 -> 27.901...)");
    passed++;

    // 3. compare_periods Monza PM10
    const res3 = await executeAirQualityTool({
      name: "compare_periods",
      arguments: {
        pollutant: "PM10", municipality: "Monza",
        period1: { start: "2026-03-01T00:00:00", end: "2026-05-01T00:00:00" },
        period2: { start: "2026-05-01T00:00:00", end: "2026-07-01T00:00:00" }
      }
    });
    if (res3.executionStatus !== "SUCCESS" || !("trend" in res3.data)) throw new Error(`Test 3 Failed`);
    if (res3.data.status !== "OK" || res3.data.trend !== "IMPROVING") throw new Error(`Test 3 Failed`);
    assertNumberClose(res3.data.period1Average, 27.901639344262296);
    assertNumberClose(res3.data.period2Average, 17.934426229508198);
    console.log("✅ Test 3 Passed (compare_periods Monza PM10 -> IMPROVING)");
    passed++;

    // 4. get_exceedances PM10 Milano Marzo
    const res4 = await executeAirQualityTool({
      name: "get_exceedances",
      arguments: { pollutant: "PM10", municipality: "Milano", period: { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, metric: "MUNICIPALITY_EXCEEDANCE_DAYS" }
    });
    if (res4.executionStatus !== "SUCCESS" || !("value" in res4.data)) throw new Error(`Test 4 Failed`);
    if (res4.data.status !== "OK" || res4.data.value !== 11) throw new Error(`Test 4 Failed`);
    console.log("✅ Test 4 Passed (get_exceedances PM10 Milano -> 11 days)");
    passed++;

    // 5. get_exceedances O3 Monza Agosto
    const res5 = await executeAirQualityTool({
      name: "get_exceedances",
      arguments: { pollutant: "O3", municipality: "Monza", period: { start: "2026-08-01T00:00:00", end: "2026-09-01T00:00:00" }, metric: "MUNICIPALITY_EXCEEDANCE_HOURS" }
    });
    if (res5.executionStatus !== "SUCCESS" || !("results" in res5.data)) throw new Error(`Test 5 Failed`);
    if (res5.data.status !== "OK") throw new Error(`Test 5 Failed`);
    const monzaHours = res5.data.results.find(r => r.municipality === "Monza")?.exceedanceHours;
    if (monzaHours !== 18) throw new Error(`Test 5 Failed: Expected 18, got ${monzaHours}`);
    console.log("✅ Test 5 Passed (get_exceedances O3 Monza -> 18 hours)");
    passed++;

    // 6. PM25 compliance NOT_ASSESSABLE (Tool success)
    const res6 = await executeAirQualityTool({
      name: "get_exceedances",
      arguments: { pollutant: "PM25", municipality: "Milano", period: { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, metric: "MUNICIPALITY_EXCEEDANCE_DAYS" }
    });
    if (res6.executionStatus !== "SUCCESS" || !("complianceStatus" in res6.data)) throw new Error(`Test 6 Failed`);
    if (res6.data.status !== "NOT_ASSESSABLE" || res6.data.complianceStatus !== "NOT_ASSESSABLE") throw new Error(`Test 6 Failed`);
    console.log("✅ Test 6 Passed (PM25 compliance -> Tool SUCCESS, Domain NOT_ASSESSABLE)");
    passed++;

    // 7. explore_data PM10 Milano Marzo
    const res7 = await executeAirQualityTool({
      name: "explore_data",
      arguments: { pollutant: "PM10", municipality: "Milano", period: { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" } }
    });
    if (res7.executionStatus !== "SUCCESS" || !("timeseries" in res7.data)) throw new Error(`Test 7 Failed`);
    if (res7.data.status !== "OK" || res7.data.timeseries.length !== 117) throw new Error(`Test 7 Failed`);
    const stationsCount = new Set(res7.data.timeseries.map(p => p.stationId)).size;
    if (stationsCount !== 4) throw new Error(`Test 7 Failed: Expected 4 stations, got ${stationsCount}`);
    console.log("✅ Test 7 Passed (explore_data PM10 Milano -> TS length 117, 4 stations)");
    passed++;

    // 8. list_municipalities
    const res8 = await executeAirQualityTool({ name: "list_municipalities", arguments: {} });
    if (res8.executionStatus !== "SUCCESS" || !("municipalities" in res8.data)) throw new Error(`Test 8 Failed`);
    if (res8.data.status !== "OK" || !res8.data.municipalities?.includes("Milano")) throw new Error(`Test 8 Failed`);
    console.log("✅ Test 8 Passed (list_municipalities -> contains Milano)");
    passed++;

    // 9. parser invalid tool
const res9 = parseAirQualityToolCall({
  name: "delete_database",
  arguments: {},
});

if (!("executionStatus" in res9)) {
  throw new Error(
    "Test 9 Failed: Expected ToolExecutionFailure",
  );
}

if (
  res9.executionStatus !== "FAILURE" ||
  res9.error.code !== "INVALID_TOOL"
) {
  throw new Error(
    `Test 9 Failed: ${JSON.stringify(res9)}`,
  );
}

console.log(
  "✅ Test 9 Passed (parser unknown tool -> INVALID_TOOL)",
);
passed++;

    // 10. parser invalid pollutant
const res10 = parseAirQualityToolCall({
  name: "get_threshold",
  arguments: {
    pollutant: "CARBONITE",
  },
});

if (!("executionStatus" in res10)) {
  throw new Error(
    "Test 10 Failed: Expected ToolExecutionFailure",
  );
}

if (
  res10.executionStatus !== "FAILURE" ||
  res10.error.code !== "INVALID_ARGUMENTS"
) {
  throw new Error(
    `Test 10 Failed: ${JSON.stringify(res10)}`,
  );
}

console.log(
  "✅ Test 10 Passed (parser invalid pollutant -> INVALID_ARGUMENTS)",
);
passed++;

    // 11. Extra: parser accetta shape, Domain rifiuta date invalide
    const rawCall = { name: "get_period_average", arguments: { pollutant: "PM10", municipality: "Monza", period: { start: "NOPE", end: "2026-04-01T00:00:00" } } };
    const parsedCall = parseAirQualityToolCall(rawCall);
    
    if ("executionStatus" in parsedCall) throw new Error(`Test 11 Boundary Failed: Expected AirQualityToolCall, got ToolExecutionFailure`);
    
    const res11 = await executeAirQualityTool(parsedCall);
    if (res11.executionStatus !== "SUCCESS" || res11.data.status !== "INVALID_REQUEST") {
      throw new Error(`Test 11 Domain Validation Failed: ${JSON.stringify(res11)}`);
    }
    console.log("✅ Test 11 Passed (Boundary passed shape, Domain caught INVALID_REQUEST)");
    passed++;

    console.log(`\n🎉 ALL AI TOOL TESTS PASSED (${passed}/${total})`);
  } catch (err) {
    console.error(`\n❌ AI TOOL TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();