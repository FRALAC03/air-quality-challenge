import {
  normalizeAssistantContent,
} from "../src/lib/frontend/chat-formatters";

import {
  parseChatResponse,
} from "../src/lib/frontend/chat-api";

function expectThrows(
  fn: () => unknown,
  message: string,
) {
  let didThrow = false;

  try {
    fn();
  } catch {
    didThrow = true;
  }

  if (!didThrow) {
    throw new Error(message);
  }
}

async function main() {
  console.log(
    "Starting Chat Frontend Verification...\n",
  );

  let passed = 0;
  const total = 8;

  try {
    // --------------------------------------------------
    // TEST 1 — CLEAN NORMAL TEXT
    // --------------------------------------------------

    const normal =
      normalizeAssistantContent(
        "Il limite PM10 è 50 µg/m³.",
      );

    if (
      normal !==
      "Il limite PM10 è 50 µg/m³."
    ) {
      throw new Error(
        `Test 1 Failed: ${normal}`,
      );
    }

    console.log(
      "✅ Test 1 Passed (Normal content unchanged)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 2 — REMOVE FINAL_RESPONSE
    // --------------------------------------------------

    const finalMarker =
      normalizeAssistantContent(
        "FINAL_RESPONSE\nIl limite è 50.",
      );

    if (
      finalMarker !==
      "Il limite è 50."
    ) {
      throw new Error(
        `Test 2 Failed: ${finalMarker}`,
      );
    }

    console.log(
      "✅ Test 2 Passed (FINAL_RESPONSE removed)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 3 — REMOVE FINAL_RESPONSE WITH COLON
    // --------------------------------------------------

    const finalColon =
      normalizeAssistantContent(
        "FINAL_RESPONSE: Il limite è 50.",
      );

    if (
      finalColon !==
      "Il limite è 50."
    ) {
      throw new Error(
        `Test 3 Failed: ${finalColon}`,
      );
    }

    console.log(
      "✅ Test 3 Passed (FINAL_RESPONSE colon removed)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 4 — REMOVE MARKDOWN BOLD
    // --------------------------------------------------

    const markdown =
      normalizeAssistantContent(
        "Nel **marzo 2026** ci sono stati **11 giorni**.",
      );

    if (
      markdown !==
      "Nel marzo 2026 ci sono stati 11 giorni."
    ) {
      throw new Error(
        `Test 4 Failed: ${markdown}`,
      );
    }

    console.log(
      "✅ Test 4 Passed (Markdown bold markers removed)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 5 — COMBINED NORMALIZATION
    // --------------------------------------------------

    const combined =
      normalizeAssistantContent(
        "  FINAL_RESPONSE\nIl PM10 ha superato il limite per **11 giorni**.  ",
      );

    if (
      combined !==
      "Il PM10 ha superato il limite per 11 giorni."
    ) {
      throw new Error(
        `Test 5 Failed: ${combined}`,
      );
    }

    console.log(
      "✅ Test 5 Passed (Combined normalization)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 6 — VALID CHAT API RESPONSE
    // --------------------------------------------------

    const valid =
      parseChatResponse({
        status: "OK",
        content:
          "Il limite PM10 è 50.",
        toolCallsExecuted: 1,
      });

    if (
      valid.status !== "OK" ||
      valid.content !==
        "Il limite PM10 è 50." ||
      valid.toolCallsExecuted !== 1
    ) {
      throw new Error(
        `Test 6 Failed: ${JSON.stringify(
          valid,
        )}`,
      );
    }

    console.log(
      "✅ Test 6 Passed (Valid chat response accepted)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 7 — INVALID CONTENT REJECTED
    // --------------------------------------------------

    expectThrows(
      () =>
        parseChatResponse({
          status: "OK",
          content: 50,
          toolCallsExecuted: 1,
        }),
      "Test 7 Failed: invalid content was accepted.",
    );

    console.log(
      "✅ Test 7 Passed (Invalid content rejected)",
    );
    passed++;

    // --------------------------------------------------
    // TEST 8 — INVALID TOOL COUNT REJECTED
    // --------------------------------------------------

    expectThrows(
      () =>
        parseChatResponse({
          status: "OK",
          content:
            "Risposta valida",
          toolCallsExecuted:
            "1",
        }),
      "Test 8 Failed: invalid toolCallsExecuted was accepted.",
    );

    console.log(
      "✅ Test 8 Passed (Invalid tool count rejected)",
    );
    passed++;

    console.log(
      `\n🎉 ALL CHAT FRONTEND TESTS PASSED (${passed}/${total})`,
    );
  } catch (error: unknown) {
    console.error(
      "\n❌ CHAT FRONTEND TESTS FAILED:\n",
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  }
}

main();