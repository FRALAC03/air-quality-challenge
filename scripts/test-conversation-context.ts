import {
  buildConversationAwareUserMessage,
  type ConversationHistoryMessage,
} from "../src/lib/ai/conversation-context";

import {
  doesConversationTurnRequireAtLeastOneTool,
} from "../src/lib/ai/tool-requirement-policy";

async function main() {
  console.log(
    "Starting Conversation Context Verification...\n",
  );

  let passed = 0;
  const total = 7;

  // --------------------------------------------------
  // TEST 1 — NO HISTORY
  // --------------------------------------------------

  const noHistory =
    buildConversationAwareUserMessage(
      "Qual è la soglia PM10?",
      [],
    );

  if (
    noHistory !==
    "Qual è la soglia PM10?"
  ) {
    throw new Error(
      `Test 1 Failed: ${noHistory}`,
    );
  }

  console.log(
    "✅ Test 1 Passed (No history leaves message unchanged)",
  );
  passed++;

  // --------------------------------------------------
  // TEST 2 — HISTORY WRAPPED CORRECTLY
  // --------------------------------------------------

  const history2:
    ConversationHistoryMessage[] = [
      {
        role: "user",
        content:
          "Quanti superamenti PM10 ci sono stati a Milano nel marzo 2026?",
      },
      {
        role: "assistant",
        content:
          "A Milano ci sono stati 11 giorni.",
      },
    ];

  const contextual =
    buildConversationAwareUserMessage(
      "E a Monza?",
      history2,
    );

  if (
    !contextual.includes(
      "<conversation_history>",
    ) ||
    !contextual.includes(
      "Quanti superamenti PM10",
    ) ||
    !contextual.includes(
      "A Milano ci sono stati 11 giorni.",
    ) ||
    !contextual.includes(
      "<current_user_message>",
    ) ||
    !contextual.includes(
      "E a Monza?",
    )
  ) {
    throw new Error(
      `Test 2 Failed:\n${contextual}`,
    );
  }

  console.log(
    "✅ Test 2 Passed (History and current turn wrapped correctly)",
  );
  passed++;

  // --------------------------------------------------
  // TEST 3 — FOLLOW-UP REQUIRES TOOL
  // --------------------------------------------------

  const requiresMonzaTool =
    doesConversationTurnRequireAtLeastOneTool(
      "E a Monza?",
      history2,
    );

  if (!requiresMonzaTool) {
    throw new Error(
      "Test 3 Failed: contextual Monza follow-up should require a tool.",
    );
  }

  console.log(
    "✅ Test 3 Passed (Contextual municipality follow-up requires tool)",
  );
  passed++;

  // --------------------------------------------------
  // TEST 4 — POLLUTANT FOLLOW-UP REQUIRES TOOL
  // --------------------------------------------------

  const history4:
    ConversationHistoryMessage[] = [
      {
        role: "user",
        content:
          "Qual è la soglia configurata per NO2?",
      },
      {
        role: "assistant",
        content:
          "Il limite orario per NO2 è 200 µg/m³.",
      },
    ];

  const requiresPm10Tool =
    doesConversationTurnRequireAtLeastOneTool(
      "E per PM10?",
      history4,
    );

  if (!requiresPm10Tool) {
    throw new Error(
      "Test 4 Failed: pollutant follow-up should require a tool.",
    );
  }

  console.log(
    "✅ Test 4 Passed (Contextual pollutant follow-up requires tool)",
  );
  passed++;

  // --------------------------------------------------
  // TEST 5 — GRATITUDE DOES NOT REQUIRE TOOL
  // --------------------------------------------------

  const gratitudeRequiresTool =
    doesConversationTurnRequireAtLeastOneTool(
      "Grazie!",
      history4,
    );

  if (gratitudeRequiresTool) {
    throw new Error(
      "Test 5 Failed: gratitude must not require a tool.",
    );
  }

  console.log(
    "✅ Test 5 Passed (Conversational gratitude does not require tool)",
  );
  passed++;

  // --------------------------------------------------
  // TEST 6 — EMPTY HISTORY FALLBACK
  // --------------------------------------------------

  const contextualWithoutHistory =
    doesConversationTurnRequireAtLeastOneTool(
      "E a Monza?",
      [],
    );

  if (contextualWithoutHistory) {
    throw new Error(
      "Test 6 Failed: ambiguous follow-up without history should not be classified from nonexistent context.",
    );
  }

  console.log(
    "✅ Test 6 Passed (No phantom context without history)",
  );
  passed++;

  // --------------------------------------------------
// TEST 7 — HISTORY IS LIMITED
// --------------------------------------------------

const longHistory:
  ConversationHistoryMessage[] =
    Array.from(
      { length: 15 },
      (_, index) => ({
        role:
          index % 2 === 0
            ? "user"
            : "assistant",
        content:
          `CTX_${String(
            index + 1,
          ).padStart(2, "0")}`,
      }),
    );

const limited =
  buildConversationAwareUserMessage(
    "E a Monza?",
    longHistory,
  );

// Con MAX_CONTEXT_MESSAGES = 10,
// partendo da 15 messaggi devono restare:
//
// CTX_06 ... CTX_15
//
// CTX_01 ... CTX_05 devono essere eliminati.

if (
  limited.includes("CTX_01") ||
  limited.includes("CTX_05") ||
  !limited.includes("CTX_06") ||
  !limited.includes("CTX_15")
) {
  throw new Error(
    `Test 7 Failed: context window was not limited correctly.\n${limited}`,
  );
}

console.log(
  "✅ Test 7 Passed (Only recent history retained)",
);
passed++;

  console.log(
    `\n🎉 ALL CONVERSATION CONTEXT TESTS PASSED (${passed}/${total})`,
  );
}

main().catch((error: unknown) => {
  console.error(
    "\n❌ CONVERSATION CONTEXT TESTS FAILED:\n",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});