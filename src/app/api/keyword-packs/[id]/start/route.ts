import { NextResponse } from "next/server";
import { queueKeywordPack } from "@/modules/keyword-packs/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await queueKeywordPack(id);

    return NextResponse.json(
      {
        success: true,
        status: "queued",
      },
      {
        status: 202,
      }
    );
  } catch (error: unknown) {
    return errorResponse(error, "Unable to start keyword pack.");
  }
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: message.includes("not found") ? 404 : 500,
    }
  );
}
