import { NextResponse } from "next/server";
import { parseImportStatus } from "@/modules/keyword-packs/apiValidation";
import { importApprovedKeywordPack } from "@/modules/keyword-packs/importService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const keywordStatus = parseImportStatus(body.keywordStatus);
    const result = await importApprovedKeywordPack({
      keywordPackId: id,
      keywordStatus,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Unable to import keyword pack.");
  }
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json(
    {
      error: message,
    },
    {
      status:
        message.includes("not found")
          ? 404
          : message.includes("Only") || message.includes("must be")
            ? 400
            : 500,
    }
  );
}
