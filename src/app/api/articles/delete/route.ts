import { NextResponse } from "next/server";
import { deleteNonPublishedArticleAndRestoreKeyword } from "@/repositories/articleRepository";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.articleId !== "string" ||
      !body.articleId.trim()
    ) {
      return NextResponse.json(
        {
          error: "articleId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const deletedArticle =
      await deleteNonPublishedArticleAndRestoreKeyword(body.articleId);

    return NextResponse.json({
      success: true,
      deletedArticle,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete the article.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 409,
      }
    );
  }
}
