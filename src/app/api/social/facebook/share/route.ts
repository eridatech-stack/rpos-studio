import { NextResponse } from "next/server";
import { enqueueFacebookPostForPublishedArticle } from "@/modules/social/facebookService";

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

    await enqueueFacebookPostForPublishedArticle(body.articleId);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to prepare Facebook post.";

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
