import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function bumpVersion(version: string | null) {
  const current = version || "1.0";
  const parts = current.split(".");
  const major = Number(parts[0] || 1);
  const minor = Number(parts[1] || 0) + 1;

  return `${major}.${minor}`;
}

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

    const oldPrompt = rows[0];

    if (!oldPrompt) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    await db.query(
      `
      UPDATE prompt_versions
      SET active = FALSE
      WHERE site_id = ?
        AND prompt_key = ?
      `,
      [oldPrompt.site_id, oldPrompt.prompt_key]
    );

    await db.query(
      `
      INSERT INTO prompt_versions (
        site_id,
        prompt_key,
        name,
        prompt_text,
        model,
        temperature,
        output_format,
        version,
        active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        oldPrompt.site_id,
        oldPrompt.prompt_key,
        oldPrompt.name,
        body.promptText,
        body.model,
        body.temperature,
        body.outputFormat,
        bumpVersion(oldPrompt.version),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update prompt." },
      { status: 500 }
    );
  }
}