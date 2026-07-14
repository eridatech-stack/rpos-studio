import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { generateArticlePlan } from "@/services/articlePlanningService";
import { generateArticleDraft } from "@/services/articleDraftService";
import {
  generateAndUploadFeaturedImage,
  getUploadedFeaturedImageMediaId,
} from "@/services/featuredImageService";
import { publishArticleToWordPressDraft } from "@/services/wordpressService";
import { addProductionEvent } from "@/modules/production/eventRepository";

type ClaimedRun = {
  id: string;
  keyword_id: string;
  article_id: string | null;
};

type ProductionRunStatus =
  | "running"
  | "completed"
  | "failed";

type ProductionStepStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

type ProductionStepSnapshot = {
  step_code: string;
  status: ProductionStepStatus;
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
    status?: ProductionRunStatus;
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
  status: ProductionStepStatus,
  errorMessage: string | null = null
) {
  await db.query(
    `
    UPDATE production_run_steps
    SET
      status = ?,
      started_at =
        CASE
          WHEN ? = 'running'
            THEN COALESCE(started_at, NOW())
          ELSE started_at
        END,
      finished_at =
        CASE
          WHEN ? IN ('completed', 'failed', 'skipped')
            THEN NOW()
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

async function getRunStepStatuses(
  runId: string
): Promise<Map<string, ProductionStepStatus>> {
  const [rows]: any = await db.query(
    `
    SELECT step_code, status
    FROM production_run_steps
    WHERE production_run_id = ?
    `,
    [runId]
  );

  return new Map(
    rows.map((step: ProductionStepSnapshot) => [
      step.step_code,
      step.status,
    ])
  );
}

async function getRunStepStatusesWithBackfill(
  runId: string
): Promise<Map<string, ProductionStepStatus>> {
  const stepStatuses = await getRunStepStatuses(runId);

  if (
    stepStatuses.has("featured_image") ||
    stepStatuses.get("wordpress_draft") === "completed"
  ) {
    return stepStatuses;
  }

  await db.query(
    `
    INSERT INTO production_run_steps (
      id,
      production_run_id,
      step_code,
      step_name,
      status,
      step_order,
      created_at
    )
    VALUES (?, ?, 'featured_image', 'Generate Featured Image', 'queued', 30, NOW())
    `,
    [randomUUID(), runId]
  );

  await db.query(
    `
    UPDATE production_run_steps
    SET step_order = 40
    WHERE production_run_id = ?
      AND step_code = 'wordpress_draft'
      AND step_order < 40
    `,
    [runId]
  );

  await addProductionEvent({
    productionRunId: runId,
    stepCode: "featured_image",
    eventType: "step_backfilled",
    status: "queued",
    message:
      "Featured image step added to an existing production run.",
  });

  return getRunStepStatuses(runId);
}

async function failRunningStep(
  runId: string,
  message: string
) {
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
    throw new Error(
      "Queued production run has no keyword_id."
    );
  }

  try {
    const stepStatuses =
      await getRunStepStatusesWithBackfill(run.id);
    const hasStep = (stepCode: string) =>
      stepStatuses.has(stepCode);
    const isStepCompleted = (stepCode: string) =>
      stepStatuses.get(stepCode) === "completed";

    let articleId = run.article_id;

    /*
     * Step 1: Generate outline and create article.
     */
    if (!isStepCompleted("outline")) {
      await updateRun(run.id, {
        status: "running",
        currentStep: "outline",
        progress: 10,
      });

      await updateStep(
        run.id,
        "outline",
        "running"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "outline",
        eventType: "step_started",
        status: "running",
        message: "Outline generation started.",
        details: {
          keywordId: run.keyword_id,
        },
      });

      articleId =
        await generateArticlePlan(
          run.keyword_id
        );

      await updateStep(
        run.id,
        "outline",
        "completed"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "outline",
        eventType: "step_completed",
        status: "completed",
        message:
          "Outline and article plan generated successfully.",
        details: {
          keywordId: run.keyword_id,
          articleId,
        },
      });
    } else if (!articleId) {
      throw new Error(
        "Cannot resume production run: outline is completed but article_id is missing."
      );
    }

    /*
     * Step 2: Generate full article draft.
     */
    if (!articleId) {
      throw new Error(
        "Cannot generate draft because article_id is missing."
      );
    }

    if (!isStepCompleted("draft")) {
      await updateRun(run.id, {
        currentStep: "draft",
        progress: 40,
        articleId,
      });

      await updateStep(
        run.id,
        "draft",
        "running"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "draft",
        eventType: "step_started",
        status: "running",
        message:
          "Article draft generation started.",
        details: {
          articleId,
        },
      });

      await generateArticleDraft(articleId);

      await updateStep(
        run.id,
        "draft",
        "completed"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "draft",
        eventType: "step_completed",
        status: "completed",
        message:
          "Article draft generated successfully.",
        details: {
          articleId,
        },
      });
    }

    /*
     * Step 3: Generate and upload featured image.
     */
    let featuredMediaId: number | null = null;

    if (
      hasStep("featured_image") &&
      !isStepCompleted("featured_image")
    ) {
      await updateRun(run.id, {
        currentStep: "featured_image",
        progress: 65,
        articleId,
      });

      await updateStep(
        run.id,
        "featured_image",
        "running"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "featured_image",
        eventType: "step_started",
        status: "running",
        message:
          "Featured image generation and upload started.",
        details: {
          articleId,
        },
      });

      const featuredImage =
        await generateAndUploadFeaturedImage(
          articleId
        );

      featuredMediaId =
        featuredImage.wordpressMediaId;

      await updateStep(
        run.id,
        "featured_image",
        "completed"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "featured_image",
        eventType: "step_completed",
        status: "completed",
        message:
          "Featured image generated and uploaded successfully.",
        details: {
          articleId,
          imageId: featuredImage.imageId,
          fileUrl: featuredImage.fileUrl,
          wordpressMediaId:
            featuredImage.wordpressMediaId,
          altText: featuredImage.altText,
        },
      });
    } else if (isStepCompleted("featured_image")) {
      featuredMediaId =
        await getUploadedFeaturedImageMediaId(articleId);
    }

    /*
     * Step 4: Create WordPress draft.
     */
    let wordpressResult: {
      wordpressPostId: number;
      wordpressDraftUrl: string;
    } | null = null;

    if (!isStepCompleted("wordpress_draft")) {
      await updateRun(run.id, {
        currentStep: "wordpress_draft",
        progress: 75,
        articleId,
      });

      await updateStep(
        run.id,
        "wordpress_draft",
        "running"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "wordpress_draft",
        eventType: "step_started",
        status: "running",
        message:
          "WordPress draft creation started.",
        details: {
          articleId,
        },
      });

      wordpressResult =
        await publishArticleToWordPressDraft(
          articleId,
          {
            featuredMediaId,
          }
        );

      await updateStep(
        run.id,
        "wordpress_draft",
        "completed"
      );

      await addProductionEvent({
        productionRunId: run.id,
        stepCode: "wordpress_draft",
        eventType: "step_completed",
        status: "completed",
        message:
          "WordPress draft created successfully.",
        details: {
          articleId,
          wordpressPostId:
            wordpressResult.wordpressPostId,
          wordpressDraftUrl:
            wordpressResult.wordpressDraftUrl,
          featuredMediaId,
        },
      });
    }

    /*
     * Complete the full production run.
     */
    await updateRun(run.id, {
      status: "completed",
      currentStep: null,
      progress: 100,
      articleId,
      errorMessage: null,
      finished: true,
    });

    await addProductionEvent({
      productionRunId: run.id,
      eventType: "run_completed",
      status: "completed",
      message:
        "Production workflow completed successfully.",
      details: {
        articleId,
        wordpressPostId:
          wordpressResult?.wordpressPostId,
        wordpressDraftUrl:
          wordpressResult?.wordpressDraftUrl,
      },
    });

    console.log(
      `[production-worker] Completed run ${run.id}; article ${articleId}`
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Production processing failed.";

    await failRunningStep(
      run.id,
      message
    );

    await updateRun(run.id, {
      status: "failed",
      errorMessage: message,
      finished: true,
    });

    await addProductionEvent({
      productionRunId: run.id,
      eventType: "run_failed",
      status: "failed",
      message,
      details: {
        keywordId: run.keyword_id,
        articleId: run.article_id,
        workerId,
      },
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

  await addProductionEvent({
    productionRunId: run.id,
    eventType: "worker_claimed",
    status: "running",
    message:
      "Production worker claimed the run.",
    details: {
      workerId,
      keywordId: run.keyword_id,
    },
  });

  await processRun(run);

  return true;
}
