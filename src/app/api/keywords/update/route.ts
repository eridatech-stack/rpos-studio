import { NextResponse } from "next/server";

import type {
  keywords_article_type,
  keywords_intent,
  keywords_priority,
  keywords_status,
} from "@prisma/client";

import { updateKeyword } from "@/repositories/keywordRepository";

function nullableNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.keywordId !== "string" ||
      !body.keywordId.trim()
    ) {
      return NextResponse.json(
        {
          error: "keywordId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.keyword !== "string" ||
      !body.keyword.trim()
    ) {
      return NextResponse.json(
        {
          error: "Keyword text is required.",
        },
        {
          status: 400,
        }
      );
    }

    const updatedKeyword = await updateKeyword(body.keywordId, {
      keyword: body.keyword.trim().toLowerCase(),

      categoryId:
        typeof body.categoryId === "string" && body.categoryId
          ? body.categoryId
          : null,

      clusterId:
        typeof body.clusterId === "string" && body.clusterId
          ? body.clusterId
          : null,

      intent:
        (body.intent || "informational") as keywords_intent,

      articleType:
        (body.articleType || "cluster") as keywords_article_type,

      priority:
        (body.priority || "medium") as keywords_priority,

      opportunityScore: nullableNumber(body.opportunityScore),

      searchVolume: nullableNumber(body.searchVolume),

      difficulty: nullableNumber(body.difficulty),

      status:
        (body.status || "needs_review") as keywords_status,

      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
    });

    return NextResponse.json({
      success: true,
      keyword: updatedKeyword,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update the keyword.";

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