import "dotenv/config";
import type { 
  ExploreDataResult, 
  StationTimeSeriesPoint, 
} from "../src/lib/domain/air-quality.types";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";

interface HttpErrorResult {
  status: "INVALID_REQUEST" | "ERROR";
  error?: string;
  message?: string;
}

async function fetchJson<T>(endpoint: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response, got content-type: ${contentType}. Status: ${res.status}`);
  }

  const data = (await res.json()) as T;
  return { status: res.status, data };
}

function countDistinctStations(timeseries: StationTimeSeriesPoint[]): number {
  return new Set(timeseries.map(p => p.stationId)).size;
}

function getMinMaxTimestamps(timeseries: StationTimeSeriesPoint[]): { min: string; max: string } {
  if (timeseries.length === 0) return { min: "", max: "" };
  let min = timeseries[0].recordedAt;
  let max = timeseries[0].recordedAt;
  for (const p of timeseries) {
    if (p.recordedAt < min) min = p.recordedAt;
    if (p.recordedAt > max) max = p.recordedAt;
  }
  return { min, max };
}

async function main() {
  console.log(`Starting Explore API Tests against ${BASE_URL}...\n`);
  let passed = 0;
  const total = 9;

  try {
    // 1. Milano PM10 Marzo (Status OK, 117 rows, 11 exceedance days)
    const t1 = await fetchJson<ExploreDataResult>(
      "/api/data/explore?pollutant=PM10&municipality=Milano&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00"
    );
    if (t1.status !== 200 || t1.data.status !== "OK") {
      throw new Error(`Test 1 Failed: Expected 200/OK, got ${t1.status}/${t1.data.status}`);
    }
    if (t1.data.timeseries.length !== 117) {
      throw new Error(`Test 1 Failed: Expected 117 TS rows, got ${t1.data.timeseries.length}`);
    }
    const exc1 = t1.data.exceedances;
    if (
      !exc1 || 
      !("value" in exc1) || // Narrowing a ExceedanceResult
      exc1.status !== "OK" ||
      exc1.metric !== "MUNICIPALITY_EXCEEDANCE_DAYS" || 
      exc1.value !== 11
    ) {
      throw new Error(`Test 1 Failed: Invalid exceedances: ${JSON.stringify(exc1)}`);
    }
    console.log("✅ Test 1 Passed (Milano PM10 Marzo: 117 TS, 11 Exceedance Days)");
    passed++;

    // 2. Milano PM10: Verifica 4 stazioni e Min/Max Timestamp
    const distinctStations = countDistinctStations(t1.data.timeseries);
    const { min, max } = getMinMaxTimestamps(t1.data.timeseries);
    if (distinctStations !== 4) throw new Error(`Test 2 Failed: Expected 4 stations, got ${distinctStations}`);
    if (min !== "2026-03-01T00:00:00.000" || max !== "2026-03-31T00:00:00.000") {
      throw new Error(`Test 2 Failed: Min/Max mismatch. Got min: ${min}, max: ${max}`);
    }
    console.log("✅ Test 2 Passed (Milano PM10: 4 Stations, Correct Floating Bounds)");
    passed++;

    // 3. Monza O3 Agosto (1265 rows, 2 stations, Monza Exceedance Hours = 18)
    const t3 = await fetchJson<ExploreDataResult>(
      "/api/data/explore?pollutant=O3&municipality=Monza&start=2026-08-01T00:00:00&end=2026-09-01T00:00:00"
    );
    if (t3.status !== 200 || t3.data.status !== "OK") throw new Error(`Test 3 Failed: status ${t3.status}/${t3.data.status}`);
    if (t3.data.timeseries.length !== 1265) throw new Error(`Test 3 Failed: TS length ${t3.data.timeseries.length}`);
    if (countDistinctStations(t3.data.timeseries) !== 2) throw new Error("Test 3 Failed: Expected 2 stations");
    
    const exc3 = t3.data.exceedances;
    if (!exc3 || !("results" in exc3) ||  exc3.status !== "OK" || exc3.metric !== "MUNICIPALITY_EXCEEDANCE_HOURS") {
      throw new Error(`Test 3 Failed: Invalid O3 exceedances format: ${JSON.stringify(exc3)}`);
    }
    if (
  exc3.results.length !== 1 ||
  exc3.results[0]?.municipality !== "Monza" ||
  exc3.results[0]?.exceedanceHours !== 18
) {
  throw new Error(
    `Test 3 Failed: unexpected results ${JSON.stringify(exc3.results)}`,
  );
}
    
    // Essendo Monza specificata come filter query, il repository ha già filtrato i results restituendo solo Monza
    const monzaExc = exc3.results.find(r => r.municipality === "Monza");
    if (monzaExc?.exceedanceHours !== 18) throw new Error(`Test 3 Failed: Monza O3 Hours expected 18, got ${monzaExc?.exceedanceHours}`);
    console.log("✅ Test 3 Passed (Monza O3 Agosto: 1265 TS, 2 Stations, 18 Exc. Hours)");
    passed++;

    // 4. PM25 Milano Marzo (Status OK, 87 rows, 3 stations, Exceedances NOT_ASSESSABLE)
    const t4 = await fetchJson<ExploreDataResult>(
      "/api/data/explore?pollutant=PM25&municipality=Milano&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00"
    );
    if (t4.status !== 200 || t4.data.status !== "OK") throw new Error("Test 4 Failed: Expected 200/OK");
    if (t4.data.timeseries.length !== 87 || countDistinctStations(t4.data.timeseries) !== 3) {
      throw new Error("Test 4 Failed: Expected 87 TS rows across 3 stations");
    }
    const exc4 = t4.data.exceedances;
    if (
      !exc4 || 
      !("value" in exc4) ||
      exc4.status !== "NOT_ASSESSABLE" || 
      exc4.complianceStatus !== "NOT_ASSESSABLE" ||
      exc4.value !== null
    ) {
      throw new Error(`Test 4 Failed: PM25 exceedance should be NOT_ASSESSABLE. Got ${JSON.stringify(exc4)}`);
    }
    console.log("✅ Test 4 Passed (PM25 Milano: 87 TS, Explore OK, Exceedance NOT_ASSESSABLE)");
    passed++;

    // 5. Atlantide PM10 (NO_DATA, TS [], Exceedances null)
    const t5 = await fetchJson<ExploreDataResult>(
      "/api/data/explore?pollutant=PM10&municipality=Atlantide&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00"
    );
    if (t5.status !== 200 || t5.data.status !== "NO_DATA") throw new Error("Test 5 Failed: Expected NO_DATA");
    if (t5.data.timeseries.length !== 0 || t5.data.exceedances !== null) throw new Error("Test 5 Failed: Expected empty TS and null exceedance");
    console.log("✅ Test 5 Passed (Atlantide NO_DATA handled correctly)");
    passed++;

    // 6. Pollutant invalido -> HTTP 400
    const t6 = await fetchJson<HttpErrorResult>(
  "/api/data/explore?pollutant=CARBONITE&municipality=Milano&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00",
);

if (
  t6.status !== 400 ||
  t6.data.status !== "INVALID_REQUEST"
) {
  throw new Error(
    `Test 6 Failed: Expected 400/INVALID_REQUEST, got ` +
      `${t6.status}/${t6.data.status}`,
  );
}
    console.log("✅ Test 6 Passed (Invalid Pollutant -> 400)");
    passed++;

    // 7. Municipality mancante -> HTTP 400
    const t7 = await fetchJson<HttpErrorResult>(
  "/api/data/explore?pollutant=PM10&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00",
);

if (
  t7.status !== 400 ||
  t7.data.status !== "INVALID_REQUEST"
) {
  throw new Error(
    `Test 7 Failed: Expected 400/INVALID_REQUEST, got ` +
      `${t7.status}/${t7.data.status}`,
  );
}
    console.log("✅ Test 7 Passed (Missing Municipality -> 400)");
    passed++;

    // 8. Periodo semanticamente invalido (start >= end) -> HTTP 400 (Dal Domain Service)
    const t8 = await fetchJson<ExploreDataResult>(
  "/api/data/explore?pollutant=PM10&municipality=Milano&start=2026-04-01T00:00:00&end=2026-03-01T00:00:00",
);
    if (
  t8.status !== 400 ||
  t8.data.status !== "INVALID_REQUEST" ||
  t8.data.timeseries.length !== 0 ||
  t8.data.exceedances !== null
) {
  throw new Error(
   `Test 8 Failed: expected 400 / INVALID_REQUEST / [] / null, got ` +
      JSON.stringify(t8),
  );
}
    console.log("✅ Test 8 Passed (Reversed timestamps -> 400 / INVALID_REQUEST)");
    passed++;

    // 9. Timestamp contenente Z -> HTTP 400 (Rifiutato dall'API Parser)
    const t9 = await fetchJson<HttpErrorResult>(
  "/api/data/explore?pollutant=PM10&municipality=Milano&start=2026-03-01T00:00:00Z&end=2026-04-01T00:00:00Z",
);

if (
  t9.status !== 400 ||
  t9.data.status !== "INVALID_REQUEST"
) {
  throw new Error(
    `Test 9 Failed: Expected 400/INVALID_REQUEST, got ` +
      `${t9.status}/${t9.data.status}`,
  );
}
    console.log("✅ Test 9 Passed ('Z' Timezone indicator rejected -> 400)");
    passed++;

    console.log(`\n🎉 ALL EXPLORE API TESTS PASSED (${passed}/${total})`);

  } catch (err) {
    console.error(`\n❌ EXPLORE API TESTS FAILED:\n`, err);
    process.exitCode = 1;
  }
}

main();