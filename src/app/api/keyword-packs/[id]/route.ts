import { NextResponse } from "next/server";
import { parseKeywordPackPatch } from "@/modules/keyword-packs/apiValidation";
import {
  getKeywordPackById,
  getKeywordPackCategories,
  getKeywordPackClusters,
  getKeywordPackEvents,
  updateKeywordPackDraft,
} from "@/modules/keyword-packs/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const pack = await getKeywordPackById(id);

    if (!pack) {
      return NextResponse.json(
        {
          error: "Keyword pack not found.",
        },
        {
          status: 404,
        }
      );
    }

    const [categories, clusters, events] = await Promise.all([
      getKeywordPackCategories(id),
      getKeywordPackClusters(id),
      getKeywordPackEvents(id),
    ]);

    return NextResponse.json({
      success: true,
      pack,
      categories,
      clusters,
      events,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to load keyword pack.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const patch = parseKeywordPackPatch(body);

    await updateKeywordPackDraft(id, patch);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to update keyword pack.");
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
          : message.includes("required") ||
              message.includes("invalid") ||
              message.includes("must be")
            ? 400
            : 500,
    }
  );
}
