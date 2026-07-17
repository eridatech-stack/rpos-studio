import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const POLL_INTERVAL_MS = Number(
  process.env.KEYWORD_PACK_WORKER_POLL_MS || 5000
);

let stopping = false;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function startWorker() {
  const { processNextQueuedKeywordPack } = await import(
    "../src/modules/keyword-packs/worker"
  );

  console.log("[keyword-pack-worker] Worker started.");
  console.log(
    `[keyword-pack-worker] Poll interval: ${POLL_INTERVAL_MS} ms`
  );

  while (!stopping) {
    try {
      const processed = await processNextQueuedKeywordPack();

      if (processed) {
        continue;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown keyword pack worker error.";

      console.error(`[keyword-pack-worker] ${message}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log("[keyword-pack-worker] Worker stopped.");
}

process.on("SIGINT", () => {
  console.log(
    "\n[keyword-pack-worker] Shutdown requested. Finishing current work..."
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
    console.error("[keyword-pack-worker] Fatal error:", error);
    process.exit(1);
  });
