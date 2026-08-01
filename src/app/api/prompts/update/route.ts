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

    const oldPrompt = rows[0];

    if (!oldPrompt) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    const nextVersion = await getNextPromptVersion({
      siteId: oldPrompt.site_id,
      promptKey: oldPrompt.prompt_key,
    });
    const promptName = normalizePromptName(
      body.name,
      oldPrompt.name
    );

    await db.query(
      `
      UPDATE prompt_versions
      SET active = FALSE
      WHERE site_id <=> ?
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
        provider,
        model,
        temperature,
        output_format,
        version,
        active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        oldPrompt.site_id,
        oldPrompt.prompt_key,
        promptName,
        body.promptText,
        normalizeProvider(body.provider),
        body.model,
        body.temperature,
        body.outputFormat,
        nextVersion,
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

async function getNextPromptVersion(input: {
  siteId: string | null;
  promptKey: string;
}) {
  const [rows]: any = await db.query(
    `
    SELECT version
    FROM prompt_versions
    WHERE site_id <=> ?
      AND prompt_key = ?
    `,
    [input.siteId, input.promptKey]
  );
  const versions = rows
    .map((row: any) => parseVersion(row.version))
    .filter((version: any) => version !== null)
    .sort((a: any, b: any) => {
      if (a.major !== b.major) {
        return b.major - a.major;
      }

      return b.minor - a.minor;
    });
  const latest = versions[0] || { major: 1, minor: 0 };

  return `${latest.major}.${latest.minor + 1}`;
}

function parseVersion(version: unknown) {
  const match = String(version || "").match(/^(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
  };
}

function normalizeProvider(value: unknown) {
  const provider = String(value || "")
    .trim()
    .toLowerCase();

  return provider === "anthropic" || provider === "claude"
    ? "anthropic"
    : "openai";
}

function normalizePromptName(value: unknown, fallback: string) {
  const name = String(value || "").trim();

  return name || fallback;
}
