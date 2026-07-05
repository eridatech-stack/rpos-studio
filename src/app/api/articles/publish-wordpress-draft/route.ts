import { NextResponse } from "next/server";
import { publishArticleToWordPressDraft } from "@/services/wordpressService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json({ error: "articleId is required." }, { status: 400 });
    }

    const result = await publishArticleToWordPressDraft(body.articleId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "WordPress draft creation failed." },
      { status: 500 }
    );
  }
}