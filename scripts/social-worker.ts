import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const POLL_INTERVAL_MS = Number(
  process.env.SOCIAL_WORKER_POLL_MS || 30000
);

let stopping = false;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function startWorker() {
  const { processNextQueuedFacebookPost } = await import(
    "../src/modules/social/facebookService"
  );

  console.log("[social-worker] Worker started.");
  console.log(
    `[social-worker] Poll interval: ${POLL_INTERVAL_MS} ms`
  );

  while (!stopping) {
    try {
      const processed = await processNextQueuedFacebookPost();

      if (processed) {
        continue;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown social worker error.";

      console.error(`[social-worker] ${message}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log("[social-worker] Worker stopped.");
}

process.on("SIGINT", () => {
  console.log(
    "\n[social-worker] Shutdown requested. Finishing current work..."
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
    console.error("[social-worker] Fatal error:", error);
    process.exit(1);
  });
