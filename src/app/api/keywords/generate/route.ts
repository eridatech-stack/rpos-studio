import { NextResponse } from "next/server";
import { generateArticlePlan } from "@/services/articlePlanningService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.keywordId) {
      return NextResponse.json({ error: "keywordId is required." }, { status: 400 });
    }

    const articleId = await generateArticlePlan(body.keywordId);

    return NextResponse.json({
      success: true,
      articleId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Generation failed." },
      { status: 500 }
    );
  }
}
