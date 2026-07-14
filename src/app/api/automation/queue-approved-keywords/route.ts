import { NextResponse } from "next/server";
import { assertAutomationRequest } from "@/modules/automation/auth";
import {
  getApprovedKeywordIdsForAutomation,
  getAutomationQueueStats,
} from "@/modules/automation/repository";
import { enqueueBulkKeywordProduction } from "@/modules/workflow/services/KeywordProductionQueueService";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;
const DEFAULT_MAX_ACTIVE_RUNS = 10;
const DEFAULT_DAILY_QUEUE_LIMIT = 25;

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

    const requestedLimit = normalizeLimit(body.limit);
    const maxActiveRuns = getPositiveEnvInt(
      "AUTOMATION_MAX_ACTIVE_RUNS",
      DEFAULT_MAX_ACTIVE_RUNS
    );
    const dailyQueueLimit = getPositiveEnvInt(
      "AUTOMATION_DAILY_QUEUE_LIMIT",
      DEFAULT_DAILY_QUEUE_LIMIT
    );
    const queueStats = await getAutomationQueueStats(siteId);
    const activeCapacity = Math.max(
      0,
      maxActiveRuns - queueStats.active
    );
    const dailyCapacity = Math.max(
      0,
      dailyQueueLimit - queueStats.queuedToday
    );
    const allowedLimit = Math.min(
      requestedLimit,
      activeCapacity,
      dailyCapacity
    );

    const limits = {
      requestedLimit,
      allowedLimit,
      maxRequestLimit: MAX_LIMIT,
      maxActiveRuns,
      dailyQueueLimit,
      activeRuns: queueStats.active,
      queued: queueStats.queued,
      running: queueStats.running,
      queuedToday: queueStats.queuedToday,
      activeCapacity,
      dailyCapacity,
    };

    if (allowedLimit === 0) {
      return NextResponse.json({
        success: true,
        requested: 0,
        queued: 0,
        failed: 0,
        runs: [],
        errors: [],
        limits,
        message:
          "Automation queue limits are already reached for this site.",
      });
    }

    const keywordIds = await getApprovedKeywordIdsForAutomation({
      siteId,
      limit: allowedLimit,
    });

    if (keywordIds.length === 0) {
      return NextResponse.json({
        success: true,
        requested: 0,
        queued: 0,
        failed: 0,
        runs: [],
        errors: [],
        limits,
        message:
          "No approved keywords are currently available for automation queueing.",
      });
    }

    const result = await enqueueBulkKeywordProduction(keywordIds);

    return NextResponse.json(
      {
        success: true,
        ...result,
        limits,
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

function getPositiveEnvInt(name: string, fallback: number) {
  const parsed = Number(process.env[name]);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}
