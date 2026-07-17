import { NextResponse } from "next/server";
import { parseItemPatch } from "@/modules/keyword-packs/apiValidation";
import {
  addKeywordPackEvent,
  updateKeywordPackItem,
} from "@/modules/keyword-packs/repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await context.params;
    const body = await request.json();
    const patch = parseItemPatch(body);

    await updateKeywordPackItem(id, itemId, {
      ...patch,
      reviewStatus: patch.reviewStatus || "edited",
    });

    await addKeywordPackEvent({
      keywordPackId: id,
      eventType: "item_edited",
      status: "edited",
      message: "Keyword pack item edited.",
      details: {
        itemId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to update keyword pack item.");
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
        message.includes("not found")
          ? 404
          : message.includes("invalid") ||
              message.includes("required") ||
              message.includes("Expected")
            ? 400
            : 500,
    }
  );
}
