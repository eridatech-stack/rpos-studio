import { NextResponse } from "next/server";
import { assertAutomationRequest } from "@/modules/automation/auth";
import { getAutomationProductionSummary } from "@/modules/automation/repository";

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

    const summary = await getAutomationProductionSummary(siteId);

    return NextResponse.json({
      success: true,
      siteId,
      summary,
      notification: buildNotification(summary),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load production summary.";

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

function buildNotification(summary: any) {
  const siteName =
    summary.site?.name || summary.site?.domain || "Selected site";
  const failureCount = summary.production.failed;
  const reviewCount = summary.editorial.reviewRequired;
  const readyCount = summary.editorial.readyToPublish;

  const status =
    failureCount > 0
      ? "attention_required"
      : summary.production.running > 0 || summary.production.queued > 0
        ? "in_progress"
        : "stable";

  const lines = [
    `${siteName} production summary`,
    `Queued: ${summary.production.queued}`,
    `Running: ${summary.production.running}`,
    `Completed: ${summary.production.completed}`,
    `Failed: ${failureCount}`,
    `Needs review: ${reviewCount}`,
    `Ready to publish: ${readyCount}`,
  ];

  return {
    status,
    title:
      status === "attention_required"
        ? `${siteName}: production needs attention`
        : `${siteName}: production summary`,
    text: lines.join("\n"),
  };
}
