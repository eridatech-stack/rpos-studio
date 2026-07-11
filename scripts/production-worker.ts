import dotenv from "dotenv";
import path from "node:path";

// Load local secrets first.
// The second call loads any non-secret defaults from .env
// without overriding values already loaded from .env.local.
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const POLL_INTERVAL_MS = Number(
  process.env.PRODUCTION_WORKER_POLL_MS || 5000
);

let stopping = false;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function startWorker() {
  /*
   * Import the worker service only after environment variables
   * have been loaded. This prevents db.ts and openai.ts from
   * initializing with empty configuration.
   */
  const { processNextQueuedRun } = await import(
    "../src/modules/workflow/services/ProductionQueueWorker"
  );

  console.log("[production-worker] Worker started.");
  console.log(
    `[production-worker] Poll interval: ${POLL_INTERVAL_MS} ms`
  );

  while (!stopping) {
    try {
      const processed = await processNextQueuedRun();

      // Immediately claim another item when work was completed.
      if (processed) {
        continue;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown worker error.";

      console.error(`[production-worker] ${message}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log("[production-worker] Worker stopped.");
}

process.on("SIGINT", () => {
  console.log(
    "\n[production-worker] Shutdown requested. Finishing current work..."
  );

  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

startWorker()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("[production-worker] Fatal error:", error);
    process.exit(1);
  });