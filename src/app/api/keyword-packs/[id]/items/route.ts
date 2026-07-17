import { NextResponse } from "next/server";
import { parseReviewStatus } from "@/modules/keyword-packs/apiValidation";
import { getKeywordPackItemsPage } from "@/modules/keyword-packs/repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const page = positiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      positiveInt(url.searchParams.get("pageSize"), 50),
      100
    );
    const reviewStatusValue = url.searchParams.get("reviewStatus");
    const reviewStatus = reviewStatusValue
      ? parseReviewStatus(reviewStatusValue)
      : undefined;
    const query = url.searchParams.get("q")?.trim() || undefined;
    const offset = (page - 1) * pageSize;

    const result = await getKeywordPackItemsPage({
      keywordPackId: id,
      query,
      reviewStatus,
      limit: pageSize,
      offset,
    });

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      ...result,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to load keyword pack items.");
  }
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallback;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: message.includes("invalid") ? 400 : 500,
    }
  );
}
