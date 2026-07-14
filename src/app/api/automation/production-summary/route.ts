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
