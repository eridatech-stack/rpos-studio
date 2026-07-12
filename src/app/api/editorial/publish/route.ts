import { NextResponse } from "next/server";
import { publishApprovedArticle } from "@/modules/editorial/publishArticleService";

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

    const result = await publishApprovedArticle(
      body.articleId
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to publish article.";

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