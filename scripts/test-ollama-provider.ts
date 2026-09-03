import "dotenv/config";
import { runAirQualityAssistant } from "../src/lib/ai/orchestrator";
import { OllamaAdapter } from "../src/lib/ai/providers/ollama-adapter";

async function main() {
  const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  
  console.log(`Starting Ollama Real Provider Verification...`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model:    ${model}\n`);
  
  let passed = 0;
  const total = 4;

  try {
    // --------------------------------------------------
    // TEST 1 — PM10 THRESHOLD
    // --------------------------------------------------
    console.log("-> Running Test 1 (PM10 Threshold)...");
    const adapter1 = new OllamaAdapter();
    const res1 = await runAirQualityAssistant(
      { userMessage: "Qual è la soglia configurata per il PM10?" },
      adapter1
    );

    if (res1.status !== "OK") throw new Error(`Test 1 Failed: Orchestrator returned ${res1.status}. ${JSON.stringify(res1)}`);
    if (res1.toolCallsExecuted < 1) throw new Error("Test 1 Failed: Model didn't use any tools to fetch the threshold.");
    if (!res1.content) throw new Error("Test 1 Failed: Empty response content.");
    if (!res1.content.includes("50")) throw new Error(`Test 1 Failed: The response does not contain the deterministic threshold '50'. Response: "${res1.content}"`);

    console.log(`✅ Test 1 Passed (PM10 Threshold).`);
    console.log(`   Model Reply: "${res1.content}"\n`);
    passed++;

    // --------------------------------------------------
    // TEST 2 — MILANO PM10 MARZO
    // --------------------------------------------------
    console.log("-> Running Test 2 (Milano PM10 Exceedances)...");
    const adapter2 = new OllamaAdapter();
    const res2 = await runAirQualityAssistant(
      { userMessage: "Quanti giorni con almeno un superamento PM10 ci sono stati a Milano nel marzo 2026?" },
      adapter2
    );

    if (res2.status !== "OK") {
  throw new Error(
    `Test 2 Failed: Orchestrator returned ERROR.\n` +
      `${JSON.stringify(res2, null, 2)}`,
  );
}
    if (res2.toolCallsExecuted < 1) throw new Error("Test 2 Failed: Model didn't use any tools to fetch the data.");
    if (!res2.content) throw new Error("Test 2 Failed: Empty response content.");
    if (!res2.content.includes("11")) throw new Error(`Test 2 Failed: The response does not contain the deterministic fact '11'. Response: "${res2.content}"`);

    console.log(`✅ Test 2 Passed (Milano PM10 Exceedances).`);
    console.log(`   Model Reply: "${res2.content}"\n`);
    passed++;

// --------------------------------------------------
// TEST 3 — PM25 NOT_ASSESSABLE
// --------------------------------------------------
console.log("-> Running Test 3 (PM2.5 Not Assessable)...");
const adapter3 = new OllamaAdapter();

const res3 = await runAirQualityAssistant(
  { userMessage: "Nel marzo 2026 la compliance PM2.5 a Milano è stata rispettata?" },
  adapter3
);

if (res3.status !== "OK") {
  throw new Error(`Test 3 Failed: Orchestrator returned ${res3.status}.`);
}

if (res3.toolCallsExecuted < 1) {
  throw new Error("Test 3 Failed: Model didn't use any tools to verify the semantic.");
}

if (!res3.content) {
  throw new Error("Test 3 Failed: Empty response content.");
}

const lc3 =
  res3.content.toLowerCase();

const hasAssessmentImpossibility =
  lc3.includes("non valut") ||
  lc3.includes("non è possibile valut") ||
  lc3.includes("non e possibile valut") ||
  lc3.includes("non può essere valutat") ||
  lc3.includes("non puo essere valutat") ||
  lc3.includes("cannot be assessed") ||
  lc3.includes("cannot be evaluated") ||
  lc3.includes("not assessable");

const hasCalculationImpossibility =
  lc3.includes("non calcolabile") ||
  lc3.includes("non è calcolabile") ||
  lc3.includes("non e calcolabile") ||
  lc3.includes("non può essere calcolat") ||
  lc3.includes("non puo essere calcolat") ||
  lc3.includes("non è possibile calcolare") ||
  lc3.includes("non e possibile calcolare") ||
  lc3.includes("non supporta il calcolo") ||
  lc3.includes("non supporta calcoli") ||
  lc3.includes("not calculable") ||
  lc3.includes("cannot be calculated") ||
  lc3.includes("cannot calculate");

const hasAnnualDatasetContext =
  lc3.includes("media annuale") ||
  lc3.includes("annual average") ||
  lc3.includes("dataset semestrale") ||
  lc3.includes("dati semestrali") ||
  lc3.includes("semi-annual dataset") ||
  lc3.includes("semestral");

const communicatesNotAssessable =
  hasAssessmentImpossibility ||
  (
    hasCalculationImpossibility &&
    hasAnnualDatasetContext
  );

if (!communicatesNotAssessable) {
  throw new Error(
    `Test 3 Failed: PM2.5 non-assessability was not communicated. ` +
      `Response: "${res3.content}"`,
  );
}

console.log("✅ Test 3 Passed (PM2.5 Not Assessable gracefully communicated).");
console.log(`   Model Reply: "${res3.content}"\n`);
passed++;

    // --------------------------------------------------
    // TEST 4 — NO_DATA
    // --------------------------------------------------
    console.log("-> Running Test 4 (Atlantide No Data)...");
    const adapter4 = new OllamaAdapter();
    const res4 = await runAirQualityAssistant(
      { userMessage: "Qual è la media PM10 ad Atlantide nel marzo 2026?" },
      adapter4
    );

    if (res4.status !== "OK") throw new Error(`Test 4 Failed: Orchestrator returned ${res4.status}.`);
    if (res4.toolCallsExecuted < 1) throw new Error("Test 4 Failed: Model didn't use any tools to fetch the data.");
    if (!res4.content) {
  throw new Error(
    "Test 4 Failed: Empty response content.",
  );
}
    
    const lc4 =
  res4.content.toLowerCase();

const indicatesNoData =
  // --------------------------------------------------
  // Italiano — forme plurali
  // --------------------------------------------------
  lc4.includes("non ci sono dati") ||
  lc4.includes("nessun dato") ||
  lc4.includes("dati non disponibili") ||
  lc4.includes("non sono disponibili dati") ||
  lc4.includes("assenza di dati") ||

  // --------------------------------------------------
  // Italiano — forme singolari / alternative
  // --------------------------------------------------
  lc4.includes("dato non disponibile") ||
  lc4.includes("dato richiesto non è disponibile") ||
  lc4.includes("dato richiesto non e disponibile") ||
  lc4.includes("il dato richiesto non è disponibile") ||
  lc4.includes("il dato richiesto non e disponibile") ||
  lc4.includes("non ci sono informazioni") ||
  lc4.includes("nessuna informazione") ||
  lc4.includes("non è disponibile nel sistema") ||
  lc4.includes("non e disponibile nel sistema") ||

  // --------------------------------------------------
  // Inglese
  // --------------------------------------------------
  lc4.includes("no data available") ||
  lc4.includes("no data") ||
  lc4.includes("data unavailable") ||
  lc4.includes("data are not available") ||
  lc4.includes("data is not available") ||
  lc4.includes("requested data is not available") ||
  lc4.includes("no information available") ||

  // --------------------------------------------------
  // Fallback italiano controllato
  // --------------------------------------------------
  (
    (
      lc4.includes("dato") ||
      lc4.includes("dati")
    ) &&
    lc4.includes("non") &&
    lc4.includes("disponibil")
  ) ||

  // --------------------------------------------------
  // Fallback inglese controllato
  // --------------------------------------------------
  (
    lc4.includes("data") &&
    (
      lc4.includes("unavailable") ||
      (
        lc4.includes("not") &&
        lc4.includes("available")
      )
    )
  );

    if (!indicatesNoData) {
       throw new Error(`Test 4 Failed: Model failed to express NO_DATA effectively. Response: "${res4.content}"`);
    }

    console.log(`✅ Test 4 Passed (No Data dynamically recognized).`);
    console.log(`   Model Reply: "${res4.content}"\n`);
    passed++;

    console.log(`🎉 ALL OLLAMA PROVIDER TESTS PASSED (${passed}/${total})`);

  } catch (err) {
    console.error(`\n❌ OLLAMA PROVIDER TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();