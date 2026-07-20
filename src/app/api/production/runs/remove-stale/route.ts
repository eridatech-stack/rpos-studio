import { NextResponse } from "next/server";
import { removeStaleProductionRun } from "@/modules/production/staleProductionRunService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.productionRunId) {
      return NextResponse.json(
        { error: "productionRunId is required." },
        { status: 400 }
      );
    }

    const result = await removeStaleProductionRun(
      body.productionRunId
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove stale production run.",
      },
      { status: 500 }
    );
  }
}
