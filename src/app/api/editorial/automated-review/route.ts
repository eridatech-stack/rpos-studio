import { NextResponse } from "next/server";
import { runAutomatedArticleReview } from "@/modules/editorial/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { error: "articleId is required." },
        { status: 400 }
      );
    }

    const review = await runAutomatedArticleReview(body.articleId);

    return NextResponse.json({
      success: true,
      articleId: body.articleId,
      review,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to run automated review.";

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
