import "dotenv/config";

import { prisma } from "../src/lib/db/prisma";
import { AirQualityRepository } from "../src/lib/repositories/air-quality.repository";


function assertNumberClose(actual: number | null, expected: number, tolerance = 1e-9) {
  if (actual === null) throw new Error(`Expected ${expected}, got null`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
  }
}

async function main() {
  console.log("Starting Repository Baseline Verification...\n");
  let passed = 0;
  const total = 7;

  try {
    // 1. PM10 Milano station events Marzo = 29
    const statEvents = await AirQualityRepository.getDailyStationExceedanceEvents(
      "PM10", 50, "2026-03-01T00:00:00", "2026-04-01T00:00:00", "Milano"
    );
    if (statEvents !== 29) throw new Error(`Test 1 Failed: Expected 29, got ${statEvents}`);
    console.log("✅ Test 1 Passed (PM10 Milano station events)");
    passed++;

    // 2. PM10 Milano municipality days Marzo = 11
    const munDays = await AirQualityRepository.getMunicipalityDailyExceedanceDays(
      "PM10", 50, "2026-03-01T00:00:00", "2026-04-01T00:00:00", "Milano"
    );
    if (munDays !== 11) throw new Error(`Test 2 Failed: Expected 11, got ${munDays}`);
    console.log("✅ Test 2 Passed (PM10 Milano municipality days)");
    passed++;

    // 3. O3 Agosto Comuni e Ore: Monza 18, Pioltello 9, Cormano 3, Arconate 2
    const hourlyO3 = await AirQualityRepository.getMunicipalityHourlyExceedances(
      "O3", 180, "2026-08-01T00:00:00", "2026-09-01T00:00:00"
    );
    
    const expectedO3 = { "Monza": 18, "Pioltello": 9, "Cormano": 3, "Arconate": 2 };
    
    // Controlla che siano esattamente 4 comuni e non uno di più
    if (hourlyO3.length !== 4) {
      throw new Error(`Test 3 Failed: Expected exactly 4 municipalities, got ${hourlyO3.length}`);
    }

    // Controlla esattezza dei dati
    for (const res of hourlyO3) {
      if (expectedO3[res.municipality as keyof typeof expectedO3] !== res.exceedanceHours) {
        throw new Error(`Test 3 Failed: Mismatch for ${res.municipality}. Expected ${expectedO3[res.municipality as keyof typeof expectedO3]}, got ${res.exceedanceHours}`);
      }
    }
    console.log("✅ Test 3 Passed (O3 Agosto Hourly Exceedances exact match)");
    passed++;

    // 4. Monza PM10 Mar-Apr = 27.901639344262296
    const avgMarApr = await AirQualityRepository.getPeriodAverage(
      "PM10", "2026-03-01T00:00:00", "2026-05-01T00:00:00", "Monza"
    );
    assertNumberClose(avgMarApr, 27.901639344262296);
    console.log("✅ Test 4 Passed (Monza PM10 Mar-Apr avg)");
    passed++;

    // 5. Monza PM10 May-Jun = 17.934426229508198
    const avgMayJun = await AirQualityRepository.getPeriodAverage(
      "PM10", "2026-05-01T00:00:00", "2026-07-01T00:00:00", "Monza"
    );
    assertNumberClose(avgMayJun, 17.934426229508198);
    console.log("✅ Test 5 Passed (Monza PM10 May-Jun avg)");
    passed++;

    // 6. Latest timestamp = 2026-08-27T08:00:00.000
    const latest = await AirQualityRepository.getLatestDataTimestamp();
    const expectedLatest = "2026-08-27T08:00:00.000";
    if (latest !== expectedLatest) {
      throw new Error(`Test 6 Failed: Expected ${expectedLatest}, got ${latest}`);
    }
    console.log("✅ Test 6 Passed (Latest floating timestamp string)");
    
    passed++;

    // 7. Measurement distribution by pollutant/status
const counts =
  await AirQualityRepository.getMeasurementCountsByPollutantAndStatus();

const expectedCounts = {
  "Biossido di Azoto": {
    VA: 79906,
    NA: 1423,
  },
  Ozono: {
    VA: 33468,
    NA: 836,
  },
  "PM10 (SM2005)": {
    VA: 1928,
    NA: 39,
  },
  "Particelle sospese PM2.5": {
    VA: 1196,
    NA: 48,
  },
} as const;

if (counts.length !== 8) {
  throw new Error(
    `Test 7 Failed: Expected 8 pollutant/status rows, got ${counts.length}`,
  );
}

for (const row of counts) {
  const pollutant =
    expectedCounts[row.pollutantName as keyof typeof expectedCounts];

  if (!pollutant) {
    throw new Error(
      `Test 7 Failed: Unexpected pollutant '${row.pollutantName}'`,
    );
  }

  const expected =
    pollutant[row.status as keyof typeof pollutant];

  if (expected === undefined) {
    throw new Error(
      `Test 7 Failed: Unexpected status '${row.status}' for '${row.pollutantName}'`,
    );
  }

  if (row.count !== expected) {
    throw new Error(
      `Test 7 Failed: ${row.pollutantName}/${row.status}: ` +
        `expected ${expected}, got ${row.count}`,
    );
  }
}

console.log(
  "✅ Test 7 Passed (Measurement distribution by pollutant/status)",
);
passed++;

    console.log(`\n🎉 ALL TESTS PASSED (${passed}/${total})`);
  } catch (err) {
    console.error(`\n❌ REPOSITORY TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();