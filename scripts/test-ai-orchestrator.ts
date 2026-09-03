import "dotenv/config";
import type { ModelTurnResult, AirQualityModelAdapter, ModelMessage } from "../src/lib/ai/model-types";
import { runAirQualityAssistant } from "../src/lib/ai/orchestrator";
import type { ToolExecutionFailure } from "../src/lib/ai/tool-types";

// ============================================================================
// FAKE SCRIPTED MODEL ADAPTER
// ============================================================================
class ScriptedModelAdapter implements AirQualityModelAdapter {
  private script: ModelTurnResult[];
  private currentIndex = 0;
  
  public callCount = 0;
  public receivedMessages: ModelMessage[][] = [];

  constructor(script: ModelTurnResult[]) {
    this.script = script;
  }

  async generate(
  messages: readonly ModelMessage[],
): Promise<ModelTurnResult> {
  this.callCount++;
  this.receivedMessages.push([...messages]);

  if (
    this.currentIndex >=
    this.script.length
  ) {
    throw new Error(
      "ScriptedModelAdapter exhausted its scripted responses.",
    );
  }

  const nextResponse =
    this.script[this.currentIndex];

  this.currentIndex++;

  return nextResponse;
} 

} 


// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function main() {
  console.log("Starting AI Orchestrator Verification...\n");
  let passed = 0;
  const total = 13;

  try {
    // --------------------------------------------------
    // TEST 1 — DIRECT FINAL RESPONSE
    // --------------------------------------------------
    const adapter1 = new ScriptedModelAdapter([{ type: "FINAL_RESPONSE", content: "Ciao." }]);
    const res1 = await runAirQualityAssistant({ userMessage: "Ciao" }, adapter1);
    if (res1.status !== "OK" || res1.content !== "Ciao." || res1.toolCallsExecuted !== 0 || adapter1.callCount !== 1) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(res1)}`);
    }
    console.log("✅ Test 1 Passed (Direct Final Response)");
    passed++;

    // --------------------------------------------------
    // TEST 2 — ONE TOOL ROUND
    // --------------------------------------------------
    const adapter2 = new ScriptedModelAdapter([
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
      { type: "FINAL_RESPONSE", content: "Il limite è 50." }
    ]);
    const res2 = await runAirQualityAssistant({ userMessage: "Qual è il limite PM10?" }, adapter2);
    if (res2.status !== "OK" || res2.toolCallsExecuted !== 1 || adapter2.callCount !== 2) throw new Error("Test 2 Failed");
    
    // Verifichiamo che il secondo round contenga l'esito del tool (value = 50, base = daily)
    const historyR2 = adapter2.receivedMessages[1];
    const toolMsg = historyR2.find(m => m.role === "tool");
    if (!toolMsg || toolMsg.role !== "tool" || toolMsg.toolName !== "get_threshold" || !toolMsg.content.includes('"value":50') || !toolMsg.content.includes('"base":"daily"')) {
      throw new Error(`Test 2 Failed History Match. Found: ${JSON.stringify(toolMsg)}`);
    }
    console.log("✅ Test 2 Passed (One Tool Round: PM10 Threshold injected properly)");
    passed++;

    // --------------------------------------------------
    // TEST 3 — TWO TOOL ROUNDS
    // --------------------------------------------------
    const adapter3 = new ScriptedModelAdapter([
      { type: "TOOL_CALL", call: { name: "get_period_average", arguments: { pollutant: "PM10", municipality: "Monza", period: { start: "2026-03-01T00:00:00", end: "2026-05-01T00:00:00" } } } },
      { type: "TOOL_CALL", call: { name: "get_period_average", arguments: { pollutant: "PM10", municipality: "Monza", period: { start: "2026-05-01T00:00:00", end: "2026-07-01T00:00:00" } } } },
      { type: "FINAL_RESPONSE", content: "Ho confrontato i due periodi." }
    ]);
    const res3 = await runAirQualityAssistant({ userMessage: "Confrontami Monza PM10." }, adapter3);
    if (res3.status !== "OK" || res3.toolCallsExecuted !== 2) throw new Error("Test 3 Failed");
    const historyR3 = adapter3.receivedMessages[2];
    const toolMsgsR3 = historyR3.filter(m => m.role === "tool");
    if (toolMsgsR3.length !== 2) throw new Error("Test 3 Failed: expected 2 tool messages in history");
    if (!toolMsgsR3[0].content.includes("27.901639344262296") || !toolMsgsR3[1].content.includes("17.934426229508198")) {
      throw new Error("Test 3 Failed: Missing exact averages in tool responses");
    }
    console.log("✅ Test 3 Passed (Two Tool Rounds: Math matches baseline exactly)");
    passed++;

    // --------------------------------------------------
    // TEST 4 — PM25 NOT_ASSESSABLE
    // --------------------------------------------------
    const adapter4 = new ScriptedModelAdapter([
      { type: "TOOL_CALL", call: { name: "get_exceedances", arguments: { pollutant: "PM25", municipality: "Milano", period: { start: "2026-03-01T00:00:00", end: "2026-04-01T00:00:00" }, metric: "MUNICIPALITY_EXCEEDANCE_DAYS" } } },
      { type: "FINAL_RESPONSE", content: "Non è valutabile." }
    ]);
    const res4 = await runAirQualityAssistant({ userMessage: "Milano PM25 sforamenti?" }, adapter4);
    if (res4.status !== "OK") throw new Error("Test 4 Failed: Expected OK despite NOT_ASSESSABLE domain status");
    const toolMsgR4 = adapter4.receivedMessages[1].find(m => m.role === "tool");
    if (!toolMsgR4 || !toolMsgR4.content.includes("NOT_ASSESSABLE")) throw new Error("Test 4 Failed: Domain NOT_ASSESSABLE omitted from history");
    console.log("✅ Test 4 Passed (PM25 NOT_ASSESSABLE handled securely by Domain, not thrown)");
    passed++;

    // --------------------------------------------------
    // TEST 5 — INVALID TOOL NAME
    // --------------------------------------------------
    const adapter5 = new ScriptedModelAdapter([{ type: "TOOL_CALL", call: { name: "delete_database", arguments: {} } }]);
    const res5 = await runAirQualityAssistant({ userMessage: "Distruggi tutto." }, adapter5);
    if (res5.status !== "ERROR" || res5.error.code !== "INVALID_TOOL_CALL" || res5.toolCallsExecuted !== 0) throw new Error("Test 5 Failed");
    console.log("✅ Test 5 Passed (Invalid Tool Name caught by Boundary)");
    passed++;

    // --------------------------------------------------
    // TEST 6 — INVALID TOOL ARGUMENTS
    // --------------------------------------------------
    const adapter6 = new ScriptedModelAdapter([{ type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "CARBONITE" } } }]);
    const res6 = await runAirQualityAssistant({ userMessage: "Dimmi del carbonite." }, adapter6);
    if (res6.status !== "ERROR" || res6.error.code !== "INVALID_TOOL_CALL" || res6.toolCallsExecuted !== 0) throw new Error("Test 6 Failed");
    console.log("✅ Test 6 Passed (Invalid Arguments caught by Boundary)");
    passed++;

    // --------------------------------------------------
    // TEST 7 — TECHNICAL TOOL FAILURE
    // --------------------------------------------------
    const adapter7 = new ScriptedModelAdapter([{ type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } }]);
    const fakeFailureResult: ToolExecutionFailure = { executionStatus: "FAILURE", tool: "get_threshold", error: { code: "EXECUTION_ERROR", message: "Synthetic failure" } };
    const res7 =
  await runAirQualityAssistant(
    { userMessage: "test" },
    adapter7,
    {
      executeTool: async () =>
        fakeFailureResult,
    },
  );
    if (res7.status !== "ERROR" || res7.error.code !== "TOOL_EXECUTION_ERROR") throw new Error("Test 7 Failed");
    console.log("✅ Test 7 Passed (Technical Failure gracefully trapped)");
    passed++;

    // --------------------------------------------------
    // TEST 8 — MODEL THROWS
    // --------------------------------------------------
    const throwAdapter = { generate: async () => { throw new Error("Model dead"); } };
    const res8 = await runAirQualityAssistant({ userMessage: "test" }, throwAdapter);
    if (res8.status !== "ERROR" || res8.error.code !== "MODEL_ERROR") throw new Error("Test 8 Failed");
    console.log("✅ Test 8 Passed (Model internal crash trapped securely)");
    passed++;

    // --------------------------------------------------
    // TEST 9 — EMPTY USER MESSAGE
    // --------------------------------------------------
    const adapter9 = new ScriptedModelAdapter([]);
    const res9 = await runAirQualityAssistant({ userMessage: "   " }, adapter9);
    if (res9.status !== "ERROR" || res9.error.code !== "EMPTY_USER_MESSAGE" || adapter9.callCount !== 0) throw new Error("Test 9 Failed");
    console.log("✅ Test 9 Passed (Empty message prevents model hit)");
    passed++;

    // --------------------------------------------------
    // TEST 10 — MAX TOOL ROUNDS
    // --------------------------------------------------
    const spamAdapter = new ScriptedModelAdapter([
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
      { type: "TOOL_CALL", call: { name: "get_threshold", arguments: { pollutant: "PM10" } } },
    ]);
    const res10 = await runAirQualityAssistant({ userMessage: "Loop." }, spamAdapter);
    if (res10.status !== "ERROR" || res10.error.code !== "MAX_TOOL_ROUNDS" || res10.toolCallsExecuted !== 4) {
      throw new Error(`Test 10 Failed: ${JSON.stringify(res10)}`);
    }
    console.log("✅ Test 10 Passed (Max 4 Rounds respected rigidly)");
    passed++;

    // --------------------------------------------------
    // TEST 11 — EXTRA: DOMAIN INVALID_REQUEST (Tool Success)
    // --------------------------------------------------
    const adapter11 = new ScriptedModelAdapter([
      { type: "TOOL_CALL", call: { name: "get_period_average", arguments: { pollutant: "PM10", municipality: "Monza", period: { start: "NOPE", end: "2026-04-01T00:00:00" } } } },
      { type: "FINAL_RESPONSE", content: "Parametri rotti." }
    ]);
    const res11 = await runAirQualityAssistant({ userMessage: "Test domain err." }, adapter11);
    if (res11.status !== "OK") throw new Error("Test 11 Failed: Expected OK");
    const toolMsg11 = adapter11.receivedMessages[1].find(m => m.role === "tool");
    if (!toolMsg11 || !toolMsg11.content.includes("INVALID_REQUEST")) throw new Error("Test 11 Failed: Domain validity bypass not found in history");
    console.log("✅ Test 11 Passed (Boundary passed syntax, Domain correctly trapped INVALID_REQUEST)");
    passed++;

        // --------------------------------------------------
    // TEST 12 — TOOL REQUIRED: RETRY THEN TOOL SUCCESS
    // --------------------------------------------------
    const adapter12 = new ScriptedModelAdapter([
      // Primo tentativo:
      // il modello prova a rispondere direttamente.
      {
        type: "FINAL_RESPONSE",
        content: "La soglia è 50.",
      },

      // L'orchestrator deve rifiutare la risposta
      // perché la domanda richiede dati deterministici,
      // quindi il modello al retry usa finalmente il tool.
      {
        type: "TOOL_CALL",
        call: {
          name: "get_threshold",
          arguments: {
            pollutant: "PM10",
          },
        },
      },

      // Dopo il risultato tool può produrre
      // la risposta finale.
      {
        type: "FINAL_RESPONSE",
        content: "Il limite PM10 è 50.",
      },
    ]);

    const res12 =
      await runAirQualityAssistant(
        {
          userMessage:
            "Qual è la soglia PM10?",
        },
        adapter12,
      );

    if (
      res12.status !== "OK" ||
      res12.toolCallsExecuted !== 1 ||
      adapter12.callCount !== 3 ||
      res12.content !==
        "Il limite PM10 è 50."
    ) {
      throw new Error(
        `Test 12 Failed: ${JSON.stringify(
          res12,
        )}`,
      );
    }

    // Primo model hit:
    // system + user normali.
    const firstAttempt12 =
      adapter12.receivedMessages[0];

    if (
      firstAttempt12.length !== 2 ||
      firstAttempt12[0]?.role !==
        "system" ||
      firstAttempt12[1]?.role !== "user"
    ) {
      throw new Error(
        "Test 12 Failed: invalid initial model history.",
      );
    }

    // Secondo model hit:
    // deve essere un NUOVO initial turn,
    // ma con il system prompt rafforzato.
    const retryAttempt12 =
      adapter12.receivedMessages[1];

    if (
      retryAttempt12.length !== 2 ||
      retryAttempt12[0]?.role !==
        "system" ||
      retryAttempt12[1]?.role !== "user"
    ) {
      throw new Error(
        "Test 12 Failed: retry was not reset to system + user.",
      );
    }

    if (
      !retryAttempt12[0].content.includes(
        "MANDATORY TOOL ENFORCEMENT",
      )
    ) {
      throw new Error(
        "Test 12 Failed: mandatory tool enforcement was not injected.",
      );
    }

    // Terzo model hit:
    // deve contenere il risultato deterministico
    // del get_threshold.
    const finalAttempt12 =
      adapter12.receivedMessages[2];

    const toolMsg12 =
      finalAttempt12.find(
        (message) =>
          message.role === "tool",
      );

    if (
      !toolMsg12 ||
      toolMsg12.role !== "tool" ||
      toolMsg12.toolName !==
        "get_threshold" ||
      !toolMsg12.content.includes(
        '"value":50',
      )
    ) {
      throw new Error(
        `Test 12 Failed: deterministic tool result ` +
          `missing from retry history. Found: ` +
          `${JSON.stringify(toolMsg12)}`,
      );
    }

    console.log(
      "✅ Test 12 Passed " +
        "(Data-dependent direct answer blocked, " +
        "retry forced tool usage)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 13 — TOOL REQUIRED: MODEL REFUSES TWICE
    // --------------------------------------------------
    const adapter13 =
      new ScriptedModelAdapter([
        // Primo tentativo senza tool.
        {
          type: "FINAL_RESPONSE",
          content:
            "La soglia è 50.",
        },

        // Anche dopo l'enforcement il modello
        // continua a rispondere senza tool.
        {
          type: "FINAL_RESPONSE",
          content:
            "Insisto: la soglia è 50.",
        },
      ]);

    const res13 =
      await runAirQualityAssistant(
        {
          userMessage:
            "Qual è la soglia PM10?",
        },
        adapter13,
      );

    if (
      res13.status !== "ERROR" ||
      res13.error.code !==
        "TOOL_REQUIRED" ||
      res13.toolCallsExecuted !== 0 ||
      adapter13.callCount !== 2
    ) {
      throw new Error(
        `Test 13 Failed: ${JSON.stringify(
          res13,
        )}`,
      );
    }

    // Anche qui verifichiamo che il secondo
    // tentativo abbia ricevuto il prompt
    // di enforcement.
    const retryAttempt13 =
      adapter13.receivedMessages[1];

    if (
      retryAttempt13.length !== 2 ||
      retryAttempt13[0]?.role !==
        "system" ||
      retryAttempt13[1]?.role !== "user"
    ) {
      throw new Error(
        "Test 13 Failed: retry was not reset to system + user.",
      );
    }

    if (
      !retryAttempt13[0].content.includes(
        "MANDATORY TOOL ENFORCEMENT",
      )
    ) {
      throw new Error(
        "Test 13 Failed: mandatory tool enforcement was not injected.",
      );
    }

    console.log(
      "✅ Test 13 Passed " +
        "(Repeated ungrounded answer blocked with TOOL_REQUIRED)",
    );
    passed++;

    console.log(`\n🎉 ALL AI ORCHESTRATOR TESTS PASSED (${passed}/${total})`);

  } catch (err) {
    console.error(`\n❌ AI ORCHESTRATOR TESTS FAILED:\n`, err);
    process.exitCode = 1;
  } finally {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  }
}

main();