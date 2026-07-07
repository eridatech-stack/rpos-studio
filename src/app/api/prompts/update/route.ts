import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    await db.query(
      `
      UPDATE prompt_versions
      SET prompt_text = ?,
          model = ?,
          temperature = ?,
          output_format = ?
      WHERE id = ?
      `,
      [
        body.promptText,
        body.model,
        body.temperature,
        body.outputFormat,
        body.id,
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