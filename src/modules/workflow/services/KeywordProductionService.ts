import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { generateArticlePlan } from "@/services/articlePlanningService";
import { generateArticleDraft } from "@/services/articleDraftService";
import { publishArticleToWordPressDraft } from "@/services/wordpressService";

type ProductionStepStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

async function createRun(keywordId: string) {
  const [rows]: any = await db.query(
    `
    SELECT site_id
    FROM keywords
    WHERE id = ?
    LIMIT 1
    `,
    [keywordId]
  );

  if (!rows.length) {
    throw new Error("Keyword not found.");
  }

  const runId = randomUUID();

  await db.query(
    `
    INSERT INTO production_runs (
      id,
      site_id,
      keyword_id,
      status,
      progress_percent,
      started_at
    )
    VALUES (?, ?, ?, 'running', 0, NOW())
    `,
    [runId, rows[0].site_id, keywordId]
  );

  const steps = [
    {
      code: "outline",
      name: "Generate Outline",
      order: 10,
    },
    {
      code: "draft",
      name: "Generate Draft",
      order: 20,
    },
    {
      code: "wordpress_draft",
      name: "Create WordPress Draft",
      order: 30,
    },
  ];

  for (const step of steps) {
    await db.query(
      `
      INSERT INTO production_run_steps (
        id,
        production_run_id,
        step_code,
        step_name,
        status,
        step_order
      )
      VALUES (?, ?, ?, ?, 'queued', ?)
      `,
      [
        randomUUID(),
        runId,
        step.code,
        step.name,
        step.order,
      ]
    );
  }

  return runId;
}

async function updateRun(
  runId: string,
  input: {
    status?: string;
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
  errorMessage?: string
) {
  await db.query(
    `
    UPDATE production_run_steps
    SET
      status = ?,
      started_at =
        CASE
          WHEN ? = 'running' THEN NOW()
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
      errorMessage ?? null,
      runId,
      stepCode,
    ]
  );
}

export async function produceKeywordToWordPress(keywordId: string) {
  const runId = await createRun(keywordId);

  try {
    await updateRun(runId, {
      status: "running",
      currentStep: "outline",
      progress: 10,
    });

    await updateStep(runId, "outline", "running");

    const articleId = await generateArticlePlan(keywordId);

    await updateStep(runId, "outline", "completed");

    await updateRun(runId, {
      articleId,
      currentStep: "draft",
      progress: 40,
    });

    await updateStep(runId, "draft", "running");

    await generateArticleDraft(articleId);

    await updateStep(runId, "draft", "completed");

    await updateRun(runId, {
      currentStep: "wordpress_draft",
      progress: 75,
    });

    await updateStep(runId, "wordpress_draft", "running");

    await publishArticleToWordPressDraft(articleId);

    await updateStep(runId, "wordpress_draft", "completed");

    await updateRun(runId, {
      status: "completed",
      currentStep: null,
      progress: 100,
      articleId,
      errorMessage: null,
      finished: true,
    });

    return {
      runId,
      articleId,
    };
  } catch (error: any) {
    const message =
      error?.message || "Keyword production failed.";

    const [runningSteps]: any = await db.query(
      `
      SELECT step_code
      FROM production_run_steps
      WHERE production_run_id = ?
        AND status = 'running'
      `,
      [runId]
    );

    for (const step of runningSteps) {
      await updateStep(
        runId,
        step.step_code,
        "failed",
        message
      );
    }

    await updateRun(runId, {
      status: "failed",
      errorMessage: message,
      finished: true,
    });

    throw error;
  }
}