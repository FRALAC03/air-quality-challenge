import "dotenv/config";
import { runAirQualityAssistant } from "../src/lib/ai/orchestrator";
import { OpenAIResponsesAdapter } from "../src/lib/ai/providers/openai-responses-adapter";

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("CRITICAL: OPENAI_API_KEY is missing from environment. Integration test aborted.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-sol";
  console.log(`Starting OpenAI Real Provider Verification using model: ${model}\n`);
  
  let passed = 0;
  const total = 4;

  try {
    // --------------------------------------------------
    // TEST 1 — PM10 THRESHOLD
    // --------------------------------------------------
    console.log("-> Running Test 1 (PM10 Threshold)...");
    const adapter1 = new OpenAIResponsesAdapter();
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
    // TEST 2 — MILANO PM10 EXCEEDANCES
    // --------------------------------------------------
    console.log("-> Running Test 2 (Milano PM10 Exceedances)...");
    const adapter2 = new OpenAIResponsesAdapter();
    const res2 = await runAirQualityAssistant(
      { userMessage: "Quanti giorni con almeno un superamento PM10 ci sono stati a Milano nel marzo 2026?" },
      adapter2
    );

    if (res2.status !== "OK") throw new Error(`Test 2 Failed: Orchestrator returned ${res2.status}.`);
    if (res2.toolCallsExecuted < 1) throw new Error("Test 2 Failed: Model didn't use any tools to fetch the data.");
    if (!res2.content) throw new Error("Test 2 Failed: Empty response content.");
    if (!res2.content.includes("11")) throw new Error(`Test 2 Failed: The response does not contain the deterministic fact '11'. Response: "${res2.content}"`);

    console.log(`✅ Test 2 Passed (Milano PM10 Exceedances).`);
    console.log(`   Model Reply: "${res2.content}"\n`);
    passed++;

    // --------------------------------------------------
    // TEST 3 — PM25 NOT ASSESSABLE
    // --------------------------------------------------
    console.log("-> Running Test 3 (PM2.5 Not Assessable)...");
    const adapter3 = new OpenAIResponsesAdapter();
    const res3 = await runAirQualityAssistant(
      { userMessage: "Nel marzo 2026 la compliance PM2.5 a Milano è stata rispettata?" },
      adapter3
    );

    if (res3.status !== "OK") throw new Error(`Test 3 Failed: Orchestrator returned ${res3.status}.`);
    if (res3.toolCallsExecuted < 1) throw new Error("Test 3 Failed: Model didn't use any tools to verify the semantic.");
    if (!res3.content) throw new Error("Test 3 Failed: Empty response content.");

    const lc3 =
  res3.content.toLowerCase();

const communicatesNotAssessable =
  lc3.includes("non valut") ||
  lc3.includes("non è valut") ||
  lc3.includes("non puo") ||
  lc3.includes("non può") ||
  lc3.includes("non calcolabile") ||
  lc3.includes("non applicabile");

if (!communicatesNotAssessable) {
  throw new Error(
    `Test 3 Failed: PM2.5 non-assessability was not ` +
      `communicated. Response: "${res3.content}"`,
  );
}

    console.log(`✅ Test 3 Passed (PM2.5 Not Assessable gracefully communicated).`);
    console.log(`   Model Reply: "${res3.content}"\n`);
    passed++;

    // --------------------------------------------------
    // TEST 4 — NO DATA
    // --------------------------------------------------
    console.log("-> Running Test 4 (Atlantide No Data)...");
    const adapter4 = new OpenAIResponsesAdapter();
    const res4 = await runAirQualityAssistant(
      { userMessage: "Qual è la media PM10 ad Atlantide nel marzo 2026?" },
      adapter4
    );

    if (res4.status !== "OK") throw new Error(`Test 4 Failed: Orchestrator returned ${res4.status}.`);
    if (res4.toolCallsExecuted < 1) throw new Error("Test 4 Failed: Model didn't use any tools to fetch the data.");
    
    const lc4 = res4.content.toLowerCase();
    const indicatesNoData = lc4.includes("non ci sono dati") || lc4.includes("nessun dato") || lc4.includes("non disponibili") || lc4.includes("assenza");

    if (!indicatesNoData) {
       throw new Error(`Test 4 Failed: Model failed to express NO_DATA effectively. Response: "${res4.content}"`);
    }

    console.log(`✅ Test 4 Passed (No Data dynamically recognized).`);
    console.log(`   Model Reply: "${res4.content}"\n`);
    passed++;

    console.log(`🎉 ALL OPENAI PROVIDER TESTS PASSED (${passed}/${total})`);

  } catch (err) {
    console.error(`\n❌ OPENAI PROVIDER TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    // Chiudiamo Prisma a fine execution poichè i tool invocano il DB in locale
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();