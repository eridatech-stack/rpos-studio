import { NextResponse } from "next/server";
import { cancelKeywordPack } from "@/modules/keyword-packs/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await cancelKeywordPack(id);

    return NextResponse.json({
      success: true,
      status: "cancelled",
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to cancel keyword pack.");
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
