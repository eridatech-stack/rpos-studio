import { NextResponse } from "next/server";
import { parseReviewStatus } from "@/modules/keyword-packs/apiValidation";
import {
  addKeywordPackEvent,
  reviewKeywordPackItems,
} from "@/modules/keyword-packs/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const reviewStatus = parseReviewStatus(body.reviewStatus);
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((itemId: unknown) => typeof itemId === "string")
      : undefined;

    if (!["approved", "rejected", "pending"].includes(reviewStatus)) {
      return NextResponse.json(
        {
          error: "reviewStatus must be approved, rejected, or pending.",
        },
        {
          status: 400,
        }
      );
    }

    const updated = await reviewKeywordPackItems(id, {
      itemIds,
      reviewStatus,
    });

    await addKeywordPackEvent({
      keywordPackId: id,
      eventType: "items_reviewed",
      status: reviewStatus,
      message: `${updated} keyword pack item(s) marked ${reviewStatus}.`,
      details: {
        itemIds: itemIds || "all",
        reviewStatus,
      },
    });

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to review keyword pack items.");
  }
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: message,
    },
    {
      status:
        message.includes("invalid") ||
        message.includes("must be")
          ? 400
          : 500,
    }
  );
}
