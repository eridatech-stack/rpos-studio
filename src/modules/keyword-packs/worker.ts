import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import {
  addKeywordPackEvent,
  claimNextQueuedKeywordPack,
  updateKeywordPackProgress,
} from "@/modules/keyword-packs/repository";
import { generateKeywordPack } from "@/modules/keyword-packs/generationService";

const workerId = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

export async function processNextQueuedKeywordPack() {
  const pack = await claimNextQueuedKeywordPack(workerId);

  if (!pack) {
    return false;
  }

  console.log(
    `[keyword-pack-worker] Claimed keyword pack ${pack.id} using ${workerId}`
  );

  try {
    await generateKeywordPack(pack.id);

    console.log(
      `[keyword-pack-worker] Completed keyword pack ${pack.id}`
    );
  } catch (error: unknown) {
    const message = sanitizeWorkerError(error);
    const isCancelled = message.toLowerCase().includes("cancelled");

    await updateKeywordPackProgress(pack.id, {
      status: isCancelled ? "cancelled" : "failed",
      progressPercent: isCancelled ? undefined : undefined,
      currentStep: null,
      errorMessage: isCancelled ? null : message,
      finished: true,
    });

    await addKeywordPackEvent({
      keywordPackId: pack.id,
      eventType: isCancelled ? "pack_cancelled" : "pack_failed",
      status: isCancelled ? "cancelled" : "failed",
      message: isCancelled
        ? "Keyword pack generation was cancelled."
        : "Keyword pack generation failed.",
      details: {
        workerId,
        error: message,
      },
    });

    console.error(
      `[keyword-pack-worker] Failed keyword pack ${pack.id}: ${message}`
    );
  }

  return true;
}

function sanitizeWorkerError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Keyword pack generation failed.";

  if (message.includes("OPENAI_API_KEY")) {
    return "OpenAI is not configured for keyword pack generation.";
  }

  if (message.length > 500) {
    return `${message.slice(0, 497)}...`;
  }

  return message;
}
