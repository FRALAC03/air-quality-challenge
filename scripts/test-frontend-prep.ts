import "dotenv/config";
import { addFloatingDays } from "../src/lib/domain/date-utils";
import { transformToRechartsPayload } from "../src/lib/frontend/chart-utils";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`Starting Frontend Prep Tests against ${BASE_URL}...\n`);
  let passed = 0;
  const total = 6;

  try {
    // 1. HTTP API Municipalities - baseline esatta
const resMuni = await fetch(
  `${BASE_URL}/api/data/municipalities`,
);

if (!resMuni.ok) {
  throw new Error(
    `Municipalities HTTP failed with ${resMuni.status}`,
  );
}

const jsonMuni = (await resMuni.json()) as {
  status: string;
  municipalities: string[];
};

const expectedMunicipalities = [
  "Arconate",
  "Cassano d'Adda",
  "Cinisello Balsamo",
  "Cormano",
  "Magenta",
  "Meda",
  "Milano",
  "Monza",
  "Motta Visconti",
  "Pioltello",
  "Rho",
  "San Giuliano Milanese",
  "Sesto San Giovanni",
  "Turbigo",
];

if (jsonMuni.status !== "OK") {
  throw new Error(
    `Expected status OK, got ${jsonMuni.status}`,
  );
}

if (jsonMuni.municipalities.length !== 14) {
  throw new Error(
    `Expected 14 municipalities, got ${jsonMuni.municipalities.length}`,
  );
}

if (
  JSON.stringify(jsonMuni.municipalities) !==
  JSON.stringify(expectedMunicipalities)
) {
  throw new Error(
    `Municipality baseline mismatch.\n` +
      `Expected: ${JSON.stringify(expectedMunicipalities)}\n` +
      `Got: ${JSON.stringify(jsonMuni.municipalities)}`,
  );
}

if (
  new Set(jsonMuni.municipalities).size !==
  jsonMuni.municipalities.length
) {
  throw new Error(
    "Duplicate municipality returned by API",
  );
}

if (
  jsonMuni.municipalities.some(
    (municipality) => municipality.trim() === "",
  )
) {
  throw new Error(
    "Empty municipality returned by API",
  );
}

console.log(
  "✅ Test 1 Passed " +
    "(Municipalities API: exact 14-item ordered baseline)",
);
passed++;

    // 2. addFloatingDays (Non-leap year)
    if (addFloatingDays("2026-02-28T00:00:00", 1) !== "2026-03-01T00:00:00") throw new Error("Math failed for 2026-02-28");
    console.log(`✅ Test 2 Passed (2026-02-28 + 1 day = 2026-03-01)`);
    passed++;

    // 3. addFloatingDays (Leap year leap day)
    if (addFloatingDays("2024-02-28T00:00:00", 1) !== "2024-02-29T00:00:00") throw new Error("Math failed for 2024-02-28");
    if (addFloatingDays("2024-02-29T00:00:00", 1) !== "2024-03-01T00:00:00") throw new Error("Math failed for 2024-02-29");
    console.log(`✅ Test 3 Passed (2024 Leap year math)`);
    passed++;

    // 4. addFloatingDays (Year boundary)
    if (addFloatingDays("2025-12-31T00:00:00", 1) !== "2026-01-01T00:00:00") throw new Error("Math failed for 2025-12-31");
    console.log(`✅ Test 4 Passed (2025-12-31 + 1 day = 2026-01-01)`);
    passed++;

    // 5. addFloatingDays rifiuta input invalidi
let negativeDaysRejected = false;

try {
  addFloatingDays(
    "2026-03-01T00:00:00",
    -1,
  );
} catch {
  negativeDaysRejected = true;
}

if (!negativeDaysRejected) {
  throw new Error(
    "Test 5 Failed: negative daysToAdd should be rejected",
  );
}

let fractionalDaysRejected = false;

try {
  addFloatingDays(
    "2026-03-01T00:00:00",
    1.5,
  );
} catch {
  fractionalDaysRejected = true;
}

if (!fractionalDaysRejected) {
  throw new Error(
    "Test 5 Failed: fractional daysToAdd should be rejected",
  );
}

let invalidDateRejected = false;

try {
  addFloatingDays(
    "2026-02-31T00:00:00",
    1,
  );
} catch {
  invalidDateRejected = true;
}

if (!invalidDateRejected) {
  throw new Error(
    "Test 5 Failed: impossible source date should be rejected",
  );
}

console.log(
  "✅ Test 5 Passed " +
    "(Invalid calendar inputs correctly rejected)",
);
passed++;

    // 6. Recharts Transform Pure Logic
// Input volutamente NON ordinato per verificare
// che chart-utils ordini autonomamente l'output.
const mockTS = [
  {
    stationId: 10,
    stationName: "Alpha",
    recordedAt: "2026-01-02T00:00:00",
    value: 110,
  },
  {
    stationId: 20,
    stationName: "Beta",
    recordedAt: "2026-01-01T00:00:00",
    value: 50,
  },
  {
    stationId: 10,
    stationName: "Alpha",
    recordedAt: "2026-01-01T00:00:00",
    value: 100,
  },
];

const payload =
  transformToRechartsPayload(mockTS);

// Deve trovare 2 stazioni
if (payload.metadata.length !== 2) {
  throw new Error(
    `Expected 2 metadata entries, got ${payload.metadata.length}`,
  );
}

// Le metadata devono essere ordinate per stationId:
// 10 prima di 20
if (
  payload.metadata[0]?.stationId !== 10 ||
  payload.metadata[1]?.stationId !== 20
) {
  throw new Error(
    `Metadata are not ordered by stationId: ` +
      JSON.stringify(payload.metadata),
  );
}

// Devono esserci 2 timestamp distinti
if (payload.data.length !== 2) {
  throw new Error(
    `Expected 2 timeline points, got ${payload.data.length}`,
  );
}

// Il primo timestamp deve essere 01 gennaio,
// anche se nell'input il 02 gennaio era in prima posizione
if (
  payload.data[0]?.recordedAt !==
  "2026-01-01T00:00:00"
) {
  throw new Error(
    `Chart data are not ordered by recordedAt: ` +
      JSON.stringify(payload.data),
  );
}

// Sul primo giorno devono esserci entrambe le stazioni
if (
  payload.data[0]?.["station_10"] !== 100 ||
  payload.data[0]?.["station_20"] !== 50
) {
  throw new Error(
    `Incorrect Recharts pivot for first day: ` +
      JSON.stringify(payload.data[0]),
  );
}

// Il secondo giorno deve contenere Alpha = 110
if (
  payload.data[1]?.recordedAt !==
    "2026-01-02T00:00:00" ||
  payload.data[1]?.["station_10"] !== 110
) {
  throw new Error(
    `Incorrect second chart point: ` +
      JSON.stringify(payload.data[1]),
  );
}

console.log(
  "✅ Test 6 Passed " +
    "(Recharts pivot and deterministic ordering)",
);
passed++;

    console.log(`\n🎉 ALL PREP TESTS PASSED (${passed}/${total})`);
  } catch (e: unknown) {
    console.error(`\n❌ PREP TESTS FAILED:\n`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

main();