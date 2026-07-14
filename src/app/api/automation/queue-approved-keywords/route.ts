import { NextResponse } from "next/server";
import { assertAutomationRequest } from "@/modules/automation/auth";
import { getApprovedKeywordIdsForAutomation } from "@/modules/automation/repository";
import { enqueueBulkKeywordProduction } from "@/modules/workflow/services/KeywordProductionQueueService";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

export async function POST(request: Request) {
  try {
    assertAutomationRequest(request);

    const body = await request.json();
    const siteId =
      typeof body.siteId === "string" ? body.siteId.trim() : "";

    if (!siteId) {
      return NextResponse.json(
        {
          error: "siteId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const limit = normalizeLimit(body.limit);
    const keywordIds = await getApprovedKeywordIdsForAutomation({
      siteId,
      limit,
    });

    if (keywordIds.length === 0) {
      return NextResponse.json({
        success: true,
        requested: 0,
        queued: 0,
        failed: 0,
        runs: [],
        errors: [],
      });
    }

    const result = await enqueueBulkKeywordProduction(keywordIds);

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
        : "Unable to queue approved keywords.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: message.includes("Unauthorized") ? 401 : 500,
      }
    );
  }
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}
