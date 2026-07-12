import { NextResponse } from "next/server";
import { approveArticleForPublishing } from "@/modules/editorial/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { error: "articleId is required." },
        { status: 400 }
      );
    }

    await approveArticleForPublishing(body.articleId);

    return NextResponse.json({
      success: true,
      articleId: body.articleId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to approve article.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}