import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const [rows]: any = await db.query(
      `
      SELECT *
      FROM prompt_versions
      WHERE id = ?
      LIMIT 1
      `,
      [body.id]
    );

    const prompt = rows[0];

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    await db.query(
      `
      UPDATE prompt_versions
      SET active = FALSE
      WHERE site_id = ?
        AND prompt_key = ?
      `,
      [prompt.site_id, prompt.prompt_key]
    );

    await db.query(
      `
      UPDATE prompt_versions
      SET active = TRUE
      WHERE id = ?
      `,
      [prompt.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to activate prompt." },
      { status: 500 }
    );
  }
}