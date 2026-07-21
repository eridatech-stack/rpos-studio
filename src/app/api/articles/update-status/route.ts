import { articles_status } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const articleStatuses = new Set<string>(
  Object.values(articles_status)
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { error: "articleId is required." },
        { status: 400 }
      );
    }

    if (
      typeof body.status !== "string" ||
      !articleStatuses.has(body.status)
    ) {
      return NextResponse.json(
        { error: "Invalid article status." },
        { status: 400 }
      );
    }

    const article = await prisma.articles.update({
      where: {
        id: body.articleId,
      },
      data: {
        status: body.status as articles_status,
        updated_at: new Date(),
      },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update article status.",
      },
      { status: 500 }
    );
  }
}
