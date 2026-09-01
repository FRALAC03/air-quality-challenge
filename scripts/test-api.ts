import "dotenv/config";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";

function assertNumberClose(actual: number | null | undefined, expected: number, tolerance = 1e-9) {
  if (actual == null) throw new Error(`Expected ${expected}, got null/undefined`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

async function fetchJson(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response, got content-type: ${contentType}. Status: ${res.status}`);
  }

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log(`Starting API Tests against ${BASE_URL}...\n`);
  let passed = 0;
  const total = 8;

  try {
    // 1. Threshold PM10
    const t1 = await fetchJson("/api/air-quality/threshold?pollutant=PM10");
    if (t1.status !== 200 || t1.data.value !== 50 || t1.data.base !== "daily") {
      throw new Error(`Test 1 Failed: ${JSON.stringify(t1)}`);
    }
    console.log("✅ Test 1 Passed (Threshold PM10)");
    passed++;

    // 2. Average Monza Mar-Apr
    const t2 = await fetchJson("/api/air-quality/average?pollutant=PM10&municipality=Monza&start=2026-03-01T00:00:00&end=2026-05-01T00:00:00");
    if (t2.status !== 200) throw new Error(`Test 2 Failed HTTP status: ${t2.status}`);
    assertNumberClose(t2.data.value, 27.901639344262296);
    console.log("✅ Test 2 Passed (Average Monza Mar-Apr)");
    passed++;

    // 3. Milano PM10 municipality days
    const t3 = await fetchJson("/api/air-quality/exceedances?pollutant=PM10&municipality=Milano&metric=MUNICIPALITY_EXCEEDANCE_DAYS&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00");
    if (t3.status !== 200 || t3.data.value !== 11) throw new Error(`Test 3 Failed: ${JSON.stringify(t3)}`);
    console.log("✅ Test 3 Passed (Milano PM10 municipality days)");
    passed++;

    // 4. Monza PM10 compare
    const t4 = await fetchJson("/api/air-quality/compare?pollutant=PM10&municipality=Monza&p1Start=2026-03-01T00:00:00&p1End=2026-05-01T00:00:00&p2Start=2026-05-01T00:00:00&p2End=2026-07-01T00:00:00");
    if (t4.status !== 200 || t4.data.trend !== "IMPROVING") throw new Error(`Test 4 Failed: ${JSON.stringify(t4)}`);
    assertNumberClose(t4.data.period1Average, 27.901639344262296);
    assertNumberClose(t4.data.period2Average, 17.934426229508198);
    const expectedPercentageChange =
  ((17.934426229508198 - 27.901639344262296) /
    27.901639344262296) *
  100;

    assertNumberClose(
  t4.data.percentageChange,
  expectedPercentageChange,
);
    console.log("✅ Test 4 Passed (Monza PM10 compare all values)");
    passed++;

    // 5. PM25 exceedances NOT_ASSESSABLE
    const t5 = await fetchJson("/api/air-quality/exceedances?pollutant=PM25&municipality=Milano&metric=MUNICIPALITY_EXCEEDANCE_DAYS&start=2026-03-01T00:00:00&end=2026-04-01T00:00:00");
    if (t5.status !== 200 || t5.data.status !== "NOT_ASSESSABLE") throw new Error(`Test 5 Failed: ${JSON.stringify(t5)}`);
    console.log("✅ Test 5 Passed (PM25 exceedances NOT_ASSESSABLE)");
    passed++;

    // 6. Atlantide average NO_DATA
    const t6 = await fetchJson("/api/air-quality/average?pollutant=PM10&municipality=Atlantide&start=2026-03-01T00:00:00&end=2026-05-01T00:00:00");
    if (t6.status !== 200 || t6.data.status !== "NO_DATA") throw new Error(`Test 6 Failed: ${JSON.stringify(t6)}`);
    console.log("✅ Test 6 Passed (Atlantide NO_DATA)");
    passed++;

    // 7. Invalid pollutant (HTTP 400)
    const t7 = await fetchJson("/api/air-quality/threshold?pollutant=CARBONITE");
    if (t7.status !== 400) throw new Error(`Test 7 Failed: Expected 400, got ${t7.status}`);
    console.log("✅ Test 7 Passed (Invalid pollutant -> 400)");
    passed++;

    // 8. Monza PM10 July (Data exists, 0 exceedances)
    const t8 = await fetchJson("/api/air-quality/exceedances?pollutant=PM10&municipality=Monza&metric=MUNICIPALITY_EXCEEDANCE_DAYS&start=2026-07-01T00:00:00&end=2026-08-01T00:00:00");
    if (t8.status !== 200 || t8.data.status !== "OK" || t8.data.value !== 0) throw new Error(`Test 8 Failed: ${JSON.stringify(t8)}`);
    console.log("✅ Test 8 Passed (Monza PM10 July 0 exceedances -> OK)");
    passed++;

    console.log(`\n🎉 ALL API TESTS PASSED (${passed}/${total})`);
  } catch (err) {
    console.error(`\n❌ API TESTS FAILED:\n`, err);
    process.exitCode = 1;
  }
}

main();