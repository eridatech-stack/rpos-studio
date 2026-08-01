import { NextResponse } from "next/server";
import { retryFailedProductionRun } from "@/modules/production/retryProductionRunService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.productionRunId) {
      return NextResponse.json(
        {
          error: "productionRunId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await retryFailedProductionRun(
      body.productionRunId,
      {
        aiProvider: normalizeProvider(body.aiProvider),
        aiModel: normalizeModel(body.aiModel),
      }
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 202,
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retry production run.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}

function normalizeProvider(
  value: unknown
): "openai" | "anthropic" | undefined {
  const provider = String(value || "")
    .trim()
    .toLowerCase();

  if (provider === "anthropic" || provider === "claude") {
    return "anthropic";
  }

  if (provider === "openai") {
    return "openai";
  }

  return undefined;
}

function normalizeModel(value: unknown) {
  const model = String(value || "").trim();

  return model || undefined;
}
