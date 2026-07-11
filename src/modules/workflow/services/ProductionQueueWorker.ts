import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { generateArticlePlan } from "@/services/articlePlanningService";
import { generateArticleDraft } from "@/services/articleDraftService";
import { publishArticleToWordPressDraft } from "@/services/wordpressService";

type ClaimedRun = {
  id: string;
  keyword_id: string;
  article_id: string | null;
};

const workerId = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

async function claimNextRun(): Promise<ClaimedRun | null> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `
      SELECT
        id,
        keyword_id,
        article_id
      FROM production_runs
      WHERE status = 'queued'
          AND keyword_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `
    );

    const run = rows[0];

    if (!run) {
      await connection.commit();
      return null;
    }

    await connection.query(
      `
      UPDATE production_runs
      SET
        status = 'running',
        worker_id = ?,
        locked_at = NOW(),
        attempt_count = attempt_count + 1,
        started_at = COALESCE(started_at, NOW()),
        error_message = NULL
      WHERE id = ?
      `,
      [workerId, run.id]
    );

    await connection.commit();

    return run;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRun(
  runId: string,
  input: {
    status?: "running" | "completed" | "failed";
    currentStep?: string | null;
    progress?: number;
    articleId?: string;
    errorMessage?: string | null;
    finished?: boolean;
  }
) {
  await db.query(
    `
    UPDATE production_runs
    SET
      status = COALESCE(?, status),
      current_step = ?,
      progress_percent = COALESCE(?, progress_percent),
      article_id = COALESCE(?, article_id),
      error_message = ?,
      finished_at =
        CASE
          WHEN ? = TRUE THEN NOW()
          ELSE finished_at
        END
    WHERE id = ?
    `,
    [
      input.status ?? null,
      input.currentStep ?? null,
      input.progress ?? null,
      input.articleId ?? null,
      input.errorMessage ?? null,
      input.finished ?? false,
      runId,
    ]
  );
}

async function updateStep(
  runId: string,
  stepCode: string,
  status: "queued" | "running" | "completed" | "failed" | "skipped",
  errorMessage: string | null = null
) {
  await db.query(
    `
    UPDATE production_run_steps
    SET
      status = ?,
      started_at =
        CASE
          WHEN ? = 'running' THEN COALESCE(started_at, NOW())
          ELSE started_at
        END,
      finished_at =
        CASE
          WHEN ? IN ('completed', 'failed', 'skipped') THEN NOW()
          ELSE finished_at
        END,
      error_message = ?
    WHERE production_run_id = ?
      AND step_code = ?
    `,
    [
      status,
      status,
      status,
      errorMessage,
      runId,
      stepCode,
    ]
  );
}

async function failRunningStep(runId: string, message: string) {
  await db.query(
    `
    UPDATE production_run_steps
    SET
      status = 'failed',
      error_message = ?,
      finished_at = NOW()
    WHERE production_run_id = ?
      AND status = 'running'
    `,
    [message, runId]
  );
}

async function processRun(run: ClaimedRun) {
  if (!run.keyword_id) {
    throw new Error("Queued production run has no keyword_id.");
  }

  try {
    // Step 1: Outline and article creation
    await updateRun(run.id, {
      status: "running",
      currentStep: "outline",
      progress: 10,
    });

    await updateStep(run.id, "outline", "running");

    const articleId = await generateArticlePlan(run.keyword_id);

    await updateStep(run.id, "outline", "completed");

    await updateRun(run.id, {
      currentStep: "draft",
      progress: 40,
      articleId,
    });

    // Step 2: Draft generation
    await updateStep(run.id, "draft", "running");

    await generateArticleDraft(articleId);

    await updateStep(run.id, "draft", "completed");

    await updateRun(run.id, {
      currentStep: "wordpress_draft",
      progress: 75,
      articleId,
    });

    // Step 3: WordPress draft creation
    await updateStep(run.id, "wordpress_draft", "running");

    await publishArticleToWordPressDraft(articleId);

    await updateStep(run.id, "wordpress_draft", "completed");

    await updateRun(run.id, {
      status: "completed",
      currentStep: null,
      progress: 100,
      articleId,
      errorMessage: null,
      finished: true,
    });

    console.log(
      `[production-worker] Completed run ${run.id}; article ${articleId}`
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Production processing failed.";

    await failRunningStep(run.id, message);

    await updateRun(run.id, {
      status: "failed",
      errorMessage: message,
      finished: true,
    });

    console.error(
      `[production-worker] Failed run ${run.id}: ${message}`
    );
  }
}

export async function processNextQueuedRun() {
  const run = await claimNextRun();

  if (!run) {
    return false;
  }

  console.log(
    `[production-worker] Claimed run ${run.id} using ${workerId}`
  );

  await processRun(run);

  return true;
}