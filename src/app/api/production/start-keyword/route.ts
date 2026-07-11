import { NextResponse } from "next/server";
import { enqueueKeywordProduction } from "@/modules/workflow/services/KeywordProductionQueueService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.keywordId) {
      return NextResponse.json(
        { error: "keywordId is required." },
        { status: 400 }
      );
    }

    const result = await enqueueKeywordProduction(
      body.keywordId
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 202 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to queue keyword production.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}