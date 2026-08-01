import { NextResponse } from "next/server";
import { generateArticleDraft } from "@/services/articleDraftService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json({ error: "articleId is required." }, { status: 400 });
    }

    const articleId = await generateArticleDraft(body.articleId, {
      regenerate: body.regenerate === true,
      aiProvider: normalizeProvider(body.aiProvider),
      aiModel: normalizeModel(body.aiModel),
    });

    return NextResponse.json({
      success: true,
      articleId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Draft generation failed." },
      { status: 500 }
    );
  }
}

function normalizeProvider(
  value: unknown
): "openai" | "anthropic" | undefined {
  const provider = String(value || "")
    .trim()
    .toLowerCase();

  if (provider === "anthropic" || provider === "claude") {
    return "anthropic";
  }

  if (provider === "openai") {
    return "openai";
  }

  return undefined;
}

function normalizeModel(value: unknown) {
  const model = String(value || "").trim();

  return model || undefined;
}
