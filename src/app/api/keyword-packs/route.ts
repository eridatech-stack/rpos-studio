import { NextResponse } from "next/server";
import { parseKeywordPackInput } from "@/modules/keyword-packs/apiValidation";
import {
  createKeywordPackDraft,
  listKeywordPacks,
} from "@/modules/keyword-packs/repository";

export async function GET() {
  try {
    const packs = await listKeywordPacks();

    return NextResponse.json({
      success: true,
      packs,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to load keyword packs.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseKeywordPackInput(body);
    const keywordPackId = await createKeywordPackDraft(input);

    return NextResponse.json(
      {
        success: true,
        keywordPackId,
      },
      {
        status: 201,
      }
    );
  } catch (error: unknown) {
    return errorResponse(error, "Unable to create keyword pack.");
  }
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: getErrorStatus(message),
    }
  );
}

function getErrorStatus(message: string) {
  return message.includes("required") ||
    message.includes("invalid") ||
    message.includes("must be")
    ? 400
    : 500;
}
