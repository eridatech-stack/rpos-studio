import { NextResponse } from "next/server";
import { createProductionRun } from "@/modules/workflow/services/ProductionRunService";
import { runProductionWorkflow } from "@/modules/workflow/services/ProductionWorkflowRunner";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { error: "articleId is required." },
        { status: 400 }
      );
    }

    const runId = await createProductionRun(body.articleId);

    await runProductionWorkflow(runId);

    return NextResponse.json({
      success: true,
      productionRunId: runId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to start production.",
      },
      {
        status: 500,
      }
    );
  }
}