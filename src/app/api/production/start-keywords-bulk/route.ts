import { NextResponse } from "next/server";
import { enqueueBulkKeywordProduction } from "@/modules/workflow/services/KeywordProductionQueueService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.keywordIds)) {
      return NextResponse.json(
        {
          error: "keywordIds must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await enqueueBulkKeywordProduction(
        body.keywordIds
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
        : "Unable to queue selected keywords.";

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