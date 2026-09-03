import "dotenv/config";

const BASE_URL =
  process.env.TEST_BASE_URL ??
  "http://localhost:3001";

interface ChatOkResponse {
  status: "OK";
  content: string;
  toolCallsExecuted: number;
}

interface ChatErrorResponse {
  status:
    | "INVALID_REQUEST"
    | "ERROR";

  error: {
    code: string;
    message: string;
  };

  toolCallsExecuted?: number;
}

async function postJson(
  body: unknown,
): Promise<{
  status: number;
  data: unknown;
}> {
  const response =
    await fetch(
      `${BASE_URL}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(body),
      },
    );

  const data: unknown =
    await response.json();

  return {
    status: response.status,
    data,
  };
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseOkResponse(
  value: unknown,
): ChatOkResponse {
  if (
    !isObject(value) ||
    value.status !== "OK" ||
    typeof value.content !==
      "string" ||
    typeof value.toolCallsExecuted !==
      "number"
  ) {
    throw new Error(
      `Invalid OK response shape: ` +
        `${JSON.stringify(value)}`,
    );
  }

  return {
    status: "OK",
    content: value.content,
    toolCallsExecuted:
      value.toolCallsExecuted,
  };
}

function parseErrorResponse(
  value: unknown,
): ChatErrorResponse {
  if (
    !isObject(value) ||
    (
      value.status !==
        "INVALID_REQUEST" &&
      value.status !== "ERROR"
    ) ||
    !isObject(value.error) ||
    typeof value.error.code !==
      "string" ||
    typeof value.error.message !==
      "string"
  ) {
    throw new Error(
      `Invalid error response shape: ` +
        `${JSON.stringify(value)}`,
    );
  }

  return {
    status:
      value.status,
    error: {
      code:
        value.error.code,
      message:
        value.error.message,
    },
    toolCallsExecuted:
      typeof value.toolCallsExecuted ===
      "number"
        ? value.toolCallsExecuted
        : undefined,
  };
}

async function main() {
  console.log(
    `Starting Chat API Verification against ${BASE_URL}...\n`,
  );

  let passed = 0;
  const total = 6;

  try {
    // ========================================================
    // TEST 1 — PM10 THRESHOLD
    // ========================================================

    console.log(
      "-> Running Test 1 (PM10 Threshold)...",
    );

    const t1 =
      await postJson({
        message:
          "Qual è la soglia configurata per il PM10?",
      });

    if (t1.status !== 200) {
      throw new Error(
        `Test 1 Failed: HTTP ${t1.status}. ` +
          `${JSON.stringify(t1.data)}`,
      );
    }

    const data1 =
      parseOkResponse(t1.data);

    if (
      data1.toolCallsExecuted < 1
    ) {
      throw new Error(
        "Test 1 Failed: expected at least one tool call.",
      );
    }

    if (
      !data1.content.includes("50")
    ) {
      throw new Error(
        `Test 1 Failed: threshold 50 missing. ` +
          `Response: "${data1.content}"`,
      );
    }

    console.log(
      "✅ Test 1 Passed (PM10 threshold grounded via HTTP)",
    );

    console.log(
      `   Reply: "${data1.content}"\n`,
    );

    passed++;

    // ========================================================
    // TEST 2 — MILANO PM10 MARCH
    // ========================================================

    console.log(
      "-> Running Test 2 (Milano PM10 Exceedances)...",
    );

    const t2 =
      await postJson({
        message:
          "Quanti giorni con almeno un superamento PM10 " +
          "ci sono stati a Milano nel marzo 2026?",
      });

    if (t2.status !== 200) {
      throw new Error(
        `Test 2 Failed: HTTP ${t2.status}. ` +
          `${JSON.stringify(t2.data)}`,
      );
    }

    const data2 =
      parseOkResponse(t2.data);

    if (
      data2.toolCallsExecuted < 1
    ) {
      throw new Error(
        "Test 2 Failed: expected at least one tool call.",
      );
    }

    if (
      !data2.content.includes("11")
    ) {
      throw new Error(
        `Test 2 Failed: deterministic fact 11 missing. ` +
          `Response: "${data2.content}"`,
      );
    }

    console.log(
      "✅ Test 2 Passed (Milano PM10 = 11 days via HTTP)",
    );

    console.log(
      `   Reply: "${data2.content}"\n`,
    );

    passed++;

    // ========================================================
    // TEST 3 — PM25 NOT_ASSESSABLE
    // ========================================================

    console.log(
      "-> Running Test 3 (PM2.5 Not Assessable)...",
    );

    const t3 =
      await postJson({
        message:
          "Nel marzo 2026 la compliance PM2.5 " +
          "a Milano è stata rispettata?",
      });

    if (t3.status !== 200) {
      throw new Error(
        `Test 3 Failed: HTTP ${t3.status}. ` +
          `${JSON.stringify(t3.data)}`,
      );
    }

    const data3 =
      parseOkResponse(t3.data);

    if (
      data3.toolCallsExecuted < 1
    ) {
      throw new Error(
        "Test 3 Failed: expected at least one tool call.",
      );
    }

    const lc3 =
      data3.content.toLowerCase();

    const communicatesNotAssessable =
      lc3.includes("non valut") ||
      lc3.includes(
        "non è calcolabile",
      ) ||
      lc3.includes(
        "non e calcolabile",
      ) ||
      lc3.includes(
        "non può essere calcolat",
      ) ||
      lc3.includes(
        "non puo essere calcolat",
      ) ||
      lc3.includes(
        "dataset semestrale",
      );

    if (
      !communicatesNotAssessable
    ) {
      throw new Error(
        `Test 3 Failed: NOT_ASSESSABLE semantics missing. ` +
          `Response: "${data3.content}"`,
      );
    }

    console.log(
      "✅ Test 3 Passed (PM2.5 NOT_ASSESSABLE via HTTP)",
    );

    console.log(
      `   Reply: "${data3.content}"\n`,
    );

    passed++;

    // ========================================================
    // TEST 4 — ATLANTIDE NO_DATA
    // ========================================================

    console.log(
      "-> Running Test 4 (Atlantide NO_DATA)...",
    );

    const t4 =
      await postJson({
        message:
          "Qual è la media PM10 ad Atlantide nel marzo 2026?",
      });

    if (t4.status !== 200) {
      throw new Error(
        `Test 4 Failed: HTTP ${t4.status}. ` +
          `${JSON.stringify(t4.data)}`,
      );
    }

    const data4 =
      parseOkResponse(t4.data);

    if (
      data4.toolCallsExecuted < 1
    ) {
      throw new Error(
        "Test 4 Failed: expected at least one tool call.",
      );
    }

    const lc4 =
      data4.content.toLowerCase();

    const communicatesNoData =
      lc4.includes(
        "non ci sono dati",
      ) ||
      lc4.includes(
        "nessun dato",
      ) ||
      (
        lc4.includes("dati") &&
        lc4.includes("non") &&
        lc4.includes(
          "disponibil",
        )
      ) ||
      lc4.includes(
        "assenza di dati",
      );

    if (!communicatesNoData) {
      throw new Error(
        `Test 4 Failed: NO_DATA semantics missing. ` +
          `Response: "${data4.content}"`,
      );
    }

    console.log(
      "✅ Test 4 Passed (Atlantide NO_DATA via HTTP)",
    );

    console.log(
      `   Reply: "${data4.content}"\n`,
    );

    passed++;

    // ========================================================
    // TEST 5 — MISSING MESSAGE
    // ========================================================

    console.log(
      "-> Running Test 5 (Missing message)...",
    );

    const t5 =
      await postJson({});

    if (t5.status !== 400) {
      throw new Error(
        `Test 5 Failed: expected HTTP 400, got ${t5.status}.`,
      );
    }

    const data5 =
      parseErrorResponse(t5.data);

    if (
      data5.status !==
      "INVALID_REQUEST"
    ) {
      throw new Error(
        `Test 5 Failed: expected INVALID_REQUEST.`,
      );
    }

    console.log(
      "✅ Test 5 Passed (Missing message -> 400)",
    );

    passed++;

    // ========================================================
    // TEST 6 — EMPTY MESSAGE
    // ========================================================

    console.log(
      "-> Running Test 6 (Empty message)...",
    );

    const t6 =
      await postJson({
        message: "    ",
      });

    if (t6.status !== 400) {
      throw new Error(
        `Test 6 Failed: expected HTTP 400, got ${t6.status}.`,
      );
    }

    const data6 =
      parseErrorResponse(t6.data);

    if (
      data6.status !==
      "INVALID_REQUEST"
    ) {
      throw new Error(
        "Test 6 Failed: expected INVALID_REQUEST.",
      );
    }

    console.log(
      "✅ Test 6 Passed (Empty message -> 400)",
    );

    passed++;

    console.log(
      `\n🎉 ALL CHAT API TESTS PASSED (${passed}/${total})`,
    );
  } catch (error: unknown) {
    console.error(
      "\n❌ CHAT API TESTS FAILED:\n",
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  }
}

main();