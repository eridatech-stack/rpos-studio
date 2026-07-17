import { NextResponse } from "next/server";
import { assertAutomationRequest } from "@/modules/automation/auth";
import { importKeywordOpportunities } from "@/modules/automation/keywordOpportunityImport";

export async function POST(request: Request) {
  try {
    assertAutomationRequest(request);

    const body = await request.json();
    const siteId =
      typeof body.siteId === "string" ? body.siteId.trim() : "";

    const result = await importKeywordOpportunities({
      siteId,
      opportunities: body.opportunities,
      defaultStatus: body.defaultStatus,
      updateExistingStatus: body.updateExistingStatus === true,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: buildMessage(result),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to import keyword opportunities.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: getErrorStatus(message),
      }
    );
  }
}

function buildMessage(result: {
  inserted: number;
  updated: number;
  skipped: number;
}) {
  return `Imported ${result.inserted} new keyword(s), refreshed ${result.updated}, skipped ${result.skipped}.`;
}

function getErrorStatus(message: string) {
  if (message.includes("Unauthorized")) {
    return 401;
  }

  if (
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("maximum") ||
    message.includes("not found")
  ) {
    return 400;
  }

  return 500;
}
