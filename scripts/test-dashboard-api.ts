import "dotenv/config";
import type { DashboardSummaryResult, DashboardKpiResult, PollutantCode } from "../src/lib/domain/air-quality.types";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";

function assertNumberClose(actual: number | null | undefined, expected: number, tolerance = 1e-9) {
  if (actual == null) throw new Error(`Expected ${expected}, got null/undefined`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
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

function getKpi(data: DashboardSummaryResult, pollutant: PollutantCode): DashboardKpiResult {
  const kpi = data.kpis.find(k => k.pollutant === pollutant);
  if (!kpi) throw new Error(`KPI for ${pollutant} not found`);
  return kpi;
}

async function main() {
  console.log(`Starting Dashboard API Tests against ${BASE_URL}...\n`);
  let passed = 0;
  const total = 10;

  try {
    const { status, data } = await fetchJson<DashboardSummaryResult>("/api/dashboard/summary");

    // 1. HTTP 200 / status OK
    if (status !== 200 || data.status !== "OK") {
      throw new Error(`Test 1 Failed: HTTP ${status}, data.status: ${data.status}`);
    }
    console.log("✅ Test 1 Passed (HTTP 200, status OK)");
    passed++;

    // 2. maxDate esatto floating timestamp
    if (data.maxDate !== "2026-08-27T08:00:00.000") {
      throw new Error(`Test 2 Failed: maxDate ${String(data.maxDate)}`);
    }
    console.log("✅ Test 2 Passed (maxDate is 2026-08-27T08:00:00.000)");
    passed++;

    // 3. currentPeriod esatto
    if (data.currentPeriod?.start !== "2026-08-20T00:00:00" || data.currentPeriod?.end !== "2026-08-27T00:00:00") {
       throw new Error(`Test 3 Failed: currentPeriod ${JSON.stringify(data.currentPeriod)}`);
    }
    console.log("✅ Test 3 Passed (currentPeriod is exact 7 floating days)");
    passed++;

    // 4. previousPeriod esatto
    if (data.previousPeriod?.start !== "2026-08-13T00:00:00" || data.previousPeriod?.end !== "2026-08-20T00:00:00") {
       throw new Error(`Test 4 Failed: previousPeriod ${JSON.stringify(data.previousPeriod)}`);
    }
    console.log("✅ Test 4 Passed (previousPeriod is exact previous 7 floating days)");
    passed++;

    // 5. Esattamente 4 KPI
    if (!Array.isArray(data.kpis) || data.kpis.length !== 4) {
       throw new Error(`Test 5 Failed: Expected 4 KPIs, found ${data.kpis?.length}`);
    }
    const pollutants = data.kpis.map(k => k.pollutant).sort();
    if (JSON.stringify(pollutants) !== JSON.stringify(["NO2", "O3", "PM10", "PM25"])) {
       throw new Error(`Test 5 Failed: Wrong pollutants set: ${pollutants}`);
    }
    console.log("✅ Test 5 Passed (Exactly 4 valid pollutants returned)");
    passed++;

    const pm10 = getKpi(data, "PM10");
    const pm25 = getKpi(data, "PM25");
    const no2 = getKpi(data, "NO2");
    const o3 = getKpi(data, "O3");

    // 6. PM10 Baseline
    assertNumberClose(pm10.currentAverage, 14.393506493506495);
    assertNumberClose(pm10.previousAverage, 23.14285714285714);
    if (pm10.trend !== "IMPROVING") throw new Error(`Test 6 Failed: PM10 trend ${String(pm10.trend)}`);
    console.log("✅ Test 6 Passed (PM10 baselines and IMPROVING trend)");
    passed++;

    // 7. PM25 Baseline, NOT_ASSESSABLE, and Note presence
    assertNumberClose(pm25.currentAverage, 7.717687074829931);
    assertNumberClose(pm25.previousAverage, 13.36734693877551);
    if (pm25.trend !== "IMPROVING" || pm25.complianceStatus !== "NOT_ASSESSABLE" || !pm25.note) {
      throw new Error(`Test 7 Failed: PM25 complianceStatus, trend, or note missing. note: ${String(pm25.note)}`);
    }
    console.log("✅ Test 7 Passed (PM25 baselines, IMPROVING, NOT_ASSESSABLE, and note present)");
    passed++;

    // 8. NO2 Baseline & STABLE
    assertNumberClose(no2.currentAverage, 14.808222982522182);
    assertNumberClose(no2.previousAverage, 14.423380566801617);
    if (no2.trend !== "STABLE") throw new Error(`Test 8 Failed: NO2 trend ${String(no2.trend)}`);
    console.log("✅ Test 8 Passed (NO2 baselines and STABLE trend)");
    passed++;

    // 9. O3 Baseline & IMPROVING
    assertNumberClose(o3.currentAverage, 74.79895833333332);
    assertNumberClose(o3.previousAverage, 109.32718269372967);
    if (o3.trend !== "IMPROVING") throw new Error(`Test 9 Failed: O3 trend ${String(o3.trend)}`);
    console.log("✅ Test 9 Passed (O3 baselines and IMPROVING trend)");
    passed++;

    // 10. Controllo Matematico Percentage Change su O3
    const expectedO3Abs = 74.79895833333332 - 109.32718269372967;
    const expectedO3Pct = (expectedO3Abs / 109.32718269372967) * 100;
    assertNumberClose(o3.percentageChange, expectedO3Pct, 1e-9);
    console.log(`✅ Test 10 Passed (O3 percentage change math strictly correct: ${String(o3.percentageChange)}%)`);
    passed++;

    console.log(`\n🎉 ALL DASHBOARD API TESTS PASSED (${passed}/${total})`);

  } catch (err) {
    console.error(`\n❌ DASHBOARD API TESTS FAILED:\n`, err);
    process.exitCode = 1;
  }
}

main();