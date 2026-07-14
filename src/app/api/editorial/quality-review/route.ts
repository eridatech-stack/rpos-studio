import { NextResponse } from "next/server";
import { saveArticleQualityReview } from "@/modules/editorial/repository";
import type { QualityReviewChecks } from "@/modules/editorial/qualityReview";

const checkKeys: Array<keyof QualityReviewChecks> = [
  "draftReviewed",
  "factualAccuracy",
  "seoMetadata",
  "linksReviewed",
  "imageReviewed",
  "wordpressPreview",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        {
          error: "articleId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const checks = normalizeChecks(body.checks);
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : "";

    await saveArticleQualityReview(body.articleId, {
      checks,
      notes,
    });

    return NextResponse.json({
      success: true,
      articleId: body.articleId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save quality review.";

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

function normalizeChecks(value: unknown): QualityReviewChecks {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return checkKeys.reduce((checks, key) => {
    checks[key] = source[key] === true;
    return checks;
  }, {} as QualityReviewChecks);
}
