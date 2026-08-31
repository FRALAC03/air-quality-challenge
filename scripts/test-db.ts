import "dotenv/config";

import { prisma } from "../src/lib/db/prisma";

const EXPECTED_MEASUREMENT_COUNT = 118844;

async function main() {
  const count = await prisma.measurement.count();

  console.log("\n=== DB TEST ===");
  console.log(`Expected Measurement count: ${EXPECTED_MEASUREMENT_COUNT}`);
  console.log(`Real Measurement count:     ${count}`);

  if (count !== EXPECTED_MEASUREMENT_COUNT) {
    throw new Error(
      `Measurement count mismatch: expected ${EXPECTED_MEASUREMENT_COUNT}, got ${count}`,
    );
  }

  console.log("RESULT: SUCCESS");
}

main()
  .catch((error: unknown) => {
    console.error("\nRESULT: FAILED");

    if (error instanceof Error) {
      console.error(`Reason: ${error.message}`);
    } else {
      console.error("Reason: Unknown error");
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });