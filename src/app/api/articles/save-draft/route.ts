import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json({ error: "articleId is required." }, { status: 400 });
    }

    if (typeof body.markdown !== "string") {
      return NextResponse.json({ error: "markdown is required." }, { status: 400 });
    }

    await db.query(
      `
      UPDATE articles
      SET draft_markdown = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [body.markdown, body.articleId]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save draft." },
      { status: 500 }
    );
  }
}